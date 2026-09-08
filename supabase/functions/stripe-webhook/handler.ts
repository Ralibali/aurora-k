import type Stripe from 'https://esm.sh/stripe@18.5.0';
import { currentSubscription, mapSubscriptionStatus, shouldApplyBillingEvent } from '../_shared/billing-state.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.57.2';
import { paymentFailedEmail, subscriptionCancelledEmail, welcomeEmail } from '../_shared/email-templates.ts';
import { safeTemplateData } from '../_shared/resend.ts';

export type AppSubscriptionStatus = 'active' | 'pending' | 'past_due' | 'cancelled' | 'paused';

type Company = {
  id: string;
  name: string;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_event_created: number;
  stripe_last_event_id: string | null;
};

type HandlerContext = {
  stripe: Stripe;
  supabase: SupabaseClient;
  supabaseUrl: string;
  serviceRoleKey: string;
  siteUrl: string;
};

export const mapStripeStatus = mapSubscriptionStatus;
const companyFields = 'id, name, subscription_status, stripe_customer_id, stripe_subscription_id, stripe_event_created, stripe_last_event_id';

async function getCompanyByCustomer(context: HandlerContext, customerId: string) {
  const { data, error } = await context.supabase
    .from('companies')
    .select(companyFields)
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (error) throw error;
  return data as Company | null;
}

async function updateCompany(context: HandlerContext, company: Company, event: Stripe.Event, updates: Record<string, unknown>) {
  let query = context.supabase.from('companies').update({ ...updates, stripe_event_created: event.created, stripe_last_event_id: event.id })
    .eq('id', company.id).eq('stripe_event_created', company.stripe_event_created);
  query = company.stripe_last_event_id ? query.eq('stripe_last_event_id', company.stripe_last_event_id) : query.is('stripe_last_event_id', null);
  query = company.stripe_customer_id ? query.eq('stripe_customer_id', company.stripe_customer_id) : query.is('stripe_customer_id', null);
  const { data, error } = await query.select('id').maybeSingle();
  if (error) throw error;
  // A concurrent webhook won. Stripe must retry so we reconcile fresh state.
  if (!data) throw new Error('Concurrent billing update; retry required');
}

async function getAdmin(context: HandlerContext, companyId: string) {
  const { data, error } = await context.supabase
    .from('profiles')
    .select('email, full_name')
    .eq('company_id', companyId)
    .eq('role', 'admin')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function sendEmail(context: HandlerContext, to: string, template: { subject: string; html: string }) {
  try {
    const response = await fetch(`${context.supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${context.serviceRoleKey}`,
      },
      body: JSON.stringify({ to, subject: template.subject, html: template.html }),
    });
    if (!response.ok) console.error('[stripe-webhook] Email failed', await response.text());
  } catch (error) {
    console.error('[stripe-webhook] Email delivery error', error);
  }
}

async function notifyActive(context: HandlerContext, company: Company) {
  if (company.subscription_status === 'active') return;
  try {
    const admin = await getAdmin(context, company.id);
    if (!admin?.email) return;
    await sendEmail(context, admin.email, welcomeEmail(safeTemplateData({
      firstName: admin.full_name?.split(' ')[0] || 'där',
      companyName: company.name || 'Ditt företag',
      dashboardUrl: `${context.siteUrl}/admin`,
    })));
  } catch (error) {
    console.error('[stripe-webhook] Welcome notification failed', error);
  }
}

async function notifyPaymentFailed(context: HandlerContext, company: Company) {
  if (company.subscription_status === 'past_due') return;
  try {
    const admin = await getAdmin(context, company.id);
    if (!admin?.email) return;
    await sendEmail(context, admin.email, paymentFailedEmail(safeTemplateData({
      firstName: admin.full_name?.split(' ')[0] || 'där',
      portalUrl: `${context.siteUrl}/admin/settings`,
    })));
  } catch (error) {
    console.error('[stripe-webhook] Payment notification failed', error);
  }
}

async function notifyCancelled(context: HandlerContext, company: Company) {
  if (company.subscription_status === 'cancelled') return;
  try {
    const admin = await getAdmin(context, company.id);
    if (!admin?.email) return;
    await sendEmail(context, admin.email, subscriptionCancelledEmail(safeTemplateData({
      firstName: admin.full_name?.split(' ')[0] || 'där',
      reactivateUrl: `${context.siteUrl}/admin/settings`,
    })));
  } catch (error) {
    console.error('[stripe-webhook] Cancellation notification failed', error);
  }
}

export async function handleStripeEvent(event: Stripe.Event, context: HandlerContext) {
  const supported = ['checkout.session.completed', 'checkout.session.async_payment_failed', 'checkout.session.async_payment_succeeded', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed'];
  if (!supported.includes(event.type)) return;
  let company: Company | null;
  let customerId: string | undefined;
  if (event.type.startsWith('checkout.session.')) {
    const session = event.data.object as Stripe.Checkout.Session;
    // Ignore unrelated payments sharing this Stripe account.
    if (session.mode !== 'subscription' || !session.metadata?.company_id) return;
    const result = await context.supabase.from('companies').select(companyFields).eq('id', session.metadata.company_id).single();
    if (result.error) throw result.error;
    company = result.data as Company;
    customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    if (!customerId || (company.stripe_customer_id && company.stripe_customer_id !== customerId)) throw new Error('Checkout customer does not match company');
  } else {
    const object = event.data.object as Stripe.Subscription | Stripe.Invoice;
    customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
    if (!customerId) return;
    company = await getCompanyByCustomer(context, customerId);
    if (!company) return; // Not an Aurora customer.
  }
  if (!company || !shouldApplyBillingEvent(company, event)) return;
  // Event payloads can arrive late or out of order. Always reconcile the live
  // subscription set, so an old invoice/deletion cannot close a newer plan.
  const subscriptions = await context.stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
  if (subscriptions.has_more) throw new Error('Subscription history requires manual reconciliation');
  const current = currentSubscription(subscriptions.data, company.stripe_subscription_id);
  if (!current) {
    if (event.type.startsWith('checkout.session.')) throw new Error('Checkout subscription not visible yet');
    return;
  }
  const status = mapStripeStatus(current.status);
  await updateCompany(context, company, event, { subscription_status: status, stripe_customer_id: customerId, stripe_subscription_id: current.id });
  if (status === 'active') await notifyActive(context, company);
  if (status === 'past_due') await notifyPaymentFailed(context, company);
  if (status === 'cancelled') await notifyCancelled(context, company);
}

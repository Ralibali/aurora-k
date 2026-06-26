import Stripe from 'https://esm.sh/stripe@18.5.0';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.57.2';
import { paymentFailedEmail, subscriptionCancelledEmail, welcomeEmail } from '../_shared/email-templates.ts';

export type AppSubscriptionStatus = 'active' | 'pending' | 'past_due' | 'cancelled' | 'paused';

type Company = {
  id: string;
  name: string;
  subscription_status: string | null;
};

type HandlerContext = {
  stripe: Stripe;
  supabase: SupabaseClient;
  supabaseUrl: string;
  serviceRoleKey: string;
  siteUrl: string;
};

export function mapStripeStatus(status: Stripe.Subscription.Status): AppSubscriptionStatus {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  if (status === 'paused') return 'paused';
  if (status === 'canceled' || status === 'incomplete_expired') return 'cancelled';
  return 'pending';
}

async function getCompanyByCustomer(context: HandlerContext, customerId: string) {
  const { data, error } = await context.supabase
    .from('companies')
    .select('id, name, subscription_status')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (error) throw error;
  return data as Company | null;
}

async function updateCompany(context: HandlerContext, companyId: string, updates: Record<string, unknown>) {
  const { error } = await context.supabase.from('companies').update(updates).eq('id', companyId);
  if (error) throw error;
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
    await sendEmail(context, admin.email, welcomeEmail({
      firstName: admin.full_name?.split(' ')[0] || 'där',
      companyName: company.name || 'Ditt företag',
      dashboardUrl: `${context.siteUrl}/admin`,
    }));
  } catch (error) {
    console.error('[stripe-webhook] Welcome notification failed', error);
  }
}

async function notifyPaymentFailed(context: HandlerContext, company: Company) {
  if (company.subscription_status === 'past_due') return;
  try {
    const admin = await getAdmin(context, company.id);
    if (!admin?.email) return;
    await sendEmail(context, admin.email, paymentFailedEmail({
      firstName: admin.full_name?.split(' ')[0] || 'där',
      portalUrl: `${context.siteUrl}/admin/settings`,
    }));
  } catch (error) {
    console.error('[stripe-webhook] Payment notification failed', error);
  }
}

async function notifyCancelled(context: HandlerContext, company: Company) {
  if (company.subscription_status === 'cancelled') return;
  try {
    const admin = await getAdmin(context, company.id);
    if (!admin?.email) return;
    await sendEmail(context, admin.email, subscriptionCancelledEmail({
      firstName: admin.full_name?.split(' ')[0] || 'där',
      reactivateUrl: `${context.siteUrl}/admin/settings`,
    }));
  } catch (error) {
    console.error('[stripe-webhook] Cancellation notification failed', error);
  }
}

export async function handleStripeEvent(event: Stripe.Event, context: HandlerContext) {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const companyId = session.metadata?.company_id;
    if (!companyId) throw new Error('Checkout session saknar company_id');

    const { data, error } = await context.supabase
      .from('companies')
      .select('id, name, subscription_status')
      .eq('id', companyId)
      .single();
    if (error) throw error;
    const company = data as Company;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    let status: AppSubscriptionStatus = session.payment_status === 'paid' || session.payment_status === 'no_payment_required' ? 'active' : 'pending';
    if (subscriptionId) status = mapStripeStatus((await context.stripe.subscriptions.retrieve(subscriptionId)).status);
    if (status === 'active') await notifyActive(context, company);
    await updateCompany(context, company.id, {
      subscription_status: status,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    });
    return;
  }

  if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
    const company = await getCompanyByCustomer(context, customerId);
    if (!company) throw new Error(`Företag saknas för Stripe-kund ${customerId}`);
    const status = event.type === 'customer.subscription.deleted' ? 'cancelled' : mapStripeStatus(subscription.status);
    if (status === 'active') await notifyActive(context, company);
    if (status === 'cancelled') await notifyCancelled(context, company);
    await updateCompany(context, company.id, { subscription_status: status, stripe_subscription_id: subscription.id });
    return;
  }

  if (event.type === 'invoice.paid' || event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (!customerId) throw new Error('Stripe-fakturan saknar customer');
    const company = await getCompanyByCustomer(context, customerId);
    if (!company) throw new Error(`Företag saknas för Stripe-kund ${customerId}`);
    if (event.type === 'invoice.paid') {
      await notifyActive(context, company);
      await updateCompany(context, company.id, { subscription_status: 'active' });
    } else {
      await notifyPaymentFailed(context, company);
      await updateCompany(context, company.id, { subscription_status: 'past_due' });
    }
    return;
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.company_id) await updateCompany(context, session.metadata.company_id, { subscription_status: 'pending' });
  }
}

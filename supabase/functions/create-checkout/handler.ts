import { currentSubscription, isLiveSubscription, type BillingSubscription } from '../_shared/billing-state.ts';

const PRICING_VERSION = '449-ex-vat-no-setup-v1';

type CheckoutSession = { id: string; mode: string; status: string | null; url?: string | null; created: number; metadata?: Record<string, string> | null };
type CheckoutParams = { automatic_tax: { enabled: true }; billing_address_collection: 'required'; customer_update: { name: 'auto'; address: 'auto' }; tax_id_collection: { enabled: true }; customer: string; line_items: { price: string; quantity: number }[]; mode: 'subscription'; metadata: Record<string, string>; subscription_data: { metadata: Record<string, string> }; success_url: string; cancel_url: string };
export type CheckoutApi = {
  customers: { create: (params: { name: string; email: string; metadata: Record<string, string> }, options: { idempotencyKey: string }) => Promise<{ id: string }> };
  subscriptions: { list: (params: { customer: string; status: 'all'; limit: number }) => Promise<{ data: BillingSubscription[]; has_more: boolean }> };
  checkout: { sessions: {
    expire: (id: string) => Promise<unknown>;
    list: (params: { customer: string; limit: number }) => Promise<{ data: CheckoutSession[]; has_more: boolean }>;
    create: (params: CheckoutParams, options: { idempotencyKey: string }) => Promise<{ url: string | null }>;
  } };
  billingPortal: { sessions: { create: (params: { customer: string; return_url: string }) => Promise<{ url: string }> } };
};

type Company = { id: string; name: string; stripe_customer_id: string | null; stripe_subscription_id: string | null };
type Input = {
  stripe: CheckoutApi;
  company: Company;
  demoCompany: boolean;
  email: string;
  userId: string;
  origin: string;
  monthlyPriceId: string;
  saveCustomer: (customerId: string) => Promise<void>;
};

export async function prepareCompanyCheckout(input: Input): Promise<{ url: string; existingSubscription?: boolean }> {
  if (input.demoCompany) throw new Error('Betalning är inte tillgänglig för demoföretag.');
  const { stripe, company, origin } = input;
  let customerId = company.stripe_customer_id;
  if (!customerId) {
    // A stable key prevents concurrent requests from creating separate customers.
    // Stable parameters also allow retry after the company write fails.
    const customer = await stripe.customers.create({ name: company.name, email: input.email, metadata: { company_id: company.id } }, { idempotencyKey: `aurora-company-customer-${company.id}` });
    customerId = customer.id;
    await input.saveCustomer(customerId);
  }
  const [subscriptionList, sessionList] = await Promise.all([
    stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 }),
    stripe.checkout.sessions.list({ customer: customerId, limit: 100 }),
  ]);
  // Fail closed rather than overlooking a live subscription beyond the first page.
  if (subscriptionList.has_more || sessionList.has_more) throw new Error('Kontakta support för att kontrollera företagets befintliga betalning.');
  const subscription = currentSubscription(subscriptionList.data, company.stripe_subscription_id);
  const relevantSessions = sessionList.data.filter(item => item.mode === 'subscription' && item.metadata?.company_id === company.id);
  // Retire pre-change links so their old tax/setup parameters cannot be reused.
  for (const session of relevantSessions.filter(item => item.status === 'open' && item.metadata?.pricing_version !== PRICING_VERSION)) {
    await stripe.checkout.sessions.expire(session.id);
  }
  const openSession = relevantSessions.find(item => item.status === 'open' && item.url && item.metadata?.pricing_version === PRICING_VERSION);
  if (subscription && isLiveSubscription(subscription)) {
    // Incomplete subscriptions can still have an unfinished hosted checkout.
    if (subscription.status === 'incomplete' && openSession?.url) return { url: openSession.url };
    const portal = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/admin/settings` });
    return { url: portal.url, existingSubscription: true };
  }
  if (openSession?.url) return { url: openSession.url };

  const lineItems = [{ price: input.monthlyPriceId, quantity: 1 }];
  const latestSession = [...relevantSessions].sort((a, b) => b.created - a.created)[0];
  // Two simultaneous requests see the same predecessor and use the same Stripe
  // key. A later retry sees the open session; expiry yields a new predecessor.
  const session = await stripe.checkout.sessions.create({
    automatic_tax: { enabled: true }, billing_address_collection: 'required',
    customer_update: { name: 'auto', address: 'auto' }, tax_id_collection: { enabled: true },
    customer: customerId, line_items: lineItems, mode: 'subscription',
    metadata: { company_id: company.id, pricing_version: PRICING_VERSION }, subscription_data: { metadata: { company_id: company.id } },
    success_url: `${origin}/onboarding?checkout=success`, cancel_url: `${origin}/admin/settings?checkout=cancelled`,
  }, { idempotencyKey: `aurora-checkout-${PRICING_VERSION}-${company.id}-${latestSession?.id ?? 'initial'}` });
  if (!session.url) throw new Error('Betalningslänken kunde inte skapas.');
  return { url: session.url };
}

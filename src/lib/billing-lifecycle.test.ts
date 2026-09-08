import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareCompanyCheckout } from '../../supabase/functions/create-checkout/handler';
import { currentSubscription, shouldApplyBillingEvent } from '../../supabase/functions/_shared/billing-state';

const stripe = {
  customers: { create: vi.fn() }, subscriptions: { list: vi.fn() },
  checkout: { sessions: { list: vi.fn(), create: vi.fn() } },
  invoices: { list: vi.fn() }, billingPortal: { sessions: { create: vi.fn() } },
};
const input = () => ({ stripe, company: { id: 'company-1', name: 'Pilot', stripe_customer_id: 'cus_1', stripe_subscription_id: null }, email: 'admin@example.com', userId: 'admin-1', origin: 'https://auroratransport.se', monthlyPriceId: 'price_month', setupPriceId: 'price_setup', saveCustomer: vi.fn().mockResolvedValue(undefined) });
beforeEach(() => {
  vi.clearAllMocks();
  stripe.customers.create.mockResolvedValue({ id: 'cus_1' });
  stripe.subscriptions.list.mockResolvedValue({ data: [], has_more: false });
  stripe.checkout.sessions.list.mockResolvedValue({ data: [], has_more: false });
  stripe.checkout.sessions.create.mockResolvedValue({ url: 'https://checkout.stripe.com/session' });
  stripe.billingPortal.sessions.create.mockResolvedValue({ url: 'https://billing.stripe.com/portal' });
  stripe.invoices.list.mockResolvedValue({ data: [] });
});

describe('checkout lifecycle', () => {
  it('reuses unfinished checkout instead of creating another payable session', async () => {
    stripe.checkout.sessions.list.mockResolvedValue({ data: [{ id: 'cs_open', mode: 'subscription', metadata: { company_id: 'company-1' }, status: 'open', url: 'https://checkout.stripe.com/existing', created: 1 }], has_more: false });
    expect(await prepareCompanyCheckout(input())).toEqual({ url: 'https://checkout.stripe.com/existing' });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it.each(['active', 'trialing', 'past_due', 'unpaid', 'paused'])('sends an existing %s subscription to management without creating a duplicate', async status => {
    stripe.subscriptions.list.mockResolvedValue({ data: [{ id: 'sub_existing', status, created: 1 }], has_more: false });
    expect((await prepareCompanyCheckout(input())).existingSubscription).toBe(true);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it('uses identical Stripe idempotency keys when concurrent requests see the same checkout predecessor', async () => {
    await Promise.all([prepareCompanyCheckout(input()), prepareCompanyCheckout({ ...input(), userId: 'another-admin' })]);
    expect(stripe.checkout.sessions.create.mock.calls[0]).toEqual(stripe.checkout.sessions.create.mock.calls[1]);
    expect(stripe.checkout.sessions.create.mock.calls[0][1].idempotencyKey).toContain('company-1');
  });
  it('does not collect the one-time setup fee again when reactivating a paying company', async () => {
    stripe.subscriptions.list.mockResolvedValue({ data: [{ id: 'sub_old', status: 'canceled', created: 1 }], has_more: false });
    stripe.invoices.list.mockResolvedValue({ data: [{ id: 'in_paid' }] });
    await prepareCompanyCheckout(input());
    expect(stripe.checkout.sessions.create.mock.calls[0][0].line_items).toEqual([{ price: 'price_month', quantity: 1 }]);
  });
  it('does not create checkout after the customer database write fails', async () => {
    const values = input(); values.company.stripe_customer_id = null;
    values.saveCustomer.mockRejectedValue(new Error('database unavailable'));
    await expect(prepareCompanyCheckout(values)).rejects.toThrow('database unavailable');
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
  it('fails closed when pagination could hide another active subscription', async () => {
    stripe.subscriptions.list.mockResolvedValue({ data: [], has_more: true });
    await expect(prepareCompanyCheckout(input())).rejects.toThrow('Kontakta support');
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });
});

describe('webhook ordering', () => {
  it('keeps a new live subscription when an older cancelled subscription sends events later', () => {
    const old = { id: 'sub_old', status: 'canceled', created: 10 };
    const current = { id: 'sub_new', status: 'active', created: 20 };
    expect(currentSubscription([old, current], old.id)).toBe(current);
    expect(currentSubscription([current, old], current.id)).toBe(current);
  });
  it('does not activate a cancelled subscription just because an old invoice was paid', () => {
    expect(currentSubscription([{ id: 'sub_old', status: 'canceled', created: 10 }], 'sub_old')?.status).toBe('canceled');
  });
  it('rejects duplicate and older events while allowing a new event in the same Stripe second', () => {
    const state = { stripe_event_created: 100, stripe_last_event_id: 'evt_1' };
    expect(shouldApplyBillingEvent(state, { id: 'evt_1', created: 100 })).toBe(false);
    expect(shouldApplyBillingEvent(state, { id: 'evt_old', created: 99 })).toBe(false);
    expect(shouldApplyBillingEvent(state, { id: 'evt_2', created: 100 })).toBe(true);
  });
});

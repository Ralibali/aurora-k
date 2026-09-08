export type BillingSubscription = { id: string; status: string; created: number };
export type AppSubscriptionStatus = 'active' | 'pending' | 'past_due' | 'cancelled' | 'paused';

export function mapSubscriptionStatus(status: string): AppSubscriptionStatus {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  if (status === 'paused') return 'paused';
  if (status === 'canceled' || status === 'incomplete_expired') return 'cancelled';
  return 'pending';
}
export function isLiveSubscription(subscription: BillingSubscription) {
  return !['canceled', 'incomplete_expired'].includes(subscription.status);
}
/** Prefer a live subscription over old cancelled plans, regardless of webhook order. */
export function currentSubscription<T extends BillingSubscription>(subscriptions: readonly T[], storedId: string | null): T | null {
  const rank = (item: T) => ['active', 'trialing'].includes(item.status) ? 0 : isLiveSubscription(item) ? 1 : 2;
  return [...subscriptions].sort((a, b) => rank(a) - rank(b)
    || Number(b.id === storedId) - Number(a.id === storedId)
    || b.created - a.created)[0] ?? null;
}
export function shouldApplyBillingEvent(stored: { stripe_event_created?: number | null; stripe_last_event_id?: string | null }, event: { id: string; created: number }) {
  return stored.stripe_last_event_id !== event.id && event.created >= (stored.stripe_event_created ?? 0);
}

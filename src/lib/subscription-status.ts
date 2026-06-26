export type RawSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'pending'
  | 'incomplete'
  | 'paused'
  | 'past_due'
  | 'unpaid'
  | 'cancelled'
  | 'canceled'
  | 'incomplete_expired'
  | null;

export type SubscriptionViewStatus = 'active' | 'pending' | 'past_due' | 'cancelled' | 'paused' | null;

export function normalizeSubscriptionStatus(status: RawSubscriptionStatus): SubscriptionViewStatus {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'pending' || status === 'incomplete') return 'pending';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  if (status === 'cancelled' || status === 'canceled' || status === 'incomplete_expired') return 'cancelled';
  if (status === 'paused') return 'paused';
  return null;
}

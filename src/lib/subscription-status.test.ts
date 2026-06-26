import { describe, expect, it } from 'vitest';
import { normalizeSubscriptionStatus } from '@/lib/subscription-status';

describe('normalizeSubscriptionStatus', () => {
  it('allows active and trialing accounts', () => {
    expect(normalizeSubscriptionStatus('active')).toBe('active');
    expect(normalizeSubscriptionStatus('trialing')).toBe('active');
  });

  it('groups failed and unpaid states', () => {
    expect(normalizeSubscriptionStatus('past_due')).toBe('past_due');
    expect(normalizeSubscriptionStatus('unpaid')).toBe('past_due');
  });

  it('blocks cancelled and unknown states', () => {
    expect(normalizeSubscriptionStatus('incomplete_expired')).toBe('cancelled');
    expect(normalizeSubscriptionStatus(null)).toBeNull();
  });
});

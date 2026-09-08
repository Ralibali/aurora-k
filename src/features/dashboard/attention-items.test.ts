import { describe, expect, it } from 'vitest';
import { buildAttentionItems } from './attention-items';
import type { DispatchAssignment } from '@/features/dispatch/dispatch-utils';

const now = new Date('2026-09-08T08:00:00Z');
const assignment = (values: Partial<DispatchAssignment> = {}): DispatchAssignment => ({
  id: 'job', status: 'pending', scheduled_start: '2026-09-08T07:30:00Z', assigned_driver_id: 'driver-1', ...values,
});

describe('dashboard attention routing', () => {
  it('opens the matching dispatch filter across dates for each transport issue', () => {
    const items = buildAttentionItems([
      assignment({ id: 'late' }),
      assignment({ id: 'unassigned', scheduled_start: '2026-09-12T10:00:00Z', assigned_driver_id: null }),
      assignment({ id: 'delayed', status: 'delayed', actual_start: '2026-09-08T07:30:00Z' }),
      assignment({ id: 'proof', status: 'completed', require_signature: true }),
    ], [], now);
    expect(items.map(({ id, count, href }) => ({ id, count, href }))).toEqual([
      { id: 'late', count: 1, href: '/admin/assignments?filter=overdue&date=all' },
      { id: 'delayed', count: 1, href: '/admin/assignments?filter=delayed&date=all' },
      { id: 'unassigned', count: 1, href: '/admin/assignments?filter=unassigned&date=all' },
      { id: 'proof', count: 1, href: '/admin/assignments?filter=proof&date=all' },
    ]);
  });

  it('does not flag cancelled jobs or a job whose recorded start already exists', () => {
    const items = buildAttentionItems([
      assignment({ status: 'cancelled', assigned_driver_id: null }),
      assignment({ actual_start: '2026-09-08T07:32:00Z' }),
    ], [], now);
    expect(items).toEqual([]);
  });

  it('marks yesterday’s invoice overdue after midnight in Stockholm, before UTC midnight', () => {
    const items = buildAttentionItems([], [
      { status: 'sent', due_date: '2026-09-08' },
      { status: 'sent', due_date: '2026-09-09' },
      { status: 'paid', due_date: '2026-09-01' },
    ], new Date('2026-09-08T22:30:00Z'));
    expect(items).toEqual([expect.objectContaining({ id: 'overdue', count: 1 })]);
  });

  it('keeps missing delivery proof out of invoice-ready work', () => {
    const items = buildAttentionItems([
      assignment({ id: 'photo', status: 'completed', require_photo: true }),
      assignment({ id: 'ready', status: 'completed', require_signature: true, signature_url: 'signature.png' }),
    ], [], now);
    expect(items.map(({ id, count }) => ({ id, count }))).toEqual([
      { id: 'proof', count: 1 },
      { id: 'invoice-ready', count: 1 },
    ]);
  });
});

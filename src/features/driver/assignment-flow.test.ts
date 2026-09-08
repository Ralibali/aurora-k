import { describe, expect, it } from 'vitest';
import { canCompleteDriverAssignment, canStartDriverAssignment, driverAssignmentGroups, driverAssignmentId, driverAssignmentPath } from './assignment-flow';

const row = (id: string, scheduled_start: string, status = 'pending', actual_start: string | null = null) => ({ id, scheduled_start, status, actual_start });
describe('driver assignment workflow', () => {
  it('handles both deep links with one canonical destination', () => {
    expect(driverAssignmentId('/driver/assignment/abc')).toBe('abc');
    expect(driverAssignmentId('/driver/assignments/abc/')).toBe('abc');
    expect(driverAssignmentPath('abc')).toBe('/driver/assignments/abc');
    expect(driverAssignmentId('/admin/assignments/abc')).toBeUndefined();
  });
  it('uses Stockholm calendar days, retaining overdue work and separating closed work', () => {
    const rows = [row('midnight', '2026-09-07T22:30:00Z'), row('old', '2026-09-06T12:00:00Z'), row('future', '2026-09-08T22:30:00Z'), row('done', '2026-09-08T08:00:00Z', 'completed'), row('cancel', '2026-09-08T08:00:00Z', 'cancelled')];
    const groups = driverAssignmentGroups(rows, new Date('2026-09-08T08:00:00Z'));
    expect(groups.current.map(item => item.id)).toEqual(['old', 'midnight']);
    expect(groups.upcoming.map(item => item.id)).toEqual(['future']);
    expect(groups.completed.map(item => item.id)).toEqual(['done']);
    expect(groups.cancelled.map(item => item.id)).toEqual(['cancel']);
    expect(rows[0].id).toBe('midnight');
  });
  it('keeps a started delayed job at the front even when scheduled in the future', () => {
    const groups = driverAssignmentGroups([row('pending', '2026-09-07T08:00:00Z'), row('driving', '2026-09-09T08:00:00Z', 'delayed', '2026-09-08T08:00:00Z')], new Date('2026-09-08T09:00:00Z'));
    expect(groups.current[0].id).toBe('driving');
    expect(groups.upcoming).toEqual([]);
  });
  it('allows delayed starts and proof after a durable queued start, never closed jobs', () => {
    expect(canStartDriverAssignment({ status: 'delayed', actual_start: null })).toBe(true);
    expect(canStartDriverAssignment({ status: 'delayed', actual_start: '2026-09-08T08:00:00Z' })).toBe(false);
    expect(canCompleteDriverAssignment({ status: 'pending' }, true)).toBe(true);
    expect(canCompleteDriverAssignment({ status: 'pending' })).toBe(false);
    expect(canCompleteDriverAssignment({ status: 'delayed', actual_start: '2026-09-08T08:00:00Z' })).toBe(true);
    for (const status of ['completed', 'cancelled']) {
      expect(canStartDriverAssignment({ status })).toBe(false);
      expect(canCompleteDriverAssignment({ status, actual_start: '2026-09-08T08:00:00Z' }, true)).toBe(false);
    }
  });
});

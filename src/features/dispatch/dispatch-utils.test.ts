import { describe, expect, it } from 'vitest';
import {
  filterDispatchAssignments,
  formatStockholmTime,
  getAssignmentDelayMinutes,
  getDriverConflicts,
  getStockholmDateKey,
  isAssignableAssignment,
  isOpenAssignment,
  isOverdueAssignment,
  matchesDispatchFilter,
  type DispatchAssignment,
  type DispatchFilterOptions,
} from './dispatch-utils';

const now = new Date('2026-09-08T08:00:00Z');
const assignment = (updates: Partial<DispatchAssignment> = {}): DispatchAssignment => ({
  id: 'job-1',
  title: 'Palltransport',
  status: 'pending',
  scheduled_start: '2026-09-08T09:00:00Z',
  scheduled_end: '2026-09-08T10:00:00Z',
  assigned_driver_id: 'driver-1',
  priority: 'normal',
  ...updates,
});
const options: DispatchFilterOptions = { date: 'all', filter: 'all', driverId: 'all', search: '', now };

describe('Swedish dispatch dates', () => {
  it('includes jobs after Swedish midnight in their Swedish day in summer and winter', () => {
    expect(getStockholmDateKey('2026-09-07T22:30:00Z')).toBe('2026-09-08');
    expect(getStockholmDateKey(new Date('2026-01-07T23:30:00Z'))).toBe('2026-01-08');
  });

  it('formats operational times in Sweden regardless of the device time zone', () => {
    expect(formatStockholmTime('2026-09-07T22:30:00Z')).toBe('00:30');
    expect(formatStockholmTime('2026-01-07T23:30:00Z')).toBe('00:30');
    expect(formatStockholmTime('invalid')).toBe('–');
  });

  it('keeps the correct day across the daylight saving transitions', () => {
    expect(getStockholmDateKey('2026-03-29T21:59:59Z')).toBe('2026-03-29');
    expect(getStockholmDateKey('2026-03-29T22:00:00Z')).toBe('2026-03-30');
    expect(getStockholmDateKey('2026-10-25T22:59:59Z')).toBe('2026-10-25');
    expect(getStockholmDateKey('2026-10-25T23:00:00Z')).toBe('2026-10-26');
  });

  it('returns an empty key for invalid data instead of crashing the board', () => {
    expect(getStockholmDateKey('invalid')).toBe('');
  });
});

describe('operational dispatch filters', () => {
  it('only allows unstarted planned jobs to be assigned, including a start arriving before its status update', () => {
    expect(isAssignableAssignment(assignment())).toBe(true);
    expect(isAssignableAssignment(assignment({ status: 'unassigned' }))).toBe(true);
    expect(isAssignableAssignment(assignment({ actual_start: '2026-09-08T09:00:00Z' }))).toBe(false);
    for (const status of ['active', 'delayed', 'completed', 'cancelled']) {
      expect(isAssignableAssignment(assignment({ status }))).toBe(false);
    }
  });
  it('does not count completed or cancelled jobs as urgent or unassigned', () => {
    for (const status of ['completed', 'cancelled']) {
      const item = assignment({ status, priority: 'urgent', assigned_driver_id: null });
      expect(isOpenAssignment(item)).toBe(false);
      expect(matchesDispatchFilter(item, 'urgent', now)).toBe(false);
      expect(matchesDispatchFilter(item, 'unassigned', now)).toBe(false);
      expect(matchesDispatchFilter(item, status, now)).toBe(true);
    }
  });

  it('distinguishes assigned pending jobs from those awaiting a driver', () => {
    expect(matchesDispatchFilter(assignment(), 'pending', now)).toBe(true);
    expect(matchesDispatchFilter(assignment({ assigned_driver_id: null }), 'pending', now)).toBe(false);
    expect(matchesDispatchFilter(assignment({ assigned_driver_id: null }), 'unassigned', now)).toBe(true);
  });

  it('flags an unstarted job only after the full 15 minute grace period', () => {
    const item = assignment({ scheduled_start: '2026-09-08T07:45:00Z' });
    expect(isOverdueAssignment(item, now)).toBe(false);
    expect(isOverdueAssignment(item, new Date('2026-09-08T08:00:01Z'))).toBe(true);
    expect(getAssignmentDelayMinutes(item, now)).toBe(15);
    expect(matchesDispatchFilter(item, 'overdue', new Date('2026-09-08T08:01:00Z'))).toBe(true);
  });

  it('does not infer lateness from a started, finished, future or invalid start', () => {
    for (const updates of [
      { actual_start: '2026-09-08T07:00:00Z' },
      { status: 'active' },
      { status: 'completed' },
      { status: 'cancelled' },
      { scheduled_start: 'invalid' },
      { scheduled_start: '2026-09-08T09:00:00Z' },
    ]) {
      const item = assignment({ scheduled_start: '2026-09-08T07:00:00Z', ...updates });
      expect(isOverdueAssignment(item, now)).toBe(false);
      expect(getAssignmentDelayMinutes(item, now)).toBe(0);
    }
  });

  it('finds only completed assignments missing a required delivery proof', () => {
    expect(matchesDispatchFilter(assignment({ status: 'completed', require_photo: true }), 'proof', now)).toBe(true);
    expect(matchesDispatchFilter(assignment({ status: 'completed', require_signature: true }), 'proof', now)).toBe(true);
    expect(matchesDispatchFilter(assignment({ status: 'pending', require_photo: true }), 'proof', now)).toBe(false);
    expect(matchesDispatchFilter(assignment({ status: 'completed', require_photo: true, consignment_photo_url: '/photo.jpg' }), 'proof', now)).toBe(false);
    expect(matchesDispatchFilter(assignment({ status: 'completed', require_photo: true, consignment_photo_url: '/photo.jpg', require_signature: true }), 'proof', now)).toBe(true);
    expect(matchesDispatchFilter(assignment({ status: 'completed' }), 'proof', now)).toBe(false);
  });
});

describe('dispatch list filtering and ordering', () => {
  it('combines Swedish date, status, driver and search, including IDs and driver names', () => {
    const item = assignment({ id: 'AX-42', scheduled_start: '2026-09-07T22:30:00Z', driver: { full_name: 'Sara Andersson' }, customer: { name: 'Åkeriet' } });
    const rows = [item, assignment({ id: 'other-driver', assigned_driver_id: 'driver-2' }), assignment({ id: 'tomorrow', scheduled_start: '2026-09-08T22:30:00Z' })];
    expect(filterDispatchAssignments(rows, { ...options, date: '2026-09-08', driverId: 'driver-1', filter: 'pending', search: '  SARA  ax-42 ÅKERIET ' })).toEqual([item]);
    expect(filterDispatchAssignments(rows, { ...options, search: 'missing' })).toEqual([]);
  });

  it('puts exceptions before urgency, then chronological open jobs and terminal jobs, without mutating input', () => {
    const rows = [
      assignment({ id: 'later', scheduled_start: '2026-09-08T11:00:00Z' }),
      assignment({ id: 'completed', status: 'completed', scheduled_start: '2026-09-08T06:00:00Z' }),
      assignment({ id: 'urgent', priority: 'urgent', scheduled_start: '2026-09-08T10:00:00Z' }),
      assignment({ id: 'earlier' }),
      assignment({ id: 'delayed', status: 'delayed', scheduled_start: '2026-09-08T08:00:00Z' }),
      assignment({ id: 'overdue', scheduled_start: '2026-09-08T07:00:00Z' }),
    ];
    const originalIds = rows.map(item => item.id);
    expect(filterDispatchAssignments(rows, options).map(item => item.id)).toEqual(['overdue', 'delayed', 'urgent', 'earlier', 'later', 'completed']);
    expect(rows.map(item => item.id)).toEqual(originalIds);
  });
});

describe('driver assignment conflicts', () => {
  it('finds overlaps with the chosen driver and ignores adjacent, terminal and other-driver jobs', () => {
    const rows = [
      assignment({ id: 'selected', assigned_driver_id: null }),
      assignment({ id: 'overlap', scheduled_start: '2026-09-08T09:30:00Z', scheduled_end: '2026-09-08T10:30:00Z' }),
      assignment({ id: 'adjacent', scheduled_start: '2026-09-08T10:00:00Z', scheduled_end: '2026-09-08T11:00:00Z' }),
      assignment({ id: 'cancelled', status: 'cancelled' }),
      assignment({ id: 'completed', status: 'completed' }),
      assignment({ id: 'other', assigned_driver_id: 'driver-2' }),
    ];
    expect(getDriverConflicts(rows, ['selected'], 'driver-1').map(item => ({ id: item.assignment.id, conflicts: item.conflictsWith.map(other => other.id) })))
      .toEqual([{ id: 'selected', conflicts: ['overlap'] }]);
  });

  it('detects conflicts within a selection and never compares a job against itself', () => {
    const rows = [assignment({ id: 'one', assigned_driver_id: null }), assignment({ id: 'two', assigned_driver_id: 'driver-2' })];
    const result = getDriverConflicts(rows, ['one', 'two', 'one'], 'driver-1');
    expect(result).toHaveLength(2);
    expect(result[0].conflictsWith.map(item => item.id)).toEqual(['two']);
    expect(result[1].conflictsWith.map(item => item.id)).toEqual(['one']);
    expect(getDriverConflicts([rows[0]], ['one'], 'driver-1')).toEqual([]);
  });

  it('does not invent intervals for missing or invalid end times', () => {
    const selected = assignment({ id: 'selected', assigned_driver_id: null });
    for (const scheduled_end of [null, 'invalid', '2026-09-08T08:00:00Z']) {
      expect(getDriverConflicts([selected, assignment({ id: 'unknown', scheduled_end })], ['selected'], 'driver-1')).toEqual([]);
    }
    expect(getDriverConflicts([selected, assignment()], ['selected'], '')).toEqual([]);
  });
});

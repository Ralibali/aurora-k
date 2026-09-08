/** Fields shared by database assignments and the local dispatch demo. */
export type DispatchAssignment = {
  id: string;
  status: string;
  scheduled_start: string;
  scheduled_end?: string | null;
  actual_start?: string | null;
  title?: string | null;
  address?: string | null;
  pickup_address?: string | null;
  delivery_address?: string | null;
  service_type?: string | null;
  priority?: string | null;
  assigned_driver_id?: string | null;
  customer?: { name?: string | null } | null;
  driver?: { full_name?: string | null } | null;
  require_photo?: boolean | null;
  require_signature?: boolean | null;
  consignment_photo_url?: string | null;
  signature_url?: string | null;
};

const stockholmDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const stockholmTime = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Stockholm',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const minuteMs = 60_000;
const overdueThresholdMs = 15 * minuteMs;

/** Calendar day in Sweden, independent of the browser's local time zone. */
export function getStockholmDateKey(date: string | Date = new Date()): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return Number.isFinite(value.getTime()) ? stockholmDate.format(value) : '';
}

export function formatStockholmTime(date: string | Date): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return Number.isFinite(value.getTime()) ? stockholmTime.format(value) : '–';
}

export function isOpenAssignment(assignment: DispatchAssignment): boolean {
  return ['pending', 'unassigned', 'active', 'delayed'].includes(assignment.status);
}

export function isAssignableAssignment(assignment: DispatchAssignment): boolean {
  return ['pending', 'unassigned'].includes(assignment.status) && !assignment.actual_start;
}

function hasUnstartedSchedule(assignment: DispatchAssignment): boolean {
  return !assignment.actual_start && ['pending', 'unassigned', 'delayed'].includes(assignment.status);
}

/** Minutes past the planned start; never guesses a delivery ETA or active delay. */
export function getAssignmentDelayMinutes(assignment: DispatchAssignment, now = new Date()): number {
  if (!hasUnstartedSchedule(assignment)) return 0;
  const elapsed = now.getTime() - new Date(assignment.scheduled_start).getTime();
  return Number.isFinite(elapsed) ? Math.max(0, Math.floor(elapsed / minuteMs)) : 0;
}

export function isOverdueAssignment(assignment: DispatchAssignment, now = new Date()): boolean {
  if (!['pending', 'unassigned'].includes(assignment.status) || assignment.actual_start) return false;
  return now.getTime() - new Date(assignment.scheduled_start).getTime() > overdueThresholdMs;
}

export function matchesDispatchFilter(assignment: DispatchAssignment, filter: string, now = new Date()): boolean {
  switch (filter) {
    case 'unassigned':
      return isOpenAssignment(assignment) && !assignment.assigned_driver_id;
    case 'urgent':
      return isOpenAssignment(assignment) && ['urgent', 'high'].includes(assignment.priority ?? '');
    case 'pending':
      return assignment.status === 'pending' && Boolean(assignment.assigned_driver_id);
    case 'active':
    case 'delayed':
    case 'completed':
    case 'cancelled':
      return assignment.status === filter;
    case 'overdue':
      return isOverdueAssignment(assignment, now);
    case 'proof':
      return assignment.status === 'completed' && Boolean(
        (assignment.require_photo && !assignment.consignment_photo_url)
        || (assignment.require_signature && !assignment.signature_url),
      );
    default:
      return true;
  }
}

export type DispatchFilterOptions = {
  date: string | 'all';
  filter: string;
  driverId: string;
  search: string;
  now: Date;
};

function attentionRank(assignment: DispatchAssignment, now: Date): number {
  if (assignment.status === 'delayed' || isOverdueAssignment(assignment, now)) return 0;
  if (matchesDispatchFilter(assignment, 'urgent', now)) return 1;
  return isOpenAssignment(assignment) ? 2 : 3;
}

function scheduledTime(assignment: DispatchAssignment): number {
  const time = new Date(assignment.scheduled_start).getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

export function filterDispatchAssignments<T extends DispatchAssignment>(
  assignments: readonly T[],
  options: DispatchFilterOptions,
): T[] {
  const terms = options.search.trim().toLocaleLowerCase('sv-SE').split(/\s+/).filter(Boolean);
  return assignments.filter(assignment => {
    if (options.date !== 'all' && getStockholmDateKey(assignment.scheduled_start) !== options.date) return false;
    if (!matchesDispatchFilter(assignment, options.filter, options.now)) return false;
    if (options.driverId !== 'all' && assignment.assigned_driver_id !== options.driverId) return false;
    if (terms.length === 0) return true;
    const searchable = [
      assignment.id,
      assignment.title,
      assignment.customer?.name,
      assignment.driver?.full_name,
      assignment.address,
      assignment.pickup_address,
      assignment.delivery_address,
      assignment.service_type,
    ].filter(Boolean).join(' ').toLocaleLowerCase('sv-SE');
    return terms.every(term => searchable.includes(term));
  }).sort((left, right) => (
    attentionRank(left, options.now) - attentionRank(right, options.now)
    || scheduledTime(left) - scheduledTime(right)
    || left.id.localeCompare(right.id)
  ));
}

export type DriverConflict<T extends DispatchAssignment = DispatchAssignment> = {
  assignment: T;
  conflictsWith: T[];
};

function plannedInterval(assignment: DispatchAssignment): { start: number; end: number } | null {
  if (!assignment.scheduled_end) return null;
  const start = new Date(assignment.scheduled_start).getTime();
  const end = new Date(assignment.scheduled_end).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? { start, end } : null;
}

/** Known schedule overlaps after assigning the selection to this driver.
 * Missing end times remain unknown; adjacent intervals do not overlap.
 */
export function getDriverConflicts<T extends DispatchAssignment>(
  assignments: readonly T[],
  selectedIds: readonly string[],
  driverId: string,
): DriverConflict<T>[] {
  if (!driverId || driverId === 'all') return [];
  const selected = new Set(selectedIds);
  const relevant = assignments.filter(assignment => isOpenAssignment(assignment)
    && (selected.has(assignment.id) || assignment.assigned_driver_id === driverId));
  const intervals = new Map(relevant.map(assignment => [assignment.id, plannedInterval(assignment)]));

  return relevant.filter(assignment => selected.has(assignment.id)).flatMap(assignment => {
    const interval = intervals.get(assignment.id);
    if (!interval) return [];
    const conflictsWith = relevant.filter(other => {
      if (other.id === assignment.id) return false;
      const otherInterval = intervals.get(other.id);
      return otherInterval && interval.start < otherInterval.end && otherInterval.start < interval.end;
    });
    return conflictsWith.length ? [{ assignment, conflictsWith }] : [];
  });
}

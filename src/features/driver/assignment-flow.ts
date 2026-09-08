import { getStockholmDateKey, isOpenAssignment } from '@/features/dispatch/dispatch-utils';
import { compareRouteOrder } from './route-order';

export const driverAssignmentPath = (id: string) => `/driver/assignments/${encodeURIComponent(id)}`;
export const driverAssignmentId = (pathname: string) => pathname.match(/^\/driver\/assignments?\/([^/]+)\/?$/)?.[1];

type DriverAssignment = {
  id: string;
  status: string;
  scheduled_start: string;
  actual_start?: string | null;
  route_sequence?: number | null;
};

export function canStartDriverAssignment(assignment: Pick<DriverAssignment, 'status' | 'actual_start'>) {
  return ['pending', 'unassigned', 'active', 'delayed'].includes(assignment.status) && !assignment.actual_start;
}

export function canCompleteDriverAssignment(assignment: Pick<DriverAssignment, 'status' | 'actual_start'>, queuedStart = false) {
  return (['active', 'delayed'].includes(assignment.status) && Boolean(assignment.actual_start))
    || (queuedStart && ['pending', 'unassigned', 'active', 'delayed'].includes(assignment.status));
}

export function driverAssignmentGroups<T extends DriverAssignment>(assignments: readonly T[], now = new Date()) {
  const today = getStockholmDateKey(now);
  const open = assignments.filter(isOpenAssignment).sort((a, b) => {
    const activeA = Boolean(a.actual_start);
    const activeB = Boolean(b.actual_start);
    if (activeA !== activeB) return activeA ? -1 : 1;
    const dayOrder = getStockholmDateKey(a.scheduled_start).localeCompare(getStockholmDateKey(b.scheduled_start));
    return dayOrder || compareRouteOrder(a, b);
  });
  return {
    current: open.filter(item => getStockholmDateKey(item.scheduled_start) <= today || Boolean(item.actual_start)),
    upcoming: open.filter(item => getStockholmDateKey(item.scheduled_start) > today && !item.actual_start),
    completed: assignments.filter(item => item.status === 'completed').sort((a, b) => b.scheduled_start.localeCompare(a.scheduled_start)),
    cancelled: assignments.filter(item => item.status === 'cancelled').sort((a, b) => b.scheduled_start.localeCompare(a.scheduled_start)),
  };
}

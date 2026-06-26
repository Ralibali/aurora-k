export type RouteOrderedAssignment = {
  scheduled_start: string;
  route_sequence?: number | null;
};

export function compareRouteOrder(first: RouteOrderedAssignment, second: RouteOrderedAssignment) {
  const firstSequence = Number(first.route_sequence);
  const secondSequence = Number(second.route_sequence);
  const firstHasSequence = Number.isFinite(firstSequence);
  const secondHasSequence = Number.isFinite(secondSequence);

  if (firstHasSequence && secondHasSequence && firstSequence !== secondSequence) {
    return firstSequence - secondSequence;
  }
  if (firstHasSequence !== secondHasSequence) return firstHasSequence ? -1 : 1;
  return first.scheduled_start.localeCompare(second.scheduled_start);
}

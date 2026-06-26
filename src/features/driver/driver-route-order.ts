export type DriverRouteItem = {
  scheduled_start: string;
  route_sequence?: number | null;
};

export function compareDriverRoute(first: DriverRouteItem, second: DriverRouteItem) {
  const firstSequence = Number.isFinite(Number(first.route_sequence))
    ? Number(first.route_sequence)
    : Number.MAX_SAFE_INTEGER;
  const secondSequence = Number.isFinite(Number(second.route_sequence))
    ? Number(second.route_sequence)
    : Number.MAX_SAFE_INTEGER;

  if (firstSequence !== secondSequence) return firstSequence - secondSequence;
  return first.scheduled_start.localeCompare(second.scheduled_start);
}

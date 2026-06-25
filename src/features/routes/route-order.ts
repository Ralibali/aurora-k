export type RouteStop = {
  id: string;
  scheduled_start: string;
  geofence_lat?: number | null;
  geofence_lng?: number | null;
};

function distance(a: RouteStop, b: RouteStop) {
  if (a.geofence_lat == null || a.geofence_lng == null || b.geofence_lat == null || b.geofence_lng == null) {
    return Number.POSITIVE_INFINITY;
  }
  const toRad = (value: number) => value * Math.PI / 180;
  const lat1 = toRad(a.geofence_lat);
  const lat2 = toRad(b.geofence_lat);
  const dLat = lat2 - lat1;
  const dLng = toRad(b.geofence_lng - a.geofence_lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function optimizeRoute<T extends RouteStop>(items: T[]): T[] {
  if (items.length < 3) return items;
  const withCoordinates = items.filter(item => item.geofence_lat != null && item.geofence_lng != null);
  const withoutCoordinates = items
    .filter(item => item.geofence_lat == null || item.geofence_lng == null)
    .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));
  if (withCoordinates.length < 2) return [...items].sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));

  const remaining = [...withCoordinates].sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));
  const ordered: T[] = [remaining.shift()!];
  while (remaining.length) {
    const current = ordered[ordered.length - 1];
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;
    remaining.forEach((candidate, index) => {
      const candidateDistance = distance(current, candidate);
      if (candidateDistance < nearestDistance) {
        nearestDistance = candidateDistance;
        nearestIndex = index;
      }
    });
    ordered.push(remaining.splice(nearestIndex, 1)[0]);
  }
  return [...ordered, ...withoutCoordinates];
}

export function moveStop(ids: string[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

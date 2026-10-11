import { distanceKmBetween, type FleetPoint } from './telematics';

export type CheckpointAssignment = {
  id: string;
  title: string;
  scheduled_start: string;
  status: string;
  geofence_lat: number | null;
  geofence_lng: number | null;
  geofence_radius: number | null;
};

export type CheckpointReport = {
  id: string;
  title: string;
  status: string;
  scheduledStart: string;
  radiusM: number | null;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  nearPoints: number;
  sources: string[];
  evidence: 'gps_indication' | 'single_point' | 'no_near_point' | 'not_configured';
};

// Geofence evidence is deliberately observational, NOT proof of work or a
// verified handover. Only records explicitly linked to the assignment count.
export function summarizeCheckpoints(
  points: FleetPoint[],
  assignments: CheckpointAssignment[],
): CheckpointReport[] {
  const byAssignment = new Map<string, FleetPoint[]>();
  for (const point of points) {
    if (!point.assignment_id) continue;
    const group = byAssignment.get(point.assignment_id) ?? [];
    group.push(point);
    byAssignment.set(point.assignment_id, group);
  }
  return assignments.map((assignment) => {
    const lat = assignment.geofence_lat;
    const lng = assignment.geofence_lng;
    const radius = assignment.geofence_radius == null ? 150 : Math.min(500, Math.max(30, assignment.geofence_radius));
    const configured = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
      && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const entries = configured ? (byAssignment.get(assignment.id) ?? [])
      .filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude)
        && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180
        && Number.isFinite(Date.parse(p.recorded_at))
        && distanceKmBetween({ latitude: lat, longitude: lng }, p) * 1000 <= radius)
      .sort((a,b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at)) : [];
    const first = entries[0];
    // Two distinct samples at least 30 seconds apart give a stronger GPS
    // indication; still no certainty the delivery or service was performed.
    const second = first && entries.find(p => Date.parse(p.recorded_at) - Date.parse(first.recorded_at) >= 30_000);
    const evidence: CheckpointReport['evidence'] = !configured ? 'not_configured' : second ? 'gps_indication' : entries.length ? 'single_point' : 'no_near_point';
    return {
      id: assignment.id, title: assignment.title, status: assignment.status,
      scheduledStart: assignment.scheduled_start, radiusM: configured ? radius : null,
      firstObservedAt: first?.recorded_at ?? null,
      lastObservedAt: entries.at(-1)?.recorded_at ?? null,
      nearPoints: entries.length,
      sources: [...new Set(entries.map(p => p.source))],
      evidence,
    };
  }).sort((a, b) => Date.parse(b.scheduledStart) - Date.parse(a.scheduledStart));
}

// Prevent CSV formula injection in exported operational reports.
const csvCell = (value: unknown) => {
  const text = String(value ?? '').replace(/[\r\n\t]+/g, ' ').trim();
  const safe = /^[=+@-]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
};
export function checkpointCsv(rows: CheckpointReport[]) {
  const lines = [
    ['Uppdrag','Titel','Uppdragsstatus','GPS-indikation','Första position','Sista position','Punkter nära mål','Radie meter','Källa'],
    ...rows.map(row => [row.id, row.title, row.status, row.evidence, row.firstObservedAt ?? '',
      row.lastObservedAt ?? '', row.nearPoints, row.radiusM ?? '', row.sources.join(', ')]),
  ];
  return '\uFEFF' + lines.map(row => row.map(csvCell).join(';')).join('\r\n');
}

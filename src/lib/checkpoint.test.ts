import { describe, expect, it } from 'vitest';
import { checkpointCsv, summarizeCheckpoints } from './checkpoint';
import type { FleetPoint } from './telematics';
const task = { id: 'assignment-1', title: 'Uppdrag', scheduled_start: '2026-10-11T12:00:00Z', status: 'completed', geofence_lat: 58.4, geofence_lng: 15.6, geofence_radius: 150 };
const point = (minutes: number, patch: Partial<FleetPoint> = {}): FleetPoint => ({
  assignment_id: task.id, vehicle_id: 'vehicle', latitude: 58.4, longitude: 15.6,
  speed: 0, source: 'phone', recorded_at: new Date(Date.UTC(2026, 9, 11, 12, minutes)).toISOString(),
  ...patch,
});
describe('Checkpoint – observations, not delivery confirmation', () => {
  it('requires two samples at least 30 seconds apart near the stop', () => {
    const row = summarizeCheckpoints([point(0), point(1)], [task])[0];
    expect(row.evidence).toBe('gps_indication');
    expect(row.nearPoints).toBe(2);
  });
  it('single near sample is not enough', () => {
    expect(summarizeCheckpoints([point(0)], [task])[0].evidence).toBe('single_point');
  });
  it('ignores unrelated assignment and distant location', () => {
    const rows = summarizeCheckpoints([point(0, { assignment_id: 'other' }), point(1, { latitude: 59 })], [task]);
    expect(rows[0].evidence).toBe('no_near_point');
  });
  it('does not claim missing configured geofence as confirmed', () => {
    expect(summarizeCheckpoints([point(0), point(1)], [{ ...task, geofence_lat: null }])[0].evidence).toBe('not_configured');
  });
  it('escapes potentially malicious spreadsheet content', () => {
    const report = summarizeCheckpoints([point(0)], [{ ...task, title: '=HYPERLINK("bad")' }]);
    expect(checkpointCsv(report)).toContain("'=HYPERLINK");
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { fallbackPlan, point, vroomPlan, type Assignment, type Driver } from './engine';
import { stockholmDayBounds } from './day';
const job = (id: string, override: Partial<Assignment> = {}): Assignment => ({ id, title: id, scheduled_start: '2026-09-28T08:00:00Z', scheduled_end: '2026-09-28T10:00:00Z', assigned_driver_id: null, vehicle_id: null, geofence_lat: 58.4, geofence_lng: 15.6, route_demand: 1, route_skills: [], ...override });
const drivers: Driver[] = [{ id: 'driver', full_name: 'Test', route_capacity: 2, route_skills: ['cold'] }];
const depot = { lat: 58.4, lng: 15.6 };
describe('Smart Rutt feasibility', () => {
  it('leaves missing coordinates and impossible windows unassigned', () => {
    const result = fallbackPlan([job('missing', { geofence_lat: null }), job('late', { scheduled_end: '2026-09-28T08:10:00Z' }), job('ok')], drivers, depot, '2026-09-28T00:00:00Z');
    expect(result.stops.map(s => s.assignmentId)).toEqual(['ok']);
    expect(result.unassignedIds).toEqual(['missing', 'late']);
  });
  it('respects skills, cumulative capacity and travel/service time', () => {
    const result = fallbackPlan([job('skill', { route_skills: ['hazmat'] }), job('a'), job('b'), job('capacity')], drivers, depot, '2026-09-28T00:00:00Z');
    expect(result.stops).toHaveLength(2);
    expect(result.unassignedIds).toEqual(['skill', 'capacity']);
    expect(Date.parse(result.stops[1].arrivalAt!)).toBeGreaterThanOrEqual(Date.parse(result.stops[0].departureAt!));
    expect(point(job('invalid', { geofence_lat: 91 }))).toBeNull();
  });
  it('fails closed without depot or job coordinates', () => {
    expect(fallbackPlan([job('a')], drivers, null, '2026-09-28T00:00:00Z').stops).toEqual([]);
  });
  it('uses Swedish midnight across both DST transitions', () => {
    const spring = stockholmDayBounds('2026-03-29');
    expect(spring.dayStart).toBe('2026-03-28T23:00:00.000Z');
    expect(Date.parse(spring.dayEnd) - Date.parse(spring.dayStart)).toBe(23 * 3600000);
    const autumn = stockholmDayBounds('2026-10-25');
    expect(Date.parse(autumn.dayEnd) - Date.parse(autumn.dayStart)).toBe(25 * 3600000);
    expect(() => stockholmDayBounds('2026-02-30')).toThrow();
  });
});

afterEach(() => vi.unstubAllGlobals());
it('VROOM converts cumulative legs and waiting time, rejecting duplicate or late stops', async () => {
  vi.stubGlobal('AbortSignal', { timeout: () => new AbortController().signal });
  const start = Date.parse('2026-09-28T08:00:00Z') / 1000;
  const body = { code: 0, summary: { distance: 1000, duration: 300 }, routes: [{ vehicle: 1, steps: [
    { type: 'job', id: 1, arrival: start, waiting_time: 60, service: 900, distance: 200, duration: 100 },
    { type: 'job', id: 2, arrival: start + 1800, waiting_time: 0, service: 900, distance: 800, duration: 250 },
  ] }] };
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => body })));
  const run = () => vroomPlan([job('a'), job('b')], drivers, depot, '2026-09-28T00:00:00Z', 'https://vroom.example.test');
  const result = await run();
  expect(result.stops.map(stop => stop.distanceM)).toEqual([200, 600]);
  expect(result.stops[0].arrivalAt).toBe('2026-09-28T08:01:00.000Z');
  expect(result.stops[0].departureAt).toBe('2026-09-28T08:16:00.000Z');
  body.routes[0].steps[1].id = 1;
  await expect(run()).rejects.toThrow('duplicate');
  body.routes[0].steps[1].id = 2;
  body.routes[0].steps[1].arrival = start + 7200;
  await expect(run()).rejects.toThrow('Invalid arrival');
});

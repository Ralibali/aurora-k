import { beforeEach, expect, it, vi } from 'vitest';
import { computeDrivingRoute, drivingAddresses, googleDirectionsUrl } from './google-route';
vi.mock('@/lib/google-maps', () => ({ loadGoogleMaps: vi.fn().mockResolvedValue(undefined) }));
const stops = [{ address: 'combined label', pickup_address: 'A', delivery_address: 'B' }, { address: 'ignored', pickup_address: 'B', delivery_address: 'C' }];
const compute = vi.fn();
beforeEach(() => { compute.mockReset(); vi.stubGlobal('google', { maps: { importLibrary: vi.fn().mockResolvedValue({ Route: { computeRoutes: compute } }) } }); });
it('preserves each pickup before its delivery and removes only consecutive duplicates', () => {
  expect(drivingAddresses(stops)).toEqual(['A', 'B', 'C']);
  expect(drivingAddresses([...stops, { address: 'A' }])).toEqual(['A', 'B', 'C', 'A']);
});
it('provides real navigation URLs without API credentials', () => {
  const url = new URL(googleDirectionsUrl({ address: '', pickup_address: 'Ågatan 1', delivery_address: 'B & C' }));
  expect(url.origin).toBe('https://www.google.com');
  expect(url.searchParams.get('origin')).toBe('Ågatan 1');
  expect(url.searchParams.get('destination')).toBe('B & C');
});
it('requests a road route with fixed pickup/delivery order and explicit fields', async () => {
  compute.mockResolvedValue({ routes: [{ path: [{ lat: 58, lng: 15 }], distanceMeters: 15000, durationMillis: 900000 }] });
  expect(await computeDrivingRoute(stops)).toEqual({ path: [{ lat: 58, lng: 15 }], distanceKm: 15, minutes: 15 });
  expect(compute).toHaveBeenCalledWith(expect.objectContaining({ origin: 'A', intermediates: [{ location: 'B' }], destination: 'C', routingPreference: 'TRAFFIC_UNAWARE' }));
  expect(compute.mock.calls[0][0]).not.toHaveProperty('optimizeWaypointOrder');
});
it('refuses oversized routes and unavailable routes without claiming success', async () => {
  await expect(computeDrivingRoute([{ address: 'A' }])).rejects.toThrow();
  await expect(computeDrivingRoute(Array.from({ length: 28 }, (_, i) => ({ address: String(i) })))).rejects.toThrow();
  expect(compute).not.toHaveBeenCalled();
  compute.mockResolvedValue({ routes: [] });
  await expect(computeDrivingRoute(stops)).rejects.toThrow('ingen körväg');
});

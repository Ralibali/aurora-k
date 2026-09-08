import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RouteMap from './AdminRouteMapGoogle';
import LiveMap from './AdminLiveMapGoogle';
const mocks = vi.hoisted(() => ({ load: vi.fn(), map: vi.fn(), marker: vi.fn(), setMap: vi.fn(), clear: vi.fn(), fit: vi.fn() }));
vi.mock('@/lib/google-maps', () => ({ loadGoogleMaps: () => mocks.load() }));
let resolve: () => void;
beforeEach(() => {
  Object.values(mocks).forEach(mock => mock.mockReset());
  mocks.load.mockReturnValue(new Promise<void>(done => { resolve = done; }));
  vi.stubGlobal('google', { maps: {
    Map: class { constructor() { mocks.map(); } fitBounds = mocks.fit; },
    Marker: class { constructor(options: unknown) { mocks.marker(options); } setMap = mocks.setMap; addListener = vi.fn(); },
    Polyline: class { setMap = mocks.setMap; },
    InfoWindow: class { close = vi.fn(); setContent = vi.fn(); open = vi.fn(); },
    LatLngBounds: class { extend = vi.fn(); },
    SymbolPath: { CIRCLE: 'circle' }, event: { clearInstanceListeners: mocks.clear },
  } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('Google map asynchronous readiness', () => {
  it('renders preloaded route assignments after Maps becomes ready, including zero coordinates', async () => {
    const assignments = [{ id: 'a', title: 'A', address: 'B', scheduled_start: '2026-09-08T08:00:00Z', status: 'pending', geofence_lat: 0, geofence_lng: 0 }];
    const view = render(<RouteMap assignments={assignments} />);
    expect(mocks.marker).not.toHaveBeenCalled();
    await act(async () => resolve());
    await waitFor(() => expect(mocks.marker).toHaveBeenCalledTimes(1));
    expect(mocks.marker.mock.calls[0][0].position).toEqual({ lat: 0, lng: 0 });
    view.rerender(<RouteMap assignments={[]} />);
    expect(mocks.setMap).toHaveBeenCalledWith(null);
    expect(mocks.clear).toHaveBeenCalled();
  });
  it('renders preloaded live positions when ready and ignores invalid points', async () => {
    render(<LiveMap navigate={vi.fn()} locations={[{ latitude: 0, longitude: 10 }, { latitude: NaN, longitude: 10 }]} />);
    await act(async () => resolve());
    await waitFor(() => expect(mocks.marker).toHaveBeenCalledTimes(1));
    expect(mocks.fit).toHaveBeenCalledTimes(1);
  });
  it('does not initialize a detached map after navigation', async () => {
    const view = render(<RouteMap assignments={[]} />);
    view.unmount();
    await act(async () => resolve());
    expect(mocks.map).not.toHaveBeenCalled();
  });
  it('shows a load error instead of leaving the loading state running', async () => {
    mocks.load.mockRejectedValue(new Error('Offline'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<LiveMap locations={[]} navigate={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Kartan kunde inte laddas');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    log.mockRestore();
  });
});

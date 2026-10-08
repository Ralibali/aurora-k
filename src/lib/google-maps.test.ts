import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } } }));
vi.mock('@googlemaps/js-api-loader', () => ({ setOptions: vi.fn(), importLibrary: vi.fn().mockResolvedValue({}) }));

const load = async () => {
  vi.resetModules();
  return import('./google-maps');
};

beforeEach(() => { invoke.mockReset(); vi.useRealTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('runtime Google Maps configuration', () => {
  it('starts unavailable and becomes available once an admin receives the key', async () => {
    invoke.mockResolvedValue({ data: { configured: true, key: 'k' }, error: null });
    const { useGoogleMapsAvailable } = await load();
    const { result } = renderHook(() => useGoogleMapsAvailable());
    expect(result.current).toBe(false);
    await waitFor(() => expect(result.current).toBe(true));
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('shares one in-flight request between consumers', async () => {
    invoke.mockResolvedValue({ data: { configured: true, key: 'k' }, error: null });
    const { ensureGoogleMapsKey } = await load();
    const [a, b] = await Promise.all([ensureGoogleMapsKey(), ensureGoogleMapsKey()]);
    expect(a).toBe('k');
    expect(b).toBe('k');
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('stays unavailable on failure without retrying immediately, and keeps maps loadable later', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('403') });
    const { ensureGoogleMapsKey, googleMapsAvailable, loadGoogleMaps } = await load();
    expect(await ensureGoogleMapsKey()).toBeNull();
    expect(await ensureGoogleMapsKey()).toBeNull();
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(googleMapsAvailable()).toBe(false);
    await expect(loadGoogleMaps()).rejects.toThrow();
  });

  it('allows a fresh attempt after logout and ignores a stale response from the previous user', async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    invoke.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
    const { ensureGoogleMapsKey, resetGoogleMapsConfig, googleMapsAvailable } = await load();
    const pending = ensureGoogleMapsKey();
    resetGoogleMapsConfig();
    resolveFirst({ data: { configured: true, key: 'stale' }, error: null });
    await pending;
    expect(googleMapsAvailable()).toBe(false);

    invoke.mockResolvedValue({ data: { configured: true, key: 'fresh' }, error: null });
    expect(await ensureGoogleMapsKey()).toBe('fresh');
    expect(googleMapsAvailable()).toBe(true);
  });

  it('explains a missing key while keeping the fallback available', async () => {
    invoke.mockResolvedValue({ data: { configured: false }, error: null });
    const { ensureGoogleMapsKey, googleMapsAvailable, useGoogleMapsFailure } = await load();
    expect(await ensureGoogleMapsKey()).toBeNull();
    expect(googleMapsAvailable()).toBe(false);
    const { result } = renderHook(() => useGoogleMapsFailure());
    expect(result.current).toMatch(/nyckel/i);
  });
});

describe('provider authentication after successful bootstrap', () => {
  it('switches to fallback on a late rejection and sends only its code', async () => {
    invoke.mockResolvedValue({ data: { configured: true, key: 'not-for-logs' }, error: null });
    const maps = await load();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await maps.loadGoogleMaps();
    expect(maps.googleMapsAvailable()).toBe(true);
    console.error('Google Maps JavaScript API error: RefererNotAllowedMapError https://example.test/?key=not-for-logs');
    (window as Window & { gm_authFailure?: () => void }).gm_authFailure?.();
    expect(maps.googleMapsAvailable()).toBe(false);
    const reports = invoke.mock.calls.filter(call => call[1]?.body?.action === 'report-error');
    expect(reports).toEqual([['maps-config', { body: { action: 'report-error', code: 'RefererNotAllowedMapError' } }]]);
    maps.resetGoogleMapsConfig();
    log.mockRestore();
  });
});

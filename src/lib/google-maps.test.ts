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

  it('treats an unconfigured backend as unavailable rather than an error', async () => {
    invoke.mockResolvedValue({ data: { configured: false }, error: null });
    const { ensureGoogleMapsKey, googleMapsAvailable } = await load();
    expect(await ensureGoogleMapsKey()).toBeNull();
    expect(googleMapsAvailable()).toBe(false);
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffectiveDriverSettings } from './useDriverSettings';

const mocks = vi.hoisted(() => ({
  results: {} as Record<string, { data: unknown; error: unknown }>,
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ companyId: 'company-1' }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    const builder = { select: () => builder, limit: () => builder, eq: () => builder, maybeSingle: async () => mocks.results[table] };
    return builder;
  },
} }));

function show(driverId?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook(() => useEffectiveDriverSettings(driverId), {
    wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}
beforeEach(() => {
  mocks.results = { driver_settings: { data: null, error: null }, driver_settings_overrides: { data: null, error: null } };
});
describe('effective settings for a company without a settings row', () => {
  it('uses database defaults after a successful empty result', async () => {
    const { result } = show('driver-1');
    await waitFor(() => expect(result.current.usingDefaults).toBe(true));
    expect(result.current.data).toMatchObject({ require_photo: true, require_signature: true, show_total_hours: true });
    expect(result.current.isError).toBe(false);
  });
  it('preserves a driver override including explicit false', async () => {
    mocks.results.driver_settings_overrides.data = { require_photo: false, require_signature: null };
    const { result } = show('driver-1');
    await waitFor(() => expect(result.current.data?.require_photo).toBe(false));
    expect(result.current.data?.require_signature).toBe(true);
  });
  it('does not turn a network or permissions failure into defaults', async () => {
    mocks.results.driver_settings.error = { code: '42501', message: 'Denied' };
    const { result } = show('driver-1');
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.usingDefaults).toBe(false);
    expect(result.current.data).toBeNull();
  });
  it('retains the error when driver overrides cannot be read', async () => {
    mocks.results.driver_settings_overrides.error = new Error('Offline');
    const { result } = show('driver-1');
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
  it('does not wait for a disabled override query when no driver is selected', async () => {
    const { result } = show();
    await waitFor(() => expect(result.current.usingDefaults).toBe(true));
    expect(result.current.isLoading).toBe(false);
  });
});

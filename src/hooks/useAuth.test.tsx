import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './useAuth';

const mocks = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: unknown) => void),
  getSession: vi.fn(), signOut: vi.fn(), cleanupPush: vi.fn(),
}));
vi.mock('@/lib/push-notifications', () => ({ removeCurrentDevicePushToken: mocks.cleanupPush }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: {
    getSession: mocks.getSession, signOut: mocks.signOut,
    onAuthStateChange: (listener: typeof mocks.listener) => { mocks.listener = listener; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
  },
  rpc: async () => ({ data: false, error: null }),
  from: (table: string) => ({ select: () => ({ eq: (_key: string, id: string) => table === 'user_roles'
    ? Promise.resolve({ data: [{ role: 'admin', company_id: `company-${id}` }], error: null })
    : { maybeSingle: async () => ({ data: { company_id: `company-${id}`, role: 'admin' }, error: null }) } }) }),
} }));
const session = (id: string) => ({ user: { id }, access_token: 'fictional-session' });
function Status() {
  const auth = useAuth();
  return <><p>{auth.loading ? 'Laddar' : auth.user?.id ?? 'Utloggad'}</p><p>{auth.error}</p><button onClick={() => void auth.signOut()}>Avsluta</button></>;
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AuthProvider><Status /></AuthProvider></QueryClientProvider>);
  return client;
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.listener = null;
  mocks.getSession.mockResolvedValue({ data: { session: session('A') }, error: null });
  mocks.signOut.mockResolvedValue({ error: null }); mocks.cleanupPush.mockResolvedValue(undefined);
});
afterEach(cleanup);
describe('account session isolation', () => {
  it('clears cached company records on account switch and remote sign out', async () => {
    const client = mount();
    await screen.findByText('A');
    client.setQueryData(['assignments', 'private-job'], { customer: 'Company A' });
    act(() => mocks.listener?.('SIGNED_IN', session('B')));
    await screen.findByText('B');
    expect(client.getQueryData(['assignments', 'private-job'])).toBeUndefined();
    client.setQueryData(['next_invoice_number'], 42);
    act(() => mocks.listener?.('SIGNED_OUT', null));
    await screen.findByText('Utloggad');
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
  it('keeps current account data on a routine token refresh', async () => {
    const client = mount(); await screen.findByText('A');
    client.setQueryData(['assignments', 'private-job'], { id: 'job' });
    act(() => mocks.listener?.('TOKEN_REFRESHED', session('A')));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    expect(client.getQueryData(['assignments', 'private-job'])).toEqual({ id: 'job' });
  });
  it('ends the loader when reading the saved session throws', async () => {
    mocks.getSession.mockRejectedValue(new TypeError('offline'));
    mount();
    expect(await screen.findByText('Inloggningen kunde inte läsas. Försök igen.')).toBeInTheDocument();
    expect(screen.queryByText('Laddar')).not.toBeInTheDocument();
  });
  it('still signs out when native push cleanup fails', async () => {
    mocks.cleanupPush.mockRejectedValue(new Error('native device unavailable'));
    const client = mount(); await screen.findByText('A');
    client.setQueryData(['next_invoice_number'], 42);
    act(() => screen.getByRole('button', { name: 'Avsluta' }).click());
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalled());
    await screen.findByText('Utloggad');
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});

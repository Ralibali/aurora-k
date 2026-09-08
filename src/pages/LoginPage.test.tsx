import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './LoginPage';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const mocks = vi.hoisted(() => ({
  auth: { session: null as null | { user: { user_metadata: object } }, role: 'driver' as 'driver' | null, companyId: 'company', isPlatformAdmin: false, loading: false, error: null },
  signIn: vi.fn(), error: vi.fn(), success: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ ...mocks.auth, refreshProfile: vi.fn() }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signInWithPassword: mocks.signIn } } }));
vi.mock('@/lib/use-page-meta', () => ({ usePageMeta: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success } }));
const app = (entry: string) => <MemoryRouter initialEntries={[entry]}><Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/driver/assignments/job" element={<ProtectedRoute requiredRole="driver"><h1>Rätt uppdrag</h1></ProtectedRoute>} />
  <Route path="/driver" element={<h1>Föraröversikt</h1>} />
  <Route path="/platform" element={<h1>Plattform</h1>} />
</Routes></MemoryRouter>;
beforeEach(() => { cleanup(); vi.clearAllMocks(); mocks.auth.session = null; mocks.auth.role = 'driver'; mocks.auth.isPlatformAdmin = false; });
describe('login recovery', () => {
  it('returns to the requested assignment once login completes', async () => {
    const view = render(app('/driver/assignments/job'));
    expect(await screen.findByRole('button', { name: 'Logga in' })).toBeInTheDocument();
    mocks.auth.session = { user: { user_metadata: {} } };
    view.rerender(app('/driver/assignments/job'));
    expect(await screen.findByRole('heading', { name: 'Rätt uppdrag' })).toBeInTheDocument();
  });
  it('restores the form after a network exception and permits another attempt', async () => {
    mocks.signIn.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ error: null });
    render(app('/login'));
    fireEvent.change(screen.getByLabelText('E-post'), { target: { value: 'driver@example.test' } });
    fireEvent.change(screen.getByLabelText('Lösenord'), { target: { value: 'fictional-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Logga in' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    const retry = screen.getByRole('button', { name: 'Logga in' });
    expect(retry).toBeEnabled();
    fireEvent.click(retry);
    await waitFor(() => expect(mocks.success).toHaveBeenCalledWith('Välkommen!'));
    expect(mocks.signIn).toHaveBeenCalledTimes(2);
  });
  it('admits a platform administrator without a company role', async () => {
    mocks.auth.session = { user: { user_metadata: {} } }; mocks.auth.role = null; mocks.auth.isPlatformAdmin = true;
    render(app('/login'));
    expect(await screen.findByRole('heading', { name: 'Plattform' })).toBeInTheDocument();
  });
});

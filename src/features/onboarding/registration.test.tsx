import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RegisterPage from '@/pages/RegisterPage';

const mocks = vi.hoisted(() => ({ signUp: vi.fn(), invoke: vi.fn(), refreshProfile: vi.fn(), auth: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: mocks.auth }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signUp: mocks.signUp, resend: vi.fn() }, functions: { invoke: mocks.invoke } } }));
vi.mock('@/lib/use-page-meta', () => ({ usePageMeta: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ trackEventOnce: vi.fn() }));
const draft = { companyName: 'Pilot Åkeri', orgNr: '556123-4567', fullName: 'Anna Test', phone: '0701234567' };
const session = { access_token: 'confirmed-user-token', user: { id: 'user-1', email: 'anna@example.com', user_metadata: { company_registration: draft } } };
const renderRegistration = (entry = '/register') => render(<MemoryRouter initialEntries={[entry]}><Routes><Route path="/register" element={<RegisterPage />} /><Route path="/onboarding" element={<div>Onboarding ready</div>} /><Route path="/admin" element={<div>Admin ready</div>} /></Routes></MemoryRouter>);
function fillRegistration() {
  fireEvent.change(screen.getByLabelText('Företagsnamn *'), { target: { value: draft.companyName } });
  fireEvent.change(screen.getByLabelText('Organisationsnummer *'), { target: { value: draft.orgNr } });
  fireEvent.change(screen.getByLabelText('Ditt namn *'), { target: { value: draft.fullName } });
  fireEvent.change(screen.getByLabelText('Telefonnummer *'), { target: { value: draft.phone } });
  fireEvent.change(screen.getByLabelText('E-postadress *'), { target: { value: session.user.email } });
  fireEvent.change(screen.getByLabelText('Lösenord *'), { target: { value: 'TestPassword123' } });
  fireEvent.change(screen.getByLabelText('Bekräfta lösenord *'), { target: { value: 'TestPassword123' } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockReturnValue({ session: null, role: null, companyId: null, loading: false, refreshProfile: mocks.refreshProfile });
  mocks.refreshProfile.mockResolvedValue({ role: 'admin', companyId: 'company-1' });
  mocks.invoke.mockImplementation(async (name: string) => ({ data: name === 'auth-email' ? { accepted: true } : { companyId: 'company-1' }, error: null }));
});

describe('company registration lifecycle', () => {
  it('waits for email confirmation and never calls authenticated bootstrap without a session', async () => {
    renderRegistration(); fillRegistration();
    fireEvent.click(screen.getByRole('button', { name: 'Starta gratis provperiod' }));
    await screen.findByRole('heading', { name: 'Bekräfta din e-post' });
    expect(mocks.invoke).toHaveBeenCalledWith('auth-email', { body: { type: 'signup', email: session.user.email, password: 'TestPassword123', registration: draft } });
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.signUp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Skicka mejlet igen' }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenLastCalledWith('auth-email', { body: { type: 'resend', email: session.user.email } }));
  });

  it('resumes confirmed registration on another device using account metadata, then refreshes membership', async () => {
    mocks.auth.mockReturnValue({ session, role: null, companyId: null, loading: false, refreshProfile: mocks.refreshProfile });
    renderRegistration('/register?confirmed=1');
    await screen.findByText('Onboarding ready');
    expect(mocks.invoke).toHaveBeenCalledWith('register-company', { headers: { Authorization: 'Bearer confirmed-user-token' }, body: draft });
    expect(mocks.refreshProfile).toHaveBeenCalledOnce();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('retains a signed-in account after bootstrap failure and retries without a second signup', async () => {
    mocks.auth.mockReturnValue({ session, role: null, companyId: null, loading: false, refreshProfile: mocks.refreshProfile });
    mocks.invoke.mockResolvedValueOnce({ data: null, error: new Error('network') });
    renderRegistration('/register?confirmed=1');
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Starta gratis provperiod' }));
    await screen.findByText('Onboarding ready');
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('does not enter onboarding when profile refresh cannot confirm company membership', async () => {
    mocks.auth.mockReturnValue({ session, role: null, companyId: null, loading: false, refreshProfile: mocks.refreshProfile });
    mocks.refreshProfile.mockResolvedValue({ role: null, companyId: null });
    renderRegistration('/register?confirmed=1');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Företagskopplingen kunde inte bekräftas'));
    expect(screen.queryByText('Onboarding ready')).not.toBeInTheDocument();
  });
});

import { useEffect, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Outlet } from 'react-router-dom';
import NativeApp from '@/NativeApp';
import { acceptContentPolicy, readContentPolicyAcceptance } from './content-policy';

const mocks = vi.hoisted(() => ({
  auth: { id: 'driver-one' as string | null, role: 'driver' as 'driver' | 'admin', loading: false },
  signOut: vi.fn(), runtimeMounted: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth: () => ({
    user: mocks.auth.id ? { id: mocks.auth.id } : null,
    session: mocks.auth.id ? { user: { id: mocks.auth.id, user_metadata: {} } } : null,
    role: mocks.auth.role, loading: mocks.auth.loading, error: null, signOut: mocks.signOut,
  }),
}));
vi.mock('@/lib/driver-app', () => ({ isDriverApp: true }));
vi.mock('@/features/onboarding/registration-service', () => ({ getRegistrationDraft: () => null }));
vi.mock('@/components/NativeAppRuntime', () => ({ NativeAppRuntime: () => null }));
vi.mock('@/components/DriverPushNotifications', () => ({ DriverPushNotifications: () => null }));
vi.mock('@/components/ui/sonner', () => ({ Toaster: () => null }));
vi.mock('@/components/ui/toaster', () => ({ Toaster: () => null }));
vi.mock('@/components/DriverLayout', () => ({ DriverLayout: function Layout() {
  useEffect(() => { mocks.runtimeMounted(); }, []);
  return <div data-testid="driver-runtime"><Outlet /></div>;
} }));
vi.mock('@/pages/LoginPage', () => ({ default: () => <h1>Inloggning</h1> }));
vi.mock('@/pages/ForgotPasswordPage', () => ({ default: () => <h1>Återställ lösenord</h1> }));
vi.mock('@/pages/PrivacyPage', () => ({ default: () => <h1>Integritetspolicy</h1> }));
vi.mock('@/pages/driver/DriverAssignments', () => ({ default: () => <h1>Uppdragslista</h1> }));
vi.mock('@/pages/driver/DriverAssignmentDetail', () => ({ default: () => <h1>Leveransbevis och kommentarer</h1> }));
vi.mock('@/pages/driver/DriverProfile', () => ({ default: () => <h1>Profil och rapportering</h1> }));
vi.mock('@/pages/driver/DriverTimeReport', () => ({ default: () => <h1>Tidrapport</h1> }));

function open(path = '/driver/assignments/job') {
  window.history.replaceState({}, '', path);
  return render(<NativeApp />);
}

function agree() {
  fireEvent.click(screen.getByRole('checkbox', { name: 'Jag har läst och godkänner reglerna för innehåll.' }));
  fireEvent.click(screen.getByRole('button', { name: 'Godkänn och fortsätt' }));
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  window.localStorage.clear();
  // jsdom omits this browser API, which Radix uses only to size its hidden input.
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  mocks.auth.id = 'driver-one';
  mocks.auth.role = 'driver';
  mocks.auth.loading = false;
  mocks.signOut.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('native content policy protection', () => {
  it.each([
    ['/driver/assignments/job', 'Leveransbevis och kommentarer'],
    ['/driver/assignment/job', 'Leveransbevis och kommentarer'],
    ['/driver/time-report', 'Tidrapport'],
    ['/driver/profile', 'Profil och rapportering'],
  ])('blocks a direct link to %s and all layout upload runtimes before active acceptance', async (path, heading) => {
    open(path);
    expect(await screen.findByRole('heading', { name: 'Regler för innehåll' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Godkänn och fortsätt' })).toBeDisabled();
    expect(screen.queryByTestId('driver-runtime')).not.toBeInTheDocument();
    expect(mocks.runtimeMounted).not.toHaveBeenCalled();
    agree();
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(mocks.runtimeMounted).toHaveBeenCalledTimes(1);
    expect(readContentPolicyAcceptance('driver-one')).toBe('accepted');
    expect(window.location.pathname).toBe(path);
  });

  it('keeps the current account acceptance across app launches but does not pass it to another account', async () => {
    expect(acceptContentPolicy('driver-one')).toBe(true);
    const view = open();
    expect(await screen.findByRole('heading', { name: 'Leveransbevis och kommentarer' })).toBeInTheDocument();
    mocks.auth.id = 'driver-two';
    view.rerender(<NativeApp />);
    expect(await screen.findByRole('heading', { name: 'Regler för innehåll' })).toBeInTheDocument();
    expect(screen.queryByTestId('driver-runtime')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(readContentPolicyAcceptance('driver-two')).toBe('required');
  });

  it('resets an unsubmitted checkbox when accounts change', async () => {
    const view = open();
    fireEvent.click(await screen.findByRole('checkbox'));
    mocks.auth.id = 'driver-two';
    view.rerender(<NativeApp />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Godkänn och fortsätt' })).toBeDisabled();
  });

  it('requires acceptance of the current version despite an older version or another account record', async () => {
    window.localStorage.setItem('aurora:content-policy:driver-one:previous-version', 'accepted');
    acceptContentPolicy('driver-two');
    open();
    expect(await screen.findByRole('checkbox')).not.toBeChecked();
    expect(mocks.runtimeMounted).not.toHaveBeenCalled();
    expect(readContentPolicyAcceptance('')).toBe('required');
    expect(acceptContentPolicy('')).toBe(false);
  });

  it('stays blocked when the write fails and lets the same account retry after storage recovers', async () => {
    open();
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    agree();
    expect(await screen.findByRole('alert')).toHaveTextContent('Godkännandet kunde inte sparas');
    expect(mocks.runtimeMounted).not.toHaveBeenCalled();
    write.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Godkänn och fortsätt' }));
    expect(await screen.findByRole('heading', { name: 'Leveransbevis och kommentarer' })).toBeInTheDocument();
  });

  it('does not unlock when a storage write silently does nothing', async () => {
    open();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});
    agree();
    expect(await screen.findByRole('alert')).toHaveTextContent('Godkännandet kunde inte sparas');
    expect(mocks.runtimeMounted).not.toHaveBeenCalled();
  });

  it('makes an unreadable acceptance record an explicit recoverable block', async () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Unavailable', 'SecurityError'); });
    open();
    expect(await screen.findByRole('alert')).toHaveTextContent('Mobilens lagring kunde inte läsas');
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(mocks.runtimeMounted).not.toHaveBeenCalled();
    read.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Försök läsa igen' }));
    expect(screen.getByRole('checkbox')).toBeEnabled();
    agree();
    expect(await screen.findByRole('heading', { name: 'Leveransbevis och kommentarer' })).toBeInTheDocument();
  });

  it('rechecks stored acceptance after returning to the app', async () => {
    acceptContentPolicy('driver-one');
    open();
    expect(await screen.findByTestId('driver-runtime')).toBeInTheDocument();
    window.localStorage.clear();
    fireEvent(document, new Event('visibilitychange'));
    expect(await screen.findByRole('heading', { name: 'Regler för innehåll' })).toBeInTheDocument();
    expect(screen.queryByTestId('driver-runtime')).not.toBeInTheDocument();
  });

  it('keeps sign out available without agreement and shows a sign-out failure', async () => {
    mocks.signOut.mockRejectedValueOnce(new Error('Network unavailable'));
    open();
    fireEvent.click(await screen.findByRole('button', { name: 'Logga ut' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Det gick inte att logga ut');
    expect(screen.getByRole('button', { name: 'Logga ut' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Logga ut' }));
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(2));
    expect(mocks.runtimeMounted).not.toHaveBeenCalled();
  });

  it.each(['/content-policy', '/driver/content-policy'])('allows reading %s without acceptance or mounting upload runtimes', async path => {
    open(path);
    expect(await screen.findByRole('heading', { name: 'Regler för innehåll' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(mocks.runtimeMounted).not.toHaveBeenCalled();
    expect(readContentPolicyAcceptance('driver-one')).toBe('required');
  });

  it('allows logged-out users to read the public policy', async () => {
    mocks.auth.id = null;
    open('/content-policy');
    expect(await screen.findByRole('heading', { name: 'Regler för innehåll' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tillbaka' })).toHaveAttribute('href', '/login');
    expect(mocks.runtimeMounted).not.toHaveBeenCalled();
  });

  it('still rejects an administrator even when that account has saved acceptance', async () => {
    mocks.auth.role = 'admin';
    acceptContentPolicy('driver-one');
    open();
    expect(await screen.findByRole('heading', { name: 'Inloggning' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(mocks.runtimeMounted).not.toHaveBeenCalled();
  });
});

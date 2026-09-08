import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AuthConfirmationPage from './AuthConfirmationPage';

const mocks = vi.hoisted(() => ({ verifyOtp: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { verifyOtp: mocks.verifyOtp } } }));
vi.mock('@/lib/use-page-meta', () => ({ usePageMeta: () => {} }));
const token = 'TOKEN_HASH_0123456789';
const success = { data: { session: { access_token: 'access-token', user: { id: 'user-1' } } }, error: null };
const link = (type = 'signup', hash = token) => `/auth/confirm#token_hash=${hash}&type=${type}`;
function Navigation() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(link('recovery', 'DIFFERENT_TOKEN_HASH_987654'))}>Öppna annan länk</button>;
}
function show(path = link()) {
  window.history.replaceState(null, '', path);
  return render(<BrowserRouter><Navigation /><Routes>
    <Route path="/auth/confirm" element={<AuthConfirmationPage />} />
    <Route path="/register" element={<h1>Registrering</h1>} />
    <Route path="/reset-password" element={<h1>Lösenordsbyte</h1>} />
    <Route path="/login" element={<h1>Inloggning</h1>} />
  </Routes></BrowserRouter>);
}

beforeEach(() => { mocks.verifyOtp.mockReset().mockResolvedValue(success); });
afterEach(() => { cleanup(); window.history.replaceState(null, '', '/'); });

describe('auth email confirmation', () => {
  it('consumes the actual HTML bootstrap after it has removed the URL fragment', async () => {
    vi.resetModules();
    window.history.replaceState(null, '', link('recovery'));
    const document = new DOMParser().parseFromString(readFileSync(resolve(process.cwd(), 'index.html'), 'utf8'), 'text/html');
    const bootstrap = document.querySelector('#aurora-auth-confirmation-bootstrap')!.textContent!;
    new Function('window', bootstrap)(window);
    expect(window.location.hash).toBe('');
    expect(Object.prototype.hasOwnProperty.call(window, '__auroraTakeAuthConfirmation')).toBe(true);
    const { default: FreshConfirmationPage } = await import('./AuthConfirmationPage');
    expect(Object.prototype.hasOwnProperty.call(window, '__auroraTakeAuthConfirmation')).toBe(false);
    render(<BrowserRouter><Routes>
      <Route path="/auth/confirm" element={<FreshConfirmationPage />} />
      <Route path="/reset-password" element={<h1>Lösenordsbyte</h1>} />
    </Routes></BrowserRouter>);
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Fortsätt till lösenordsbyte' }));
    expect(await screen.findByRole('heading', { name: 'Lösenordsbyte' })).toBeInTheDocument();
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: token, type: 'recovery' });
  });

  it('scrubs a fresh email URL at module load and retains its token until the confirmation click', async () => {
    vi.resetModules();
    window.history.replaceState(null, '', link('recovery'));
    const { default: FreshConfirmationPage } = await import('./AuthConfirmationPage');
    expect(window.location.hash).toBe('');
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    render(<BrowserRouter><Routes>
      <Route path="/auth/confirm" element={<FreshConfirmationPage />} />
      <Route path="/reset-password" element={<h1>Lösenordsbyte</h1>} />
    </Routes></BrowserRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Fortsätt till lösenordsbyte' }));
    expect(await screen.findByRole('heading', { name: 'Lösenordsbyte' })).toBeInTheDocument();
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: token, type: 'recovery' });
  });

  it.each([['signup', 'Bekräfta e-post och fortsätt', 'Registrering', '/register?confirmed=1'], ['recovery', 'Fortsätt till lösenordsbyte', 'Lösenordsbyte', '/reset-password']])('requires an explicit click and establishes %s before a fixed local destination', async (type, button, destination, path) => {
    show(`${link(type)}&redirect_to=https://evil.test&next=https://evil.test`);
    expect(window.location.hash).toBe('');
    expect(window.location.search).toBe('');
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: button }));
    expect(await screen.findByRole('heading', { name: destination })).toBeInTheDocument();
    expect(mocks.verifyOtp).toHaveBeenCalledExactlyOnceWith({ token_hash: token, type });
    expect(window.location.pathname + window.location.search).toBe(path);
    expect(window.location.href).not.toContain(token);
  });

  it.each(['/auth/confirm', '/auth/confirm?token_hash=TOKEN_HASH_0123456789&type=signup', link('invite'), link('signup', 'short'), `${link()}&token_hash=SECOND_TOKEN_HASH`, `${link()}&type=recovery`])('rejects missing, query-string, ambiguous or unsupported tokens: %s', path => {
    show(path);
    expect(screen.getByRole('alert')).toHaveTextContent('Länken saknas eller är ogiltig');
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(window.location.hash + window.location.search).toBe('');
    expect(screen.queryByRole('button', { name: 'Bekräfta e-post och fortsätt' })).not.toBeInTheDocument();
  });

  it('can leave before confirmation without consuming the token', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Tillbaka till inloggning' }));
    expect(await screen.findByRole('heading', { name: 'Inloggning' })).toBeInTheDocument();
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it('does not accept a user-only response or expose provider error details', async () => {
    mocks.verifyOtp.mockResolvedValueOnce({ data: { session: null, user: { id: 'user-1' } }, error: null });
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Bekräfta e-post och fortsätt' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Länken kunde inte bekräftas');
    expect(window.location.pathname).toBe('/auth/confirm');
    mocks.verifyOtp.mockResolvedValueOnce({ data: { session: null }, error: { message: `secret ${token}` } });
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }));
    await waitFor(() => expect(mocks.verifyOtp).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('alert')).not.toHaveTextContent(token);
  });

  it('recovers from a network rejection without concurrent verification requests', async () => {
    let reject!: (cause: Error) => void;
    mocks.verifyOtp.mockImplementationOnce(() => new Promise((_resolve, no) => { reject = no; }));
    show();
    const button = screen.getByRole('button', { name: 'Bekräfta e-post och fortsätt' });
    fireEvent.click(button); fireEvent.click(button);
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Bekräftar…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tillbaka till inloggning' })).toBeDisabled();
    await act(async () => reject(new Error(`network details ${token}`)));
    expect(screen.getByRole('alert')).toHaveTextContent('Det gick inte att ansluta');
    expect(screen.getByRole('alert')).not.toHaveTextContent(token);
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }));
    expect(await screen.findByRole('heading', { name: 'Registrering' })).toBeInTheDocument();
    expect(mocks.verifyOtp).toHaveBeenCalledTimes(2);
  });

  it('ignores a late result after unmount', async () => {
    let resolve!: (value: typeof success) => void;
    mocks.verifyOtp.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const view = show();
    fireEvent.click(screen.getByRole('button', { name: 'Bekräfta e-post och fortsätt' }));
    view.unmount();
    window.history.replaceState(null, '', '/login');
    await act(async () => resolve(success));
    expect(window.location.pathname).toBe('/login');
  });

  it('does not navigate using an older link when a new link arrives during verification', async () => {
    let resolve!: (value: typeof success) => void;
    mocks.verifyOtp.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Bekräfta e-post och fortsätt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Öppna annan länk' }));
    await act(async () => resolve(success));
    expect(window.location.pathname).toBe('/auth/confirm');
    fireEvent.click(screen.getByRole('button', { name: 'Fortsätt till lösenordsbyte' }));
    expect(await screen.findByRole('heading', { name: 'Lösenordsbyte' })).toBeInTheDocument();
    expect(mocks.verifyOtp).toHaveBeenLastCalledWith({ token_hash: 'DIFFERENT_TOKEN_HASH_987654', type: 'recovery' });
  });
});

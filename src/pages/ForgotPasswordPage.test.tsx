import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ForgotPasswordPage from './ForgotPasswordPage';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), error: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock('@/lib/use-page-meta', () => ({ usePageMeta: vi.fn() }));
vi.mock('sonner', () => ({ toast: { error: mocks.error } }));
beforeEach(() => { vi.clearAllMocks(); mocks.invoke.mockResolvedValue({ data: { accepted: true }, error: null }); });
describe('password recovery request', () => {
  it('requests the controlled auth-email endpoint and displays an account-neutral response', async () => {
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('E-post'), { target: { value: 'Anna@Example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka återställningslänk' }));
    await screen.findByText(/Om kontot finns/);
    expect(mocks.invoke).toHaveBeenCalledWith('auth-email', { body: { type: 'recovery', email: 'anna@example.com' } });
  });
  it('keeps the form retryable when the endpoint cannot accept the request', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: new Error('network failure') });
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('E-post'), { target: { value: 'anna@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka återställningslänk' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledOnce());
    expect(screen.getByRole('button', { name: 'Skicka återställningslänk' })).toBeEnabled();
    expect(screen.queryByText(/Om kontot finns/)).not.toBeInTheDocument();
  });
});

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PortalChat } from './PortalChat';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), notify: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: (name: string, args: unknown) => ({ abortSignal: () => mocks.rpc(name, args) }) } }));
vi.mock('@/lib/supabase-url', () => ({ fetchSupabaseFunction: (...args: unknown[]) => mocks.notify(...args) }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), warning: vi.fn() } }));
const message = (id: string, text: string) => ({ id, message: text, sender_type: 'admin', sender_name: 'Kontoret', created_at: '2026-09-08T08:00:00Z' });
beforeEach(() => {
  mocks.rpc.mockReset().mockResolvedValue({ data: [], error: null });
  mocks.notify.mockReset().mockResolvedValue({ success: true });
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('anonymous portal chat', () => {
  it('refetches the saved message without relying on anonymous Realtime', async () => {
    let sent = false;
    mocks.rpc.mockImplementation(async name => name === 'send_portal_message' ? (sent = true, { data: 'saved-id', error: null }) : { data: sent ? [message('saved-id', 'Leverera imorgon')] : [], error: null });
    render(<PortalChat token="token-a" customerName="Kund A" />);
    await screen.findByText(/Inga meddelanden ännu/);
    fireEvent.change(screen.getByRole('textbox', { name: 'Meddelande' }), { target: { value: 'Leverera imorgon' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka meddelande' }));
    expect(await screen.findByText('Leverera imorgon')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Meddelande' })).toHaveValue('');
    expect(mocks.rpc).toHaveBeenCalledWith('send_portal_message', { p_token: 'token-a', p_message: 'Leverera imorgon', p_sender_name: 'Kund A' });
  });
  it('never displays a late response belonging to the previous portal token', async () => {
    let oldResponse!: (value: unknown) => void;
    mocks.rpc.mockImplementation((_name, args) => args.p_token === 'token-a' ? new Promise(resolve => { oldResponse = resolve; }) : Promise.resolve({ data: [message('b', 'B-kundens meddelande')], error: null }));
    const view = render(<PortalChat token="token-a" customerName="A" />);
    view.rerender(<PortalChat token="token-b" customerName="B" />);
    expect(await screen.findByText('B-kundens meddelande')).toBeInTheDocument();
    await act(async () => oldResponse({ data: [message('a', 'A-kundens hemlighet')], error: null }));
    expect(screen.queryByText('A-kundens hemlighet')).not.toBeInTheDocument();
    expect(screen.getByText('B-kundens meddelande')).toBeInTheDocument();
  });
  it('polls the token RPC for new admin replies', async () => {
    vi.useFakeTimers();
    mocks.rpc.mockResolvedValueOnce({ data: [], error: null }).mockResolvedValue({ data: [message('reply', 'Vi kommer kl 10')], error: null });
    render(<PortalChat token="token-a" customerName="A" />);
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(screen.getByText('Vi kommer kl 10')).toBeInTheDocument();
    expect(mocks.rpc).toHaveBeenLastCalledWith('get_portal_messages', { p_token: 'token-a' });
  });
  it('shows read and write failures and preserves the unsent draft', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('Network failed') });
    render(<PortalChat token="token-a" customerName="A" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Kunde inte hämta meddelanden');
    fireEvent.change(screen.getByRole('textbox', { name: 'Meddelande' }), { target: { value: 'Spara detta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka meddelande' }));
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
    expect(screen.getByRole('textbox', { name: 'Meddelande' })).toHaveValue('Spara detta');
    expect(screen.getByRole('button', { name: 'Skicka meddelande' })).toBeEnabled();
  });
});

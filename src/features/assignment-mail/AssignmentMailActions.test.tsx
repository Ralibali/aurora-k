import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssignmentMailActions } from './AssignmentMailActions';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), success: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock('sonner', () => ({ toast: { success: mocks.success } }));
beforeEach(() => { vi.clearAllMocks(); });
const open = () => { render(<AssignmentMailActions assignmentId="job" customerEmail="customer@example.test" />); fireEvent.click(screen.getByRole('button', { name: 'Dela' })); fireEvent.change(screen.getByLabelText('Mottagarens e-post'), { target: { value: 'receiver@example.test' } }); };
describe('assignment email UI', () => {
  it('keeps the draft and request ID when retrying, and rejects legacy pretend success', async () => {
    mocks.invoke.mockResolvedValueOnce({ data: { success: true }, error: null }).mockResolvedValueOnce({ data: { success: true, id: 'mail-1', recipient: 'receiver@example.test' }, error: null });
    open();
    fireEvent.change(screen.getByLabelText('Meddelande (valfritt)'), { target: { value: 'Behåll mitt meddelande' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka mejl' }));
    await screen.findByRole('alert');
    expect(mocks.success).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Meddelande (valfritt)')).toHaveValue('Behåll mitt meddelande');
    fireEvent.click(screen.getByRole('button', { name: 'Försök skicka igen' }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    expect(mocks.invoke.mock.calls[0][1].body.request_id).toBe(mocks.invoke.mock.calls[1][1].body.request_id);
  });
  it('locks submission while waiting for the provider', async () => {
    mocks.invoke.mockReturnValue(new Promise(() => {}));
    open();
    const form = screen.getByRole('button', { name: 'Skicka mejl' }).closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(mocks.invoke).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Skickar…' })).toBeDisabled();
  });
  it('shows the customer recipient before sending and blocks missing addresses', () => {
    render(<AssignmentMailActions assignmentId="job" />);
    fireEvent.click(screen.getByRole('button', { name: 'Avisera' }));
    expect(screen.getByRole('button', { name: 'Skicka mejl' })).toBeDisabled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});

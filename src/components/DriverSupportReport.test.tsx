import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import DriverSupportReport from './DriverSupportReport';

const rpc = vi.hoisted(() => vi.fn());
vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc } }));
beforeEach(() => { rpc.mockReset(); });

describe('global driver support report', () => {
  it('sends only message and operation id to the bounded support RPC, without requiring a job', async () => {
    rpc.mockResolvedValue({ data: 'ticket-id', error: null });
    render(<DriverSupportReport />);
    expect(screen.getByText(/Företagets administratörer kan också se ärendet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rapportera problem' }));
    expect(screen.queryByRole('option', { name: 'Problem med uppdraget' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Beskriv det olämpliga innehållet'), { target: { value: 'Hotfull text i appen' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka rapport' }));
    await screen.findByText('Rapporten har skickats till Aurora-support.');
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('report_driver_support_ticket', {
      p_message: '[Rapport: Olämpligt innehåll]\nHotfull text i appen',
      p_operation_id: expect.any(String),
    });
  });

  it.each([
    { data: null, error: { message: 'Denied' } },
    { data: null, error: null },
  ])('never reports success when the server did not confirm the ticket', async response => {
    rpc.mockResolvedValue(response);
    render(<DriverSupportReport />);
    fireEvent.click(screen.getByRole('button', { name: 'Rapportera problem' }));
    const input = screen.getByLabelText('Beskriv det olämpliga innehållet');
    fireEvent.change(input, { target: { value: 'Min rapport' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka rapport' }));
    await screen.findByRole('alert');
    expect(input).toHaveValue('Min rapport');
    expect(screen.queryByText('Rapporten har skickats till Aurora-support.')).not.toBeInTheDocument();
  });
});

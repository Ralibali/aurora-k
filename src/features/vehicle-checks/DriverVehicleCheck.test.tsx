import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DriverVehicleCheck } from './DriverVehicleCheck';
const mock = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('./use-vehicle-checks', () => ({
  useVehicleChecks: () => ({ data: [], isLoading: false, isError: false }),
  useChangeVehicleCheck: () => ({ mutateAsync: mock.mutate, isPending: false }),
}));
beforeEach(() => mock.mutate.mockReset());
describe('driver vehicle reports', () => {
  it('reports a critical issue without checked answers, preserves failed input and retries without another id', async () => {
    mock.mutate.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
    render(<DriverVehicleCheck assignmentId="assignment-a" vehicleId="vehicle-a" vehicleName="Testfordon" canReport />);
    fireEvent.click(screen.getByRole('button', { name: 'Kontrollera före körning' }));
    fireEvent.click(screen.getByLabelText('Säkerhetskritisk avvikelse'));
    fireEvent.change(screen.getByLabelText('Beskriv avvikelsen'), { target: { value: 'Däck skadat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Spara fordonskontroll' }));
    expect(mock.mutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Bekräfta rapport' }));
    await waitFor(() => expect(mock.mutate).toHaveBeenCalledTimes(1));
    expect(mock.mutate.mock.calls[0][0]).toMatchObject({ type: 'report', assignmentId: 'assignment-a', answers: { tires: 'not_checked', lights: 'not_checked', damage: 'not_checked', safetyCritical: true, note: 'Däck skadat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bekräfta rapport' }));
    await waitFor(() => expect(mock.mutate).toHaveBeenCalledTimes(2));
    expect(mock.mutate.mock.calls[1][0].operationId).toBe(mock.mutate.mock.calls[0][0].operationId);
    await waitFor(() => expect(screen.queryByLabelText('Beskriv avvikelsen')).not.toBeInTheDocument());
  });
});
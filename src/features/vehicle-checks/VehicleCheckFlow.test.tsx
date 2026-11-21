import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { DriverVehicleCheck } from './DriverVehicleCheck';
import { AdminVehicleChecks } from './AdminVehicleChecks';
import type { VehicleCheck } from './vehicle-check';

const fixture = vi.hoisted(() => ({
  userId: 'driver-a', rows: [] as VehicleCheck[], rpc: vi.fn(),
  from: vi.fn((_table: string) => ({ select: () => ({ eq: () => ({ order: async () => ({ data: [...fixture.rows], error: null }) }) }) })),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ companyId: 'company-a', user: { id: fixture.userId } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: fixture.from, rpc: fixture.rpc } }));

// Exercise both UIs and the real query/mutation hooks. PostgreSQL authorization,
// immutable reports and assignment timestamps are covered by vehicle-checks-db.test.ts.
it('keeps the driver observation in history after an admin confirms its resolution', async () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  // JSDOM has no layout scrolling; Radix Select calls this browser API on focus.
  HTMLElement.prototype.scrollIntoView = vi.fn();
  fixture.userId = 'driver-a'; fixture.rows = []; fixture.rpc.mockReset(); fixture.from.mockClear();
  fixture.rpc.mockImplementation(async (name: string, args: Record<string, string | boolean>) => {
    if (name === 'report_vehicle_check') {
      const row: VehicleCheck = {
        id: 'check-a', company_id: 'company-a', assignment_id: String(args.p_assignment_id), vehicle_id: 'vehicle-a',
        reported_by: fixture.userId, tires: 'not_checked', lights: 'not_checked', damage: 'not_checked',
        safety_critical: true, note: String(args.p_note), status: 'open', created_at: '2026-11-21T09:00:00Z',
        resolution: null, resolved_at: null, resolved_by: null,
      };
      fixture.rows = [row]; return { data: row, error: null };
    }
    if (name === 'resolve_vehicle_check') {
      fixture.rows = fixture.rows.map(row => ({ ...row, status: 'resolved', resolution: String(args.p_resolution),
        resolved_at: '2026-11-21T09:30:00Z', resolved_by: fixture.userId }));
      return { data: fixture.rows[0], error: null };
    }
    throw new Error(`Unexpected RPC: ${name}`);
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const driver = <DriverVehicleCheck assignmentId="assignment-a" vehicleId="vehicle-a" vehicleName="Testfordon" canReport />;
  const view = render(<QueryClientProvider client={client}>{driver}</QueryClientProvider>);
  await screen.findByText('Inga egna kontroller för fordonet.');
  fireEvent.click(screen.getByRole('button', { name: 'Kontrollera före körning' }));
  fireEvent.click(screen.getByLabelText('Säkerhetskritisk avvikelse'));
  fireEvent.change(screen.getByLabelText('Beskriv avvikelsen'), { target: { value: 'Däck skadat – kontaktar arbetsledningen.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Spara fordonskontroll' }));
  expect(fixture.rpc).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Bekräfta rapport' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await screen.findByText('Öppen avvikelse');
  const original = { ...fixture.rows[0] };

  fixture.userId = 'admin-a';
  view.rerender(<QueryClientProvider client={client}><AdminVehicleChecks vehicles={[{ id: 'vehicle-a', name: 'Testfordon', registration_number: null }]} /></QueryClientProvider>);
  await screen.findByText(original.note);
  fireEvent.click(screen.getByRole('button', { name: 'Registrera åtgärd' }));
  fireEvent.change(screen.getByLabelText('Utförd åtgärd'), { target: { value: 'Fordonet taget ur bruk för verkstadskontroll.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Granska åtgärd' }));
  expect(fixture.rpc).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Bekräfta och avsluta' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await screen.findByText('Inga kontroller med valda filter.');
  fireEvent.click(screen.getByRole('combobox', { name: 'Kontrollstatus' }));
  fireEvent.click(await screen.findByRole('option', { name: 'Avslutade avvikelser' }));
  const history = within(await screen.findByRole('article'));
  expect(history.getByText(original.note)).toBeVisible();
  expect(history.getByText('Avslutad avvikelse')).toBeVisible();
  expect(history.getByText(/Fordonet taget ur bruk för verkstadskontroll/)).toBeVisible();
  expect(fixture.rows[0]).toMatchObject({ ...original, status: 'resolved', resolution: 'Fordonet taget ur bruk för verkstadskontroll.', resolved_at: '2026-11-21T09:30:00Z', resolved_by: 'admin-a' });

  fixture.userId = 'driver-a';
  view.rerender(<QueryClientProvider client={client}>{driver}</QueryClientProvider>);
  await screen.findByText('Avslutad avvikelse');
  expect(screen.getByText(original.note)).toBeVisible();
  expect(fixture.rpc.mock.calls.map(call => call[0])).toEqual(['report_vehicle_check', 'resolve_vehicle_check']);
  expect(fixture.from.mock.calls.every(call => call[0] === 'vehicle_checks')).toBe(true);
  view.unmount(); client.clear();
});

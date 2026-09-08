import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DriverStatusOfflineRuntime } from './DriverStatusOfflineRuntime';
import { DriverDeliveryProofRuntime } from './DriverDeliveryProofRuntime';

const mocks = vi.hoisted(() => ({
  assignment: { id: 'fixture-job', status: 'pending', actual_start: null as string | null },
  pending: { operations: [], loading: false, error: '', queuedStart: false, proof: undefined, rejected: undefined },
  sync: vi.fn(), invalidate: vi.fn(), error: vi.fn(), success: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'fixture-driver' }, companyId: 'fixture-company' }) }));
vi.mock('@/hooks/useData', () => ({ useAssignment: (id?: string) => ({ data: id ? mocks.assignment : undefined }) }));
vi.mock('@/features/driver/use-driver-operations', () => ({ useDriverOperations: () => mocks.pending }));
vi.mock('@/lib/driver-offline-queue', () => ({ syncOrQueueDriverOperation: (...args: unknown[]) => mocks.sync(...args) }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }) }));
vi.mock('sonner', () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock('@/features/delivery-proof/DeliveryProofDialog', () => ({ DeliveryProofDialog: ({ open }: { open: boolean }) => open ? <div role="dialog">Proof form</div> : null }));
const show = (path = '/driver/assignments/fixture-job') => render(<MemoryRouter initialEntries={[path]}><DriverStatusOfflineRuntime /><DriverDeliveryProofRuntime /></MemoryRouter>);
beforeEach(() => {
  mocks.assignment = { id: 'fixture-job', status: 'pending', actual_start: null };
  mocks.pending = { operations: [], loading: false, error: '', queuedStart: false, proof: undefined, rejected: undefined };
  mocks.sync.mockReset().mockResolvedValue({ queued: false });
  mocks.invalidate.mockReset().mockResolvedValue(undefined);
  mocks.error.mockReset(); mocks.success.mockReset();
});
describe('one driver lifecycle UI', () => {
  it.each(['/driver/assignment/fixture-job', '/driver/assignments/fixture-job'])('offers one start action for deep link %s', path => {
    show(path);
    expect(screen.getAllByRole('button', { name: 'Starta körning' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Slutför med leveransbevis' })).not.toBeInTheDocument();
  });
  it('continues a started delayed assignment into the same proof form', () => {
    mocks.assignment = { id: 'fixture-job', status: 'delayed', actual_start: '2026-09-08T08:00:00Z' };
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Slutför med leveransbevis' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Starta körning' })).not.toBeInTheDocument();
  });
  it('can record proof after a durable queued start without submitting another start', () => {
    mocks.pending.queuedStart = true;
    show();
    expect(screen.getByRole('button', { name: 'Slutför med leveransbevis' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Starta körning' })).not.toBeInTheDocument();
  });
  it.each(['cancelled', 'completed'])('offers no lifecycle action for %s even with queued start', status => {
    mocks.assignment.status = status;
    mocks.pending.queuedStart = true;
    show();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('shows a concurrent server rejection and restores start button usability', async () => {
    mocks.sync.mockRejectedValue(new Error('Uppdraget är avbokat'));
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Starta körning' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('Uppdraget är avbokat'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Starta körning' })).toBeEnabled());
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ['assignments'] });
  });
});

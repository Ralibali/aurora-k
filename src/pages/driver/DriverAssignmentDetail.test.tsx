import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DriverAssignmentDetail from './DriverAssignmentDetail';

const mock = vi.hoisted(() => ({ status: 'completed', report: vi.fn(), update: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ companyId: 'company-a' }) }));
vi.mock('@/hooks/useData', () => ({
  useAssignment: () => ({ isLoading: false, data: {
    id: 'assignment-a', title: 'Testuppdrag', status: mock.status,
    scheduled_start: '2026-09-13T12:00:00Z', address: 'Testadress', customer_id: 'customer-a',
  } }),
  useDriverUpdateAssignment: () => ({ mutate: mock.update, isPending: false }),
}));
vi.mock('@/lib/assignment-deviations', () => ({
  useAssignmentDeviations: () => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() }),
  useChangeDeviation: () => ({ mutateAsync: mock.report, isPending: false }),
}));
vi.mock('@/features/driver/DriverExtraWorkCard', () => ({ default: () => null }));
beforeEach(() => { mock.report.mockReset().mockResolvedValue({}); mock.update.mockReset(); });

describe('reporting from closed driver assignments', () => {
  it.each(['completed', 'cancelled'])('lets the driver report a person on an accessible %s job', async status => {
    mock.status = status;
    render(<MemoryRouter initialEntries={['/driver/assignments/assignment-a']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Routes><Route path="/driver/assignments/:id" element={<DriverAssignmentDetail />} /></Routes></MemoryRouter>);
    expect(screen.queryByText('Snabbstatus till admin')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rapportera problem' }));
    fireEvent.change(screen.getByLabelText('Vad vill du rapportera?'), { target: { value: 'person' } });
    fireEvent.change(screen.getByLabelText('Beskriv vem rapporten gäller och vad som hände'), { target: { value: 'En person har hotat mig' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka rapport' }));
    await screen.findByText('Rapporten är sparad och synlig för företagets administratör.');
    expect(mock.report).toHaveBeenCalledWith({ type: 'report', assignmentId: 'assignment-a', message: '[Rapport: Olämpligt beteende från en person]\nEn person har hotat mig', operationId: expect.any(String) });
    expect(mock.update).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Rapportera via din profil' })).toHaveAttribute('href', '/driver/profile#report-problem');
  });
});

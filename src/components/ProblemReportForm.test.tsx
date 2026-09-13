import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProblemReportForm from './ProblemReportForm';

const submit = vi.fn();
function openReport() {
  render(<ProblemReportForm includeAssignmentProblem onSubmit={submit} successMessage="Rapport mottagen." />);
  fireEvent.click(screen.getByRole('button', { name: 'Rapportera problem' }));
}
beforeEach(() => { submit.mockReset(); });

describe('problem reports', () => {
  it('keeps category, text and operation id after failure, clearing only after a confirmed retry', async () => {
    submit.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    openReport();
    fireEvent.change(screen.getByLabelText('Vad vill du rapportera?'), { target: { value: 'person' } });
    const input = screen.getByLabelText('Beskriv vem rapporten gäller och vad som hände');
    fireEvent.change(input, { target: { value: '  En person har skrivit ett hot i uppdraget.  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka rapport' }));
    await screen.findByRole('alert');
    expect(input).toHaveValue('  En person har skrivit ett hot i uppdraget.  ');
    expect(screen.getByLabelText('Vad vill du rapportera?')).toHaveValue('person');
    expect(submit.mock.calls[0][0]).toBe('[Rapport: Olämpligt beteende från en person]\nEn person har skrivit ett hot i uppdraget.');
    fireEvent.click(screen.getByRole('button', { name: 'Skicka rapport' }));
    await screen.findByText('Rapport mottagen.');
    expect(submit.mock.calls[1]).toEqual(submit.mock.calls[0]);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('uses a new operation id for an edited report after a failed attempt', async () => {
    submit.mockRejectedValue(new Error('offline'));
    openReport();
    const input = screen.getByLabelText('Vad har hänt?');
    fireEvent.change(input, { target: { value: 'Den första beskrivningen' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka rapport' }));
    await screen.findByRole('alert');
    fireEvent.change(input, { target: { value: 'En korrigerad beskrivning' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka rapport' }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    await screen.findByRole('alert');
    expect(submit.mock.calls[1][1]).not.toBe(submit.mock.calls[0][1]);
  });

  it('keeps the complete tagged report within 3000 characters even after changing category', async () => {
    submit.mockResolvedValue(undefined);
    openReport();
    fireEvent.change(screen.getByLabelText('Vad vill du rapportera?'), { target: { value: 'content' } });
    const input = screen.getByLabelText('Beskriv det olämpliga innehållet');
    const max = Number(input.getAttribute('maxlength'));
    fireEvent.change(input, { target: { value: 'a'.repeat(max) } });
    fireEvent.change(screen.getByLabelText('Vad vill du rapportera?'), { target: { value: 'person' } });
    expect(screen.getByRole('button', { name: 'Skicka rapport' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Förkorta beskrivningen');
    fireEvent.change(screen.getByLabelText('Vad vill du rapportera?'), { target: { value: 'content' } });
    fireEvent.click(screen.getByRole('button', { name: 'Skicka rapport' }));
    await screen.findByText('Rapport mottagen.');
    expect(submit.mock.calls[0][0]).toHaveLength(3000);
  });

  it('rejects blank reports and prevents duplicate requests while sending', async () => {
    let finish!: () => void;
    submit.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    openReport();
    const input = screen.getByLabelText('Vad har hänt?');
    fireEvent.change(input, { target: { value: '  ' } });
    expect(screen.getByRole('button', { name: 'Skicka rapport' })).toBeDisabled();
    fireEvent.change(input, { target: { value: 'Ett problem att undersöka' } });
    const button = screen.getByRole('button', { name: 'Skicka rapport' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue('Ett problem att undersöka');
    expect(input).toBeDisabled();
    expect(screen.queryByText('Rapport mottagen.')).not.toBeInTheDocument();
    finish();
    await screen.findByText('Rapport mottagen.');
  });
});

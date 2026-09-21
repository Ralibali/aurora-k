import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DriverSettingsPresets } from './DriverSettingsPresets';
const mutateAsync = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useDriverSettings', () => ({ useUpdateDriverSettings: () => ({ mutateAsync, isPending: false }) }));
const settings = { id: 'settings', require_signature: true, require_photo: true, show_time_report: true, show_availability_toggle: true, show_total_hours: true, updated_at: '' };
beforeEach(() => { mutateAsync.mockReset().mockResolvedValue({}); });
describe('driver settings profiles', () => {
  it('previews a profile without writing and applies the complete profile once', async () => {
    render(<DriverSettingsPresets settings={settings} />);
    fireEvent.click(screen.getByRole('button', { name: /Bud & distribution/ }));
    expect(mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByText('Tidrapport: döljs i navigationen')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Använd vald mall' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync).toHaveBeenCalledWith({ id: 'settings', require_signature: true, require_photo: true, show_time_report: false, show_availability_toggle: true, show_total_hours: false });
  });
  it('retains the choice if saving fails', async () => {
    mutateAsync.mockRejectedValue(new Error('offline'));
    render(<DriverSettingsPresets settings={settings} />);
    fireEvent.click(screen.getByRole('button', { name: /Bemanning/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Använd vald mall' }));
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: /Bemanning/ })).toHaveAttribute('aria-pressed', 'true');
  });
});

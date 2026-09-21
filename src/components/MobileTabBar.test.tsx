import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileTabBar } from './MobileTabBar';
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ signOut: vi.fn(), isPlatformAdmin: false }) }));
vi.mock('@/hooks/useDemoMode', () => ({ useDemoMode: () => ({ enabled: false, disable: vi.fn() }) }));
beforeEach(cleanup);
describe('mobile navigation', () => {
  it('exposes operational pages and filters them without leaving the menu', () => {
    render(<MemoryRouter initialEntries={['/admin']}><MobileTabBar /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Öppna mer-meny' }));
    const menu = screen.getByRole('dialog', { name: 'Alla funktioner' });
    // Locate by visible text, then verify link semantics individually. Repeated
    // named-role searches recompute styles for every link and time out in CI.
    const link = (name: string) => {
      const element = within(menu).getByText(name, { exact: true }).closest('a');
      expect(element).toHaveAttribute('href');
      expect(element).toHaveAccessibleName(name);
      expect(element).toBeVisible();
      return element!;
    };
    expect(link('Fakturaunderlag')).toHaveAttribute('href', '/admin/invoice-basis');
    link('Godkännanden');
    link('Återkommande uppdrag');
    fireEvent.change(within(menu).getByLabelText('Sök funktion'), { target: { value: 'faktura' } });
    const invoiceLink = link('Fakturaunderlag');
    expect(within(menu).queryByText('Godkännanden', { exact: true })).not.toBeInTheDocument();
    fireEvent.click(invoiceLink);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('does not overlay an assignment form with a duplicate create button', () => {
    render(<MemoryRouter initialEntries={['/admin/assignments/new']}><MobileTabBar /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Nytt uppdrag' })).not.toBeInTheDocument();
  });
});

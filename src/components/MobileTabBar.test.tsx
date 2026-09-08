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
    expect(within(menu).getByRole('link', { name: 'Fakturaunderlag' })).toHaveAttribute('href', '/admin/invoice-basis');
    expect(within(menu).getByRole('link', { name: 'Godkännanden' })).toBeInTheDocument();
    expect(within(menu).getByRole('link', { name: 'Återkommande uppdrag' })).toBeInTheDocument();
    fireEvent.change(within(menu).getByRole('textbox', { name: 'Sök funktion' }), { target: { value: 'faktura' } });
    expect(within(menu).getByRole('link', { name: 'Fakturaunderlag' })).toBeInTheDocument();
    expect(within(menu).queryByRole('link', { name: 'Godkännanden' })).not.toBeInTheDocument();
    fireEvent.click(within(menu).getByRole('link', { name: 'Fakturaunderlag' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('does not overlay an assignment form with a duplicate create button', () => {
    render(<MemoryRouter initialEntries={['/admin/assignments/new']}><MobileTabBar /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Nytt uppdrag' })).not.toBeInTheDocument();
  });
});

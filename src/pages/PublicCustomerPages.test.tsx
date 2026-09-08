import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CustomerPortal from './CustomerPortal';
import PublicTrackingPage from './PublicTrackingPage';
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/lib/supabase-url', () => ({ fetchSupabaseFunction: (...args: unknown[]) => mocks.fetch(...args) }));
vi.mock('@/lib/use-page-meta', () => ({ usePageMeta: () => {} }));
vi.mock('@/components/portal/BookingRequestForm', () => ({ BookingRequestForm: ({ token }: { token: string }) => <div>Bokning för {token}</div> }));
vi.mock('@/components/portal/PortalChat', () => ({ PortalChat: () => null }));
vi.mock('@/components/portal/PortalInvoiceDownloadButton', () => ({ PortalInvoiceDownloadButton: () => null }));
beforeEach(() => { mocks.fetch.mockReset(); });
afterEach(cleanup);
const portal = () => render(<MemoryRouter initialEntries={['/portal?token=customer-a']}><CustomerPortal /></MemoryRouter>);
describe('public customer page recovery', () => {
  it('ends the portal loader on a network error and supports retry', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('Anslutningen bröts')).mockResolvedValue({ customer: { id: 'a', name: 'Kund A' } });
    portal();
    expect(await screen.findByText('Anslutningen bröts')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }));
    expect(await screen.findByRole('heading', { name: 'Kund A' })).toBeInTheDocument();
    expect(mocks.fetch).toHaveBeenLastCalledWith('customer-portal', { token: 'customer-a' }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });
  it('creates a booking within the current customer token, never a hardcoded company slug', async () => {
    mocks.fetch.mockResolvedValue({ customer: { id: 'a', name: 'Kund A' } });
    portal();
    fireEvent.click(await screen.findByRole('button', { name: 'Ny bokning' }));
    expect(screen.getByText('Bokning för customer-a')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ny bokning' })).not.toBeInTheDocument();
  });
  it('recovers tracking after a failure and accepts a latest position at latitude zero', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ assignment: { title: 'Leverans A', status: 'active', pickupAddress: 'A', scheduledStart: '2026-09-08T08:00:00Z' }, driver: null, location: { latitude: 0, longitude: 10, updatedAt: '2026-09-08T09:00:00Z' } });
    render(<MemoryRouter initialEntries={['/track/token-a']}><Routes><Route path="/track/:token" element={<PublicTrackingPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Offline')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }));
    expect(await screen.findByRole('link', { name: 'Visa senaste position' })).toHaveAttribute('href', 'https://www.google.com/maps?q=0,10');
  });
});

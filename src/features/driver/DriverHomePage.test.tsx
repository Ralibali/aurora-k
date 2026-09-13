import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import DriverHomePage from './DriverHomePage';

const mocks = vi.hoisted(() => ({ profile: vi.fn(), assignments: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'review-driver' } }) }));
vi.mock('@/hooks/useData', async () => {
  const { useQuery } = await import('@tanstack/react-query');
  return {
    useProfile: () => useQuery({ queryKey: ['review-profile'], queryFn: mocks.profile }),
    useDriverAssignments: () => useQuery({ queryKey: ['review-assignments'], queryFn: mocks.assignments }),
    useSettings: () => ({ data: undefined }),
  };
});
vi.mock('@/hooks/useDriverSettings', () => ({ useEffectiveDriverSettings: () => ({ data: undefined }) }));
vi.mock('./DriverHomeAssignmentCard', () => ({ DriverHomeAssignmentCard: ({ assignment }: { assignment: { title: string } }) => <div>{assignment.title}</div> }));

const profile = { full_name: 'Granskningschaufför' };
const assignment = { id: 'review-job', title: 'Testleverans', status: 'pending', scheduled_start: '2026-09-12T08:00:00Z', actual_start: null };
const clients: QueryClient[] = [];
function show({ cached = false } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  clients.push(client);
  if (cached) {
    client.setQueryData(['review-profile'], profile);
    client.setQueryData(['review-assignments'], [assignment]);
  }
  return render(<MemoryRouter><QueryClientProvider client={client}><DriverHomePage /></QueryClientProvider></MemoryRouter>);
}
beforeEach(() => {
  onlineManager.setOnline(true);
  mocks.profile.mockReset().mockResolvedValue(profile);
  mocks.assignments.mockReset().mockResolvedValue([assignment]);
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach(client => client.clear());
  onlineManager.setOnline(true);
});
function expectNoFalseEmptyState() {
  expect(screen.queryByText('Inga uppdrag i detta urval.')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Idag & tidigare' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Idag & tidigare 0' })).not.toBeInTheDocument();
}

it('does not show an empty list or blank greeting while first reads are pending', () => {
  mocks.profile.mockImplementation(() => new Promise(() => {}));
  mocks.assignments.mockImplementation(() => new Promise(() => {}));
  show();
  expect(screen.getByRole('heading', { name: 'Dina uppdrag' })).toBeInTheDocument();
  expect(screen.getByText('Hämtar din profil…')).toBeInTheDocument();
  expect(screen.getByRole('status', { name: 'Hämtar dina uppdrag' })).toBeInTheDocument();
  expectNoFalseEmptyState();
});

it('explains paused initial reads and fills the screen when connectivity returns', async () => {
  onlineManager.setOnline(false);
  show();
  expect(mocks.profile).not.toHaveBeenCalled();
  expect(mocks.assignments).not.toHaveBeenCalled();
  expect(screen.getByText('Väntar på anslutning för att hämta din profil.')).toBeInTheDocument();
  expect(screen.getByText('Dina uppdrag har inte hämtats ännu. Väntar på anslutning.')).toBeInTheDocument();
  expectNoFalseEmptyState();
  act(() => onlineManager.setOnline(true));
  expect(await screen.findByRole('heading', { name: 'Hej, Granskningschaufför!' })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Idag & tidigare 1' })).toBeEnabled();
  expect(screen.getAllByText('Testleverans')).toHaveLength(2);
});

it('keeps cached profile and assignments usable while refresh is paused offline', () => {
  onlineManager.setOnline(false);
  show({ cached: true });
  expect(screen.getByRole('heading', { name: 'Hej, Granskningschaufför!' })).toBeInTheDocument();
  expect(screen.getByText('Visar senast hämtade uppdrag. Uppdateras när anslutningen är tillbaka.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Idag & tidigare 1' })).toBeEnabled();
  expect(screen.getAllByText('Testleverans')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Slutförda 0' }));
  expect(screen.getByText('Inga uppdrag i det senast hämtade urvalet.')).toBeInTheDocument();
});

it('shows failed first reads as errors and lets the driver retry without false zero counts', async () => {
  mocks.profile.mockRejectedValueOnce(new Error('Network unavailable'));
  mocks.assignments.mockRejectedValueOnce(new Error('Network unavailable'));
  show();
  expect(await screen.findByText('Din profil kunde inte hämtas.')).toBeInTheDocument();
  expect(await screen.findByText('Kunde inte hämta dina uppdrag.')).toBeInTheDocument();
  expectNoFalseEmptyState();
  fireEvent.click(screen.getByRole('button', { name: 'Försök hämta profilen igen' }));
  fireEvent.click(screen.getByRole('button', { name: 'Försök igen' }));
  expect(await screen.findByRole('heading', { name: 'Hej, Granskningschaufför!' })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Idag & tidigare 1' })).toBeEnabled();
});

it('preserves cached assignments when a background refresh fails', async () => {
  mocks.assignments.mockRejectedValue(new Error('Network unavailable'));
  show({ cached: true });
  expect(await screen.findByText('Kunde inte uppdatera dina uppdrag. Senast hämtade uppgifter visas.')).toBeInTheDocument();
  expect(screen.getAllByText('Testleverans')).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Idag & tidigare 1' })).toBeEnabled();
});

it('shows a true empty state only after a successful empty response', async () => {
  mocks.assignments.mockResolvedValue([]);
  show();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Idag & tidigare 0' })).toBeEnabled());
  expect(screen.getByText('Inga uppdrag i detta urval.')).toBeInTheDocument();
});

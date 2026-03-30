import { Profile, Customer, Assignment } from './types';

// Mock data for UI development before Supabase is connected
export const mockDrivers: Profile[] = [
  { id: 'd1', full_name: 'Erik Svensson', email: 'erik@aurora.se', role: 'driver', created_at: '2024-01-01T00:00:00Z' },
  { id: 'd2', full_name: 'Anna Lindström', email: 'anna@aurora.se', role: 'driver', created_at: '2024-01-15T00:00:00Z' },
  { id: 'd3', full_name: 'Johan Karlsson', email: 'johan@aurora.se', role: 'driver', created_at: '2024-02-01T00:00:00Z' },
];

export const mockCustomers: Customer[] = [
  { id: 'c1', name: 'IKEA Kungens Kurva', created_at: '2024-01-01T00:00:00Z' },
  { id: 'c2', name: 'Volvo Trucks AB', created_at: '2024-01-10T00:00:00Z' },
  { id: 'c3', name: 'Schenker AB', created_at: '2024-02-05T00:00:00Z' },
];

const today = new Date();
const todayStr = today.toISOString().split('T')[0];

export const mockAssignments: Assignment[] = [
  {
    id: 'a1', title: 'Leverans kontorsmöbler', customer_id: 'c1', address: 'Modulvägen 1, Kungens Kurva',
    instructions: 'Ring vid ankomst. Port 3B.', scheduled_start: `${todayStr}T08:00:00Z`, scheduled_end: `${todayStr}T10:00:00Z`,
    assigned_driver_id: 'd1', status: 'completed', actual_start: `${todayStr}T08:05:00Z`, actual_stop: `${todayStr}T09:40:00Z`,
    consignment_photo_url: null, created_at: '2024-03-20T00:00:00Z',
    customer: mockCustomers[0], driver: mockDrivers[0],
  },
  {
    id: 'a2', title: 'Hämtning reservdelar', customer_id: 'c2', address: 'Volvo Center, Göteborg',
    instructions: null, scheduled_start: `${todayStr}T10:30:00Z`, scheduled_end: `${todayStr}T12:00:00Z`,
    assigned_driver_id: 'd2', status: 'active', actual_start: `${todayStr}T10:35:00Z`, actual_stop: null,
    consignment_photo_url: null, created_at: '2024-03-20T00:00:00Z',
    customer: mockCustomers[1], driver: mockDrivers[1],
  },
  {
    id: 'a3', title: 'Express-leverans dokument', customer_id: 'c3', address: 'Schenker Terminal, Arlanda',
    instructions: 'Lämna vid godsmottagningen', scheduled_start: `${todayStr}T14:00:00Z`, scheduled_end: null,
    assigned_driver_id: 'd1', status: 'pending', actual_start: null, actual_stop: null,
    consignment_photo_url: null, created_at: '2024-03-20T00:00:00Z',
    customer: mockCustomers[2], driver: mockDrivers[0],
  },
  {
    id: 'a4', title: 'Pallgods till lager', customer_id: 'c1', address: 'Lagervägen 15, Södertälje',
    instructions: null, scheduled_start: `${todayStr}T15:30:00Z`, scheduled_end: `${todayStr}T17:00:00Z`,
    assigned_driver_id: 'd3', status: 'pending', actual_start: null, actual_stop: null,
    consignment_photo_url: null, created_at: '2024-03-20T00:00:00Z',
    customer: mockCustomers[0], driver: mockDrivers[2],
  },
];

export const mockCurrentUser: Profile = {
  id: 'admin1', full_name: 'Maria Andersson', email: 'maria@aurora.se', role: 'admin', created_at: '2024-01-01T00:00:00Z',
};

import { Customer, Assignment, Profile, Invoice, CompanySettings } from './types';

const today = new Date();
const todayStr = today.toISOString().split('T')[0];

export const mockDrivers: Profile[] = [
  { id: 'd1', full_name: 'Erik Svensson', email: 'erik@aurora.se', role: 'driver', is_available: true, created_at: '2024-01-01T00:00:00Z' },
  { id: 'd2', full_name: 'Anna Lindström', email: 'anna@aurora.se', role: 'driver', is_available: true, created_at: '2024-01-15T00:00:00Z' },
  { id: 'd3', full_name: 'Johan Karlsson', email: 'johan@aurora.se', role: 'driver', is_available: false, created_at: '2024-02-01T00:00:00Z' },
];

export const mockCustomers: Customer[] = [
  { id: 'c1', name: 'IKEA Kungens Kurva', org_number: '556074-7569', invoice_address: 'Box 702, 343 81 Älmhult', visit_address: 'Modulvägen 1, Kungens Kurva', contact_person: 'Lars Eriksson', email: 'lars@ikea.se', phone: '08-123 45 67', price_per_delivery: 1500, price_per_hour: null, pricing_type: 'per_delivery', payment_terms_days: 30, notes: 'Stor kund, alltid godsmottagning port 3B', created_at: '2024-01-01T00:00:00Z' },
  { id: 'c2', name: 'Volvo Trucks AB', org_number: '556013-9700', invoice_address: 'Gropegårdsgatan 2, 405 08 Göteborg', visit_address: 'Volvo Center, Göteborg', contact_person: 'Maria Holm', email: 'maria@volvo.se', phone: '031-987 65 43', price_per_delivery: null, price_per_hour: 650, pricing_type: 'per_hour', payment_terms_days: 30, notes: null, created_at: '2024-01-10T00:00:00Z' },
  { id: 'c3', name: 'Schenker AB', org_number: '556251-9458', invoice_address: 'Schenker Terminal, 190 45 Arlanda', visit_address: 'Schenker Terminal, Arlanda', contact_person: 'Per Olsson', email: 'per@schenker.se', phone: '070-111 22 33', price_per_delivery: null, price_per_hour: null, pricing_type: 'manual', payment_terms_days: 15, notes: 'Manuell prissättning per uppdrag', created_at: '2024-02-05T00:00:00Z' },
];

export const mockAssignments: Assignment[] = [
  {
    id: 'a1', title: 'Leverans kontorsmöbler', customer_id: 'c1', address: 'Modulvägen 1, Kungens Kurva',
    instructions: 'Ring vid ankomst. Port 3B.', scheduled_start: `${todayStr}T08:00:00Z`, scheduled_end: `${todayStr}T10:00:00Z`,
    assigned_driver_id: 'd1', status: 'completed', actual_start: `${todayStr}T08:05:00Z`, actual_stop: `${todayStr}T09:40:00Z`,
    consignment_photo_url: null, signature_url: null, priority: 'normal', admin_comment: null, driver_comment: null, invoiced: false, created_at: '2024-03-20T00:00:00Z',
    customer: mockCustomers[0], driver: mockDrivers[0],
  },
  {
    id: 'a2', title: 'Hämtning reservdelar', customer_id: 'c2', address: 'Volvo Center, Göteborg',
    instructions: null, scheduled_start: `${todayStr}T10:30:00Z`, scheduled_end: `${todayStr}T12:00:00Z`,
    assigned_driver_id: 'd2', status: 'active', actual_start: `${todayStr}T10:35:00Z`, actual_stop: null,
    consignment_photo_url: null, signature_url: null, priority: 'urgent', admin_comment: 'Prioritera denna, kunden väntar!', driver_comment: null, invoiced: false, created_at: '2024-03-20T00:00:00Z',
    customer: mockCustomers[1], driver: mockDrivers[1],
  },
  {
    id: 'a3', title: 'Express-leverans dokument', customer_id: 'c3', address: 'Schenker Terminal, Arlanda',
    instructions: 'Lämna vid godsmottagningen', scheduled_start: `${todayStr}T14:00:00Z`, scheduled_end: null,
    assigned_driver_id: 'd1', status: 'pending', actual_start: null, actual_stop: null,
    consignment_photo_url: null, signature_url: null, priority: 'low', admin_comment: null, driver_comment: null, invoiced: false, created_at: '2024-03-20T00:00:00Z',
    customer: mockCustomers[2], driver: mockDrivers[0],
  },
  {
    id: 'a4', title: 'Pallgods till lager', customer_id: 'c1', address: 'Lagervägen 15, Södertälje',
    instructions: null, scheduled_start: `${todayStr}T15:30:00Z`, scheduled_end: `${todayStr}T17:00:00Z`,
    assigned_driver_id: 'd3', status: 'pending', actual_start: null, actual_stop: null,
    consignment_photo_url: null, signature_url: null, priority: 'normal', admin_comment: null, driver_comment: null, invoiced: false, created_at: '2024-03-20T00:00:00Z',
    customer: mockCustomers[0], driver: mockDrivers[2],
  },
];

export const mockInvoices: Invoice[] = [
  {
    id: 'inv1', invoice_number: 1001, customer_id: 'c1', assignment_ids: ['a1'],
    status: 'sent', invoice_date: '2024-03-25', due_date: '2024-04-24',
    total_ex_vat: 1500, vat_amount: 375, total_inc_vat: 1875,
    reference: 'Lars Eriksson', message: null, created_at: '2024-03-25T00:00:00Z',
    customer: mockCustomers[0],
  },
];

export const mockSettings: CompanySettings = {
  id: 's1', company_name: 'Aurora Medias Transport AB', org_number: '559000-1234',
  address: 'Transportgatan 5', zip_city: '111 22 Stockholm',
  email: 'info@auroramedia.se', phone: '08-555 12 34',
  bankgiro: '123-4567', plusgiro: null, vat_number: 'SE559000123401', logo_url: null,
};

export const mockCurrentUser: Profile = {
  id: 'admin1', full_name: 'Maria Andersson', email: 'maria@aurora.se', role: 'admin', is_available: true, created_at: '2024-01-01T00:00:00Z',
};

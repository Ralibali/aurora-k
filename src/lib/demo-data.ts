/**
 * Frontend-only demo data. Never written to the database.
 * Used as overlay when DemoMode is enabled.
 */

export const demoCustomers = [
  { id: 'demo-c-1', name: 'Nilsson Åkeri AB', email: 'order@nilssonakeri.se', phone: '08-555 12 34', org_number: '556012-1234' },
  { id: 'demo-c-2', name: 'Skåne Logistik AB', email: 'kontakt@skanelogistik.se', phone: '040-12 34 56', org_number: '556789-4567' },
  { id: 'demo-c-3', name: 'Nordic Freight AB', email: 'info@nordicfreight.se', phone: '031-99 88 77', org_number: '556321-7890' },
  { id: 'demo-c-4', name: 'AB Transport Sverige', email: 'bokning@abtransport.se', phone: '054-22 33 44', org_number: '556456-2345' },
];

export const demoDrivers = [
  { id: 'demo-d-1', full_name: 'Johan Svensson', email: 'johan@demo.se', is_available: true },
  { id: 'demo-d-2', full_name: 'Sara Andersson', email: 'sara@demo.se', is_available: true },
  { id: 'demo-d-3', full_name: 'Ali Hassan', email: 'ali@demo.se', is_available: false },
  { id: 'demo-d-4', full_name: 'Maria Karlsson', email: 'maria@demo.se', is_available: true },
];

function todayAt(hours: number, minutes = 0): string {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function hoursAgo(h: number): string {
  const d = new Date(Date.now() - h * 3600 * 1000);
  return d.toISOString();
}

export const demoAssignments = [
  {
    id: 'demo-a-1042',
    title: 'Pall #4502 — Möbeltransport',
    address: 'Lindholmsallén 10, Göteborg → Hornsgatan 45, Stockholm',
    status: 'active',
    priority: 'high',
    scheduled_start: todayAt(8, 30),
    actual_start: hoursAgo(1.5),
    actual_stop: null,
    customer: { name: 'Nilsson Åkeri AB' },
    driver: { full_name: 'Johan Svensson' },
  },
  {
    id: 'demo-a-1041',
    title: 'Maskindelar — Express',
    address: 'Idrottsgatan 12, Malmö → Klostergatan 3, Jönköping',
    status: 'pending',
    priority: 'normal',
    scheduled_start: todayAt(9, 0),
    actual_start: null,
    actual_stop: null,
    customer: { name: 'Skåne Logistik AB' },
    driver: { full_name: 'Sara Andersson' },
  },
  {
    id: 'demo-a-1040',
    title: 'Container — Kustfrakt',
    address: 'Hamnvägen 8, Helsingborg → Frihamnen, Göteborg',
    status: 'pending',
    priority: 'normal',
    scheduled_start: todayAt(10, 30),
    actual_start: null,
    actual_stop: null,
    customer: { name: 'Nordic Freight AB' },
    driver: { full_name: 'Ali Hassan' },
  },
  {
    id: 'demo-a-1039',
    title: 'Kontorsflytt — Avdelning 3',
    address: 'Vasagatan 50, Stockholm → S:t Olofsgatan 22, Uppsala',
    status: 'completed',
    priority: 'normal',
    scheduled_start: todayAt(7, 0),
    actual_start: hoursAgo(4),
    actual_stop: hoursAgo(1),
    customer: { name: 'AB Transport Sverige' },
    driver: { full_name: 'Maria Karlsson' },
  },
  {
    id: 'demo-a-1038',
    title: 'Distribution — 12 stopp',
    address: 'Backaplan 4, Göteborg → Lokala stopp',
    status: 'delayed',
    priority: 'high',
    scheduled_start: todayAt(6, 30),
    actual_start: hoursAgo(5),
    actual_stop: null,
    customer: { name: 'Nilsson Åkeri AB' },
    driver: { full_name: 'Johan Svensson' },
  },
];

export const demoKpis = {
  activeAssignments: 12,
  availableDrivers: 8,
  reportedHoursWeek: 248,
  invoiceableAmount: 187_400,
};

export const demoEnvironment = {
  totalDistanceKm: 14_280,
  co2Kg: 8_142,
  fuelLiters: 4_960,
};

export const demoActivity = [
  { key: 'd-act-1', driver: 'Johan Svensson', action: 'startade', title: 'Nilsson Åkeri AB — Möbeltransport', time: '08:32', isComplete: false },
  { key: 'd-act-2', driver: 'Maria Karlsson', action: 'slutförde', title: 'AB Transport — Kontorsflytt', time: '11:14', isComplete: true },
  { key: 'd-act-3', driver: 'Sara Andersson', action: 'startade', title: 'Skåne Logistik — Maskindelar', time: '09:05', isComplete: false },
  { key: 'd-act-4', driver: 'Ali Hassan', action: 'rapporterade tid', title: 'Nordic Freight — Container', time: '10:42', isComplete: true },
  { key: 'd-act-5', driver: 'Johan Svensson', action: 'rapporterade fördröjning', title: 'Distribution — 12 stopp', time: '07:55', isComplete: false },
];
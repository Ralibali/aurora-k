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

function dayOffsetAt(dayOffset: number, hours: number, minutes = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
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

/** Spread of demo assignments across the current week for the calendar */
export const demoCalendarAssignments = [
  { id: 'demo-cal-1', title: 'Möbeltransport — Stockholm', address: 'Hornsgatan 45, Stockholm', status: 'active', scheduled_start: dayOffsetAt(0, 8, 30), scheduled_end: dayOffsetAt(0, 14, 0), customer: { name: 'Nilsson Åkeri AB' }, driver: { full_name: 'Johan Svensson' }, assigned_driver_id: 'demo-d-1' },
  { id: 'demo-cal-2', title: 'Maskindelar — Express', address: 'Klostergatan 3, Jönköping', status: 'pending', scheduled_start: dayOffsetAt(0, 13, 0), scheduled_end: dayOffsetAt(0, 17, 30), customer: { name: 'Skåne Logistik AB' }, driver: { full_name: 'Sara Andersson' }, assigned_driver_id: 'demo-d-2' },
  { id: 'demo-cal-3', title: 'Container — Kustfrakt', address: 'Frihamnen, Göteborg', status: 'pending', scheduled_start: dayOffsetAt(1, 7, 0), scheduled_end: dayOffsetAt(1, 12, 0), customer: { name: 'Nordic Freight AB' }, driver: { full_name: 'Ali Hassan' }, assigned_driver_id: 'demo-d-3' },
  { id: 'demo-cal-4', title: 'Distribution — 12 stopp', address: 'Backaplan, Göteborg', status: 'delayed', scheduled_start: dayOffsetAt(1, 6, 30), scheduled_end: dayOffsetAt(1, 15, 0), customer: { name: 'Nilsson Åkeri AB' }, driver: { full_name: 'Johan Svensson' }, assigned_driver_id: 'demo-d-1' },
  { id: 'demo-cal-5', title: 'Kontorsflytt — Avd. 3', address: 'S:t Olofsgatan 22, Uppsala', status: 'completed', scheduled_start: dayOffsetAt(2, 7, 0), scheduled_end: dayOffsetAt(2, 11, 0), customer: { name: 'AB Transport Sverige' }, driver: { full_name: 'Maria Karlsson' }, assigned_driver_id: 'demo-d-4' },
  { id: 'demo-cal-6', title: 'Bygglogistik — Norrköping', address: 'Drottninggatan 70, Norrköping', status: 'pending', scheduled_start: dayOffsetAt(2, 9, 30), scheduled_end: dayOffsetAt(2, 16, 0), customer: { name: 'Skåne Logistik AB' }, driver: { full_name: 'Sara Andersson' }, assigned_driver_id: 'demo-d-2' },
  { id: 'demo-cal-7', title: 'Pall — Logistikcentralen', address: 'Logistikvägen 4, Örebro', status: 'pending', scheduled_start: dayOffsetAt(3, 8, 0), scheduled_end: dayOffsetAt(3, 12, 30), customer: { name: 'Nordic Freight AB' }, driver: { full_name: 'Maria Karlsson' }, assigned_driver_id: 'demo-d-4' },
  { id: 'demo-cal-8', title: 'Möbler — Returfrakt', address: 'Vasagatan 50, Stockholm', status: 'active', scheduled_start: dayOffsetAt(3, 13, 30), scheduled_end: dayOffsetAt(3, 18, 0), customer: { name: 'Nilsson Åkeri AB' }, driver: { full_name: 'Ali Hassan' }, assigned_driver_id: 'demo-d-3' },
  { id: 'demo-cal-9', title: 'Express — Industriparken', address: 'Industrivägen 12, Linköping', status: 'pending', scheduled_start: dayOffsetAt(4, 7, 30), scheduled_end: dayOffsetAt(4, 11, 0), customer: { name: 'AB Transport Sverige' }, driver: { full_name: 'Johan Svensson' }, assigned_driver_id: 'demo-d-1' },
  { id: 'demo-cal-10', title: 'Container — Hamnomlastning', address: 'Containerterminalen, Helsingborg', status: 'pending', scheduled_start: dayOffsetAt(4, 9, 0), scheduled_end: dayOffsetAt(4, 14, 30), customer: { name: 'Skåne Logistik AB' }, driver: { full_name: 'Sara Andersson' }, assigned_driver_id: 'demo-d-2' },
];

/** Live driver positions for the live map (Sweden) */
export const demoDriverLocations = [
  {
    id: 'demo-loc-1', driver_id: 'demo-d-1', assignment_id: 'demo-a-1042',
    latitude: 59.3293, longitude: 18.0686, heading: 45, speed: 64,
    updated_at: new Date(Date.now() - 35_000).toISOString(),
    driver: { full_name: 'Johan Svensson', email: 'johan@demo.se' },
    assignment: { title: 'Möbeltransport — Stockholm', address: 'Hornsgatan 45, Stockholm' },
  },
  {
    id: 'demo-loc-2', driver_id: 'demo-d-2', assignment_id: 'demo-a-1041',
    latitude: 57.7089, longitude: 11.9746, heading: 110, speed: 72,
    updated_at: new Date(Date.now() - 90_000).toISOString(),
    driver: { full_name: 'Sara Andersson', email: 'sara@demo.se' },
    assignment: { title: 'Maskindelar — Express', address: 'Klostergatan 3, Jönköping' },
  },
  {
    id: 'demo-loc-3', driver_id: 'demo-d-3', assignment_id: 'demo-a-1040',
    latitude: 55.6050, longitude: 13.0038, heading: 280, speed: 0,
    updated_at: new Date(Date.now() - 4 * 60_000).toISOString(),
    driver: { full_name: 'Ali Hassan', email: 'ali@demo.se' },
    assignment: { title: 'Container — Kustfrakt', address: 'Frihamnen, Göteborg' },
  },
];

/** Example optimized route stops for AdminRouteOptimizer demo state */
export const demoRouteStops = [
  { id: 'demo-rs-1', title: 'Hämta — Lager A', address: 'Industrigatan 4, Göteborg', scheduled_start: dayOffsetAt(0, 7, 30), scheduled_end: dayOffsetAt(0, 8, 0), status: 'pending', distance_km: 0 },
  { id: 'demo-rs-2', title: 'Leverans — Volvo', address: 'Torslandavägen, Göteborg', scheduled_start: dayOffsetAt(0, 8, 30), scheduled_end: dayOffsetAt(0, 9, 0), status: 'pending', distance_km: 12 },
  { id: 'demo-rs-3', title: 'Leverans — Mölndal Galleria', address: 'Brogatan 14, Mölndal', scheduled_start: dayOffsetAt(0, 9, 45), scheduled_end: dayOffsetAt(0, 10, 15), status: 'pending', distance_km: 14 },
  { id: 'demo-rs-4', title: 'Hämta — Returgods', address: 'Sisjön Industriområde, Askim', scheduled_start: dayOffsetAt(0, 11, 0), scheduled_end: dayOffsetAt(0, 11, 30), status: 'pending', distance_km: 8 },
  { id: 'demo-rs-5', title: 'Leverans — Centrallager', address: 'Backaplan 4, Göteborg', scheduled_start: dayOffsetAt(0, 12, 30), scheduled_end: dayOffsetAt(0, 13, 0), status: 'pending', distance_km: 11 },
];
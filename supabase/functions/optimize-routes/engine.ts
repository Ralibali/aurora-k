export type Point = { lat: number; lng: number };
export type Assignment = {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string | null;
  assigned_driver_id: string | null;
  vehicle_id: string | null;
  geofence_lat: number | null;
  geofence_lng: number | null;
  route_demand: number;
  route_skills: string[];
};
export type Driver = {
  id: string;
  full_name: string;
  route_capacity: number;
  route_skills: string[];
};
type PlannedStop = {
  assignmentId: string;
  driverId: string;
  vehicleId: string | null;
  sequence: number;
  arrivalAt: string | null;
  departureAt: string | null;
  distanceM: number;
  durationS: number;
  reason: string;
};

function distance(a?: Point | null, b?: Point | null) {
  if (!a || !b) return 0;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radius = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(
    radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)),
  );
}

export function point(item?: Assignment | null): Point | null {
  if (!item || !Number.isFinite(item.geofence_lat) || !Number.isFinite(item.geofence_lng)) return null;
  const lat = item.geofence_lat!; const lng = item.geofence_lng!;
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

export function routeDistance(groups: Map<string, Assignment[]>, depot: Point | null) {
  let total = 0;
  for (const jobs of groups.values()) {
    let previous = depot;
    for (const job of jobs) {
      total += distance(previous, point(job));
      previous = point(job) ?? previous;
    }
    total += distance(previous, depot);
  }
  return total;
}

export function fallbackPlan(
  assignments: Assignment[],
  drivers: Driver[],
  depot: Point | null,
  dayStart: string,
) {
  const remaining = [...assignments];
  const stops: PlannedStop[] = [];
  const state = new Map(drivers.map(driver => [driver.id, { point: depot, cursor: Date.parse(dayStart), capacity: 0, sequence: 0 }]));
  if (!depot) return { stops, unassignedIds: remaining.map(job => job.id) };
  while (remaining.length) {
    let best: { driver: Driver; job: Assignment; arrival: number; leg: number; duration: number; score: number } | null = null;
    for (const driver of drivers) {
      const current = state.get(driver.id)!;
      for (const job of remaining) {
        const destination = point(job);
        const start = Date.parse(job.scheduled_start);
        const end = job.scheduled_end ? Date.parse(job.scheduled_end) : NaN;
        if (!destination || !Number.isFinite(start) || !Number.isFinite(end) || end <= start ||
          !Number.isFinite(job.route_demand) || job.route_demand < 0 || !Number.isFinite(driver.route_capacity) ||
          current.capacity + job.route_demand > driver.route_capacity ||
          !(job.route_skills ?? []).every(skill => (driver.route_skills ?? []).includes(skill))) continue;
        const leg = distance(current.point, destination);
        const duration = Math.ceil(leg / 13.9);
        const arrival = Math.max(current.cursor + duration * 1000, start);
        // Treat scheduled_end as a hard completion deadline. 15 min service matches VROOM.
        if (arrival + 900000 > end) continue;
        const score = arrival + leg;
        if (!best || score < best.score) best = { driver, job, arrival, leg, duration, score };
      }
    }
    if (!best) break;
    const current = state.get(best.driver.id)!;
    current.sequence++; current.capacity += best.job.route_demand;
    current.cursor = best.arrival + 900000; current.point = point(best.job);
    stops.push({ assignmentId: best.job.id, driverId: best.driver.id, vehicleId: best.job.vehicle_id,
      sequence: current.sequence, arrivalAt: new Date(best.arrival).toISOString(), departureAt: new Date(current.cursor).toISOString(),
      distanceM: best.leg, durationS: best.duration, reason: 'Preliminärt förslag med fågelväg, 50 km/h och 15 min stopp. Kontrollera verklig körtid.' });
    remaining.splice(remaining.indexOf(best.job), 1);
  }
  return { stops, unassignedIds: remaining.map(job => job.id) };
}

export async function vroomPlan(
  assignments: Assignment[],
  drivers: Driver[],
  depot: Point,
  dayStart: string,
  endpoint: string,
  apiToken?: string,
) {
  if (assignments.some(job => !job.scheduled_end || Date.parse(job.scheduled_end) - Date.parse(job.scheduled_start) < 900000)) throw new Error("Ogiltigt tidsfönster");
  const skillNames = [
    ...new Set(
      assignments
        .flatMap((job) => job.route_skills ?? [])
        .concat(drivers.flatMap((driver) => driver.route_skills ?? [])),
    ),
  ];
  const skillId = new Map(skillNames.map((name, index) => [name, index + 1]));
  const jobByIndex = new Map(assignments.map((job, index) => [index + 1, job]));
  const driverByIndex = new Map(
    drivers.map((driver, index) => [index + 1, driver]),
  );
  const startSeconds = Math.floor(new Date(dayStart).getTime() / 1_000);
  const payload = {
    jobs: assignments
      .filter((job) => point(job))
      .map((job, index) => ({
        id: index + 1,
        location: [job.geofence_lng, job.geofence_lat],
        delivery: [job.route_demand],
        skills: (job.route_skills ?? []).map((skill) => skillId.get(skill)),
        service: 900,
        time_windows: [
          [
            Math.floor(new Date(job.scheduled_start).getTime() / 1_000),
            Math.floor(
              new Date(job.scheduled_end ?? job.scheduled_start).getTime() /
                1_000,
            ) - 900,
          ],
        ],
      })),
    vehicles: drivers.map((driver, index) => ({
      id: index + 1,
      start: [depot.lng, depot.lat],
      end: [depot.lng, depot.lat],
      capacity: [driver.route_capacity],
      skills: (driver.route_skills ?? []).map((skill) => skillId.get(skill)),
      time_window: [startSeconds, startSeconds + 18 * 3_600],
    })),
  };
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
  const result = await fetch(endpoint.replace(/\/$/, "") + "/", {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers,
    body: JSON.stringify(payload),
  });
  if (!result.ok) throw new Error(`VROOM svarade ${result.status}`);
  const body = await result.json();
  if (body.code !== 0)
    throw new Error(body.error ?? "VROOM kunde inte optimera rutten");

  const stops: PlannedStop[] = [];
  for (const route of body.routes ?? []) {
    const driver = driverByIndex.get(route.vehicle);
    if (!driver) throw new Error("Unknown driver");
    let sequence = 0;
    let previousDistance = 0; let previousDuration = 0;
    let usedCapacity = 0; let previousDeparture = -Infinity;
    for (const step of route.steps ?? []) {
      if (step.type !== "job") continue;
      const job = jobByIndex.get(step.id);
      if (!job || stops.some(stop => stop.assignmentId === job.id)) throw new Error("Invalid or duplicate job");
      const arrival = (step.arrival + (step.waiting_time ?? 0)) * 1000;
      if (!Number.isFinite(arrival) || arrival < Date.parse(job.scheduled_start) || arrival + 900000 > Date.parse(job.scheduled_end!)) throw new Error("Invalid arrival");
      usedCapacity += job.route_demand;
      if (usedCapacity > driver.route_capacity || !(job.route_skills ?? []).every(skill => (driver.route_skills ?? []).includes(skill)) || arrival < previousDeparture) throw new Error("Infeasible route");
      previousDeparture = arrival + 900000;
      sequence += 1;
      stops.push({
        assignmentId: job.id,
        driverId: driver.id,
        vehicleId: job.vehicle_id,
        sequence,
        arrivalAt: step.arrival
          ? new Date(arrival).toISOString()
          : null,
        departureAt: step.arrival
          ? new Date(
              (step.arrival + (step.waiting_time ?? 0) + (step.service ?? 900)) * 1_000,
            ).toISOString()
          : null,
        distanceM: Math.max(0, (step.distance ?? 0) - previousDistance),
        durationS: Math.max(0, (step.duration ?? 0) - previousDuration),
        reason: "Optimerad av VROOM med kapacitet, kompetens och tidsfönster.",
      });
      previousDistance = step.distance ?? 0; previousDuration = step.duration ?? 0;
    }
  }
  if (!Number.isFinite(body.summary?.distance) || body.summary.distance < 0 || !Number.isFinite(body.summary?.duration) || body.summary.duration < 0) throw new Error("Invalid route metrics");
  const assignedIds = new Set(stops.map((stop) => stop.assignmentId));
  return {
    stops,
    unassignedIds: assignments
      .filter((job) => !assignedIds.has(job.id))
      .map((job) => job.id),
    distanceM: body.summary?.distance ?? null,
    durationS: body.summary?.duration ?? null,
  };
}

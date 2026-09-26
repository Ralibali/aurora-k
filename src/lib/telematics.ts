export type FleetPoint = {
  vehicle_id: string | null;
  assignment_id: string | null;
  latitude: number;
  longitude: number;
  speed: number | null;
  source: string;
  recorded_at: string;
};

export type VehicleLabel = {
  id: string;
  name: string;
  registration_number: string | null;
};

export type VehicleTelemetrySummary = {
  vehicleId: string;
  name: string;
  registrationNumber: string | null;
  distanceKm: number;
  points: number;
  lastSeenAt: string;
  source: string;
  maxSpeedKmh: number | null;
};

export type AssignmentTripSummary = {
  assignmentId: string;
  vehicleId: string;
  vehicleName: string;
  startedAt: string;
  endedAt: string;
  distanceKm: number;
  points: number;
};

const radians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceKmBetween(a: Pick<FleetPoint, "latitude" | "longitude">, b: Pick<FleetPoint, "latitude" | "longitude">) {
  const earthRadiusKm = 6371;
  const dLat = radians(b.latitude - a.latitude);
  const dLon = radians(b.longitude - a.longitude);
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(h));
}

function distanceFor(points: FleetPoint[]) {
  let km = 0;
  for (let index = 1; index < points.length; index += 1) {
    km += distanceKmBetween(points[index - 1], points[index]);
  }
  return km;
}

export function summarizeVehicles(points: FleetPoint[], vehicles: VehicleLabel[]): VehicleTelemetrySummary[] {
  const labels = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const grouped = new Map<string, FleetPoint[]>();

  for (const point of points) {
    if (!point.vehicle_id) continue;
    const current = grouped.get(point.vehicle_id) ?? [];
    current.push(point);
    grouped.set(point.vehicle_id, current);
  }

  return [...grouped.entries()]
    .map(([vehicleId, entries]) => {
      const sorted = [...entries].sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at));
      const label = labels.get(vehicleId);
      const speeds = sorted.map((point) => point.speed).filter((speed): speed is number => typeof speed === "number");
      const sources = new Set(sorted.map((point) => point.source));
      return {
        vehicleId,
        name: label?.name ?? "Okänt fordon",
        registrationNumber: label?.registration_number ?? null,
        distanceKm: distanceFor(sorted),
        points: sorted.length,
        lastSeenAt: sorted.at(-1)?.recorded_at ?? "",
        source: sources.size === 1 ? [...sources][0] : "blandad",
        maxSpeedKmh: speeds.length ? Math.max(...speeds) : null,
      };
    })
    .sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));
}

export function summarizeTrips(points: FleetPoint[], vehicles: VehicleLabel[]): AssignmentTripSummary[] {
  const labels = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]));
  const grouped = new Map<string, FleetPoint[]>();

  for (const point of points) {
    if (!point.assignment_id || !point.vehicle_id) continue;
    const key = `${point.assignment_id}:${point.vehicle_id}`;
    const current = grouped.get(key) ?? [];
    current.push(point);
    grouped.set(key, current);
  }

  return [...grouped.entries()]
    .map(([, entries]) => {
      const sorted = [...entries].sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at));
      const first = sorted[0];
      const last = sorted.at(-1)!;
      const label = labels.get(first.vehicle_id!);
      return {
        assignmentId: first.assignment_id!,
        vehicleId: first.vehicle_id!,
        vehicleName: label?.name ?? "Okänt fordon",
        startedAt: first.recorded_at,
        endedAt: last.recorded_at,
        distanceKm: distanceFor(sorted),
        points: sorted.length,
      };
    })
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

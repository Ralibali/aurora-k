import { describe, expect, it } from "vitest";
import { distanceKmBetween, summarizeTrips, summarizeVehicles, type FleetPoint } from "./telematics";

const points: FleetPoint[] = [
  { vehicle_id: "v1", assignment_id: "a1", latitude: 58.4108, longitude: 15.6214, speed: 30, source: "traccar", recorded_at: "2026-09-26T08:00:00Z" },
  { vehicle_id: "v1", assignment_id: "a1", latitude: 58.4208, longitude: 15.6314, speed: 48, source: "traccar", recorded_at: "2026-09-26T08:10:00Z" },
  { vehicle_id: "v1", assignment_id: "a2", latitude: 58.4308, longitude: 15.6414, speed: 20, source: "phone", recorded_at: "2026-09-26T09:00:00Z" },
];

describe("telematics", () => {
  it("beräknar rimligt avstånd", () => {
    const km = distanceKmBetween(points[0], points[1]);
    expect(km).toBeGreaterThan(1);
    expect(km).toBeLessThan(2);
  });

  it("summerar fordon och källor", () => {
    const [summary] = summarizeVehicles(points, [{ id: "v1", name: "Bil 1", registration_number: "ABC123" }]);
    expect(summary.name).toBe("Bil 1");
    expect(summary.points).toBe(3);
    expect(summary.source).toBe("blandad");
    expect(summary.maxSpeedKmh).toBe(48);
  });

  it("skapar körjournal per uppdrag", () => {
    const trips = summarizeTrips(points, [{ id: "v1", name: "Bil 1", registration_number: null }]);
    expect(trips).toHaveLength(2);
    expect(trips.find((trip) => trip.assignmentId === "a1")?.points).toBe(2);
  });
});

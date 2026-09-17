import { describe, expect, it } from "vitest";
import {
  savedDistancePercent,
  savedDurationPercent,
  savedDurationSeconds,
} from "./route-metrics";

describe("route savings metrics", () => {
  it("reports the rounded distance improvement", () => {
    expect(savedDistancePercent(10_000, 7_400)).toBe(26);
  });

  it("reports saved driving time", () => {
    expect(savedDurationSeconds(7_200, 5_400)).toBe(1_800);
    expect(savedDurationPercent(7_200, 5_400)).toBe(25);
  });

  it("does not claim savings when the route grew or lacks a baseline", () => {
    expect(savedDistancePercent(5_000, 6_000)).toBe(0);
    expect(savedDistancePercent(null, 2_000)).toBe(0);
    expect(savedDurationSeconds(3_600, 4_000)).toBe(0);
    expect(savedDurationSeconds(null, 2_000)).toBe(0);
    expect(savedDurationPercent(3_600, 4_000)).toBe(0);
  });
});

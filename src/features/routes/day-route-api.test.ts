import { describe, expect, it } from "vitest";
import { savedDistancePercent } from "./route-metrics";

describe("savedDistancePercent", () => {
  it("reports the rounded improvement", () => {
    expect(savedDistancePercent(10_000, 7_400)).toBe(26);
  });

  it("does not claim savings when the route grew or lacks a baseline", () => {
    expect(savedDistancePercent(5_000, 6_000)).toBe(0);
    expect(savedDistancePercent(null, 2_000)).toBe(0);
  });
});

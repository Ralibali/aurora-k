import { describe, expect, it } from "vitest";
import { aggregateRoutePlanRoi, routePlanSavings } from "./route-roi";

describe("SmartPlan ROI", () => {
  it("only counts positive comparable savings", () => {
    expect(
      routePlanSavings({
        status: "approved",
        optimizer_provider: "aurora",
        distance_before_m: 20000,
        distance_after_m: 15000,
        duration_before_s: 3600,
        duration_after_s: 3000,
      }),
    ).toEqual({
      distanceSavedM: 5000,
      durationSavedS: 600,
      comparableDistance: true,
      comparableDuration: true,
    });
  });

  it("aggregates accepted plans and ignores proposals", () => {
    const result = aggregateRoutePlanRoi([
      {
        status: "approved",
        optimizer_provider: "aurora",
        distance_before_m: 20000,
        distance_after_m: 15000,
        duration_before_s: 3600,
        duration_after_s: 3000,
      },
      {
        status: "superseded",
        optimizer_provider: "vroom",
        distance_before_m: null,
        distance_after_m: 12000,
        duration_before_s: null,
        duration_after_s: 2200,
      },
      {
        status: "proposed",
        optimizer_provider: "aurora",
        distance_before_m: 10000,
        distance_after_m: 5000,
        duration_before_s: 2000,
        duration_after_s: 1000,
      },
    ]);

    expect(result).toEqual({
      acceptedPlans: 2,
      comparablePlans: 1,
      totalDistanceSavedM: 5000,
      totalDurationSavedS: 600,
      vroomPlans: 1,
    });
  });
});

export type RoutePlanForRoi = {
  status: string;
  optimizer_provider: string;
  distance_before_m: number | null;
  distance_after_m: number | null;
  duration_before_s: number | null;
  duration_after_s: number | null;
};

export function routePlanSavings(plan: RoutePlanForRoi) {
  const distanceSavedM =
    plan.distance_before_m != null &&
    plan.distance_after_m != null &&
    plan.distance_before_m > plan.distance_after_m
      ? plan.distance_before_m - plan.distance_after_m
      : 0;
  const durationSavedS =
    plan.duration_before_s != null &&
    plan.duration_after_s != null &&
    plan.duration_before_s > plan.duration_after_s
      ? plan.duration_before_s - plan.duration_after_s
      : 0;

  return {
    distanceSavedM,
    durationSavedS,
    comparableDistance:
      plan.distance_before_m != null && plan.distance_after_m != null,
    comparableDuration:
      plan.duration_before_s != null && plan.duration_after_s != null,
  };
}

export function aggregateRoutePlanRoi(plans: RoutePlanForRoi[]) {
  const accepted = plans.filter((plan) =>
    ["approved", "superseded"].includes(plan.status),
  );
  const savings = accepted.map(routePlanSavings);
  const comparablePlans = savings.filter(
    (item) => item.comparableDistance || item.comparableDuration,
  ).length;

  return {
    acceptedPlans: accepted.length,
    comparablePlans,
    totalDistanceSavedM: savings.reduce(
      (sum, item) => sum + item.distanceSavedM,
      0,
    ),
    totalDurationSavedS: savings.reduce(
      (sum, item) => sum + item.durationSavedS,
      0,
    ),
    vroomPlans: accepted.filter(
      (plan) => plan.optimizer_provider === "vroom",
    ).length,
  };
}

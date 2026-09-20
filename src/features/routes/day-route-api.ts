import { supabase } from "@/integrations/supabase/client";

export type DayRouteStop = {
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

export type DayRoutePlan = {
  plan: {
    id: string;
    plan_date: string;
    optimizer_provider: "aurora" | "vroom";
    distance_before_m: number | null;
    distance_after_m: number | null;
    duration_before_s: number | null;
    duration_after_s: number | null;
    warning: string | null;
    status: "proposed" | "approved";
  };
  stops: DayRouteStop[];
  unassignedIds: string[];
};

export async function optimizeDayRoutes(
  planDate: string,
): Promise<DayRoutePlan> {
  const dayStart = new Date(`${planDate}T00:00:00`);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const { data, error } = await supabase.functions.invoke("optimize-routes", {
    body: {
      planDate,
      dayStart: dayStart.toISOString(),
      dayEnd: dayEnd.toISOString(),
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as DayRoutePlan;
}

export async function approveDayRoutePlan(planId: string) {
  const { data, error } = await supabase.rpc(
    "approve_route_plan" as never,
    { _plan_id: planId } as never,
  );
  if (error) throw error;
  return data;
}

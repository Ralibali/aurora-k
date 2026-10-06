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
  const { data, error } = await supabase.functions.invoke("optimize-routes", {
    body: {
      planDate,
    },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as DayRoutePlan;
}

export async function approveDayRoutePlan(planId: string) {
  const { data, error } = await supabase.rpc(
    "approve_route_plan" as never,
    { _plan_id: planId } as never,
  );
  if (error) throw new Error(error.message);
  return data;
}


export type RoutePlanHistoryItem = {
  id: string;
  plan_date: string;
  optimizer_provider: string;
  distance_before_m: number | null;
  distance_after_m: number | null;
  duration_before_s: number | null;
  duration_after_s: number | null;
  warning: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
};

export async function listRecentRoutePlans(
  limit = 30,
): Promise<RoutePlanHistoryItem[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const { data, error } = await supabase
    .from("route_plans")
    .select(
      "id,plan_date,optimizer_provider,distance_before_m,distance_after_m,duration_before_s,duration_after_s,warning,status,created_at,approved_at",
    )
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) throw new Error(error.message);
  return (data ?? []) as RoutePlanHistoryItem[];
}

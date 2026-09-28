import { point, routeDistance, fallbackPlan, vroomPlan, type Assignment, type Driver } from "./engine.ts";
import { stockholmDayBounds } from "./day.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return json({ error: "Logga in igen." }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = createClient(
      url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const token = authorization.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } =
      await service.auth.getUser(token);
    if (userError || !userData.user)
      return json({ error: "Ogiltig session." }, 401);
    const { data: role } = await service
      .from("user_roles")
      .select("company_id")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role?.company_id)
      return json({ error: "Administratörsbehörighet krävs." }, 403);

    const input = await request.json();
    const planDate = String(input.planDate ?? "");
    let bounds;
    try { bounds = stockholmDayBounds(planDate); } catch { return json({ error: "Ogiltigt datum." }, 400); }
    const { dayStart, dayEnd } = bounds;

    const [
      { data: assignments, error: assignmentError },
      { data: drivers, error: driverError },
      { data: company },
      { data: busyJobs, error: busyError },
    ] = await Promise.all([
      service
        .from("assignments")
        .select(
          "id,title,scheduled_start,scheduled_end,assigned_driver_id,vehicle_id,geofence_lat,geofence_lng,route_demand,route_skills,updated_at",
        )
        .eq("company_id", role.company_id)
        .gte("scheduled_start", dayStart)
        .lt("scheduled_start", dayEnd)
        .in("status", ["pending", "unassigned"]),
      service
        .from("profiles")
        .select("id,full_name,route_capacity,route_skills")
        .eq("company_id", role.company_id)
        .eq("role", "driver")
        .eq("is_available", true),
      service
        .from("companies")
        .select("depot_lat,depot_lng")
        .eq("id", role.company_id)
        .single(),
      service.from("assignments").select("assigned_driver_id").eq("company_id", role.company_id).in("status", ["active", "delayed"]),
    ]);
    if (assignmentError) throw assignmentError;
    if (driverError) throw driverError;
    if (busyError) throw busyError;
    if (!assignments?.length)
      return json({ error: "Inga öppna uppdrag finns för dagen." }, 400);
    if (!drivers?.length)
      return json({ error: "Inga tillgängliga chaufförer finns." }, 400);

    if (assignments.length > 200 || drivers.length > 50) return json({ error: "Dagsoptimeringen stödjer högst 200 uppdrag och 50 chaufförer per körning." }, 400);
    const jobs = assignments as Assignment[];
    const busyDriverIds = new Set((busyJobs ?? []).map(job => job.assigned_driver_id));
    const availableDrivers = (drivers as Driver[]).filter(driver => !busyDriverIds.has(driver.id));
    if (!availableDrivers.length) return json({ error: "Alla tillgängliga chaufförer har pågående eller försenade uppdrag." }, 400);
    const comparableBaseline = jobs.every(job => job.assigned_driver_id && availableDrivers.some(driver => driver.id === job.assigned_driver_id) && point(job));
    const depot =
      company?.depot_lat != null && company?.depot_lng != null
        ? point({ geofence_lat: Number(company.depot_lat), geofence_lng: Number(company.depot_lng) } as Assignment)
        : null;
    const beforeGroups = new Map<string, Assignment[]>();
    for (const job of jobs) {
      const key = job.assigned_driver_id ?? "unassigned";
      beforeGroups.set(key, [...(beforeGroups.get(key) ?? []), job]);
    }
    for (const group of beforeGroups.values())
      group.sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));
    const beforeDistance = routeDistance(beforeGroups, depot);

    let provider = "aurora";
    let warning: string | null = "Reservmotorn använder fågelväg och uppskattad hastighet, inte vägnät eller trafik. Kontrollera verkliga körtider före godkännande.";
    let result;
    const vroomUrl = Deno.env.get("VROOM_BASE_URL");
    if (vroomUrl && depot && jobs.every((job) => point(job))) {
      try {
        result = await vroomPlan(
          jobs,
          availableDrivers,
          depot,
          dayStart,
          vroomUrl,
          Deno.env.get("VROOM_API_TOKEN"),
        );
        provider = "vroom";
        warning = "Vägavstånd visas från VROOM. Jämförbar baslinje saknas; ingen procentuell besparing beräknas.";
      } catch (error) {
        console.warn("[optimize-routes] VROOM fallback", error);
        warning =
          "VROOM gav inget användbart svar. Reservmotorn använder fågelväg, 50 km/h och 15 min stopp; kontrollera verkliga körtider.";
      }
    }
    const fallback = !result
      ? fallbackPlan(jobs, availableDrivers, depot, dayStart)
      : null;
    const stops = result?.stops ?? fallback!.stops;
    const afterGroups = new Map<string, Assignment[]>();
    for (const stop of stops) {
      const job = jobs.find((item) => item.id === stop.assignmentId)!;
      afterGroups.set(stop.driverId, [
        ...(afterGroups.get(stop.driverId) ?? []),
        job,
      ]);
    }
    const afterDistance =
      result?.distanceM ?? routeDistance(afterGroups, depot);
    const durationAfter = result?.durationS ?? Math.round(afterDistance / 13.9);
    const unassignedIds = result?.unassignedIds ?? fallback!.unassignedIds;
    if (!depot)
      warning = [
        warning,
        "Giltiga depåkoordinater saknas. Ange företagets depå innan du optimerar dagen.",
      ]
        .filter(Boolean)
        .join(" ");

    const { data: plan, error: planError } = await service
      .from("route_plans")
      .insert({
        company_id: role.company_id,
        plan_date: planDate,
        optimizer_provider: provider,
        distance_before_m: !depot || !comparableBaseline || provider === "vroom" || unassignedIds.length > 0 ? null : beforeDistance,
        distance_after_m: depot ? afterDistance : null,
        duration_before_s: !depot || !comparableBaseline || provider === "vroom" || unassignedIds.length > 0 ? null : Math.round(beforeDistance / 13.9),
        duration_after_s: depot ? durationAfter : null,
        input_snapshot: {
          assignments: jobs,
          drivers: availableDrivers,
          assignmentIds: jobs.map((job) => job.id),
          driverIds: availableDrivers.map((driver) => driver.id),
          dayStart,
          dayEnd,
        },
        output_snapshot: { unassignedIds },
        warning,
        created_by: userData.user.id,
      })
      .select("*")
      .single();
    if (planError) throw planError;
    const { error: stopError } = stops.length ? await service.from("route_plan_stops").insert(
      stops.map((stop) => ({
        company_id: role.company_id,
        route_plan_id: plan.id,
        assignment_id: stop.assignmentId,
        driver_id: stop.driverId,
        vehicle_id: stop.vehicleId,
        sequence: stop.sequence,
        planned_arrival_at: stop.arrivalAt,
        planned_departure_at: stop.departureAt,
        distance_from_previous_m: stop.distanceM,
        duration_from_previous_s: stop.durationS,
        optimization_reason: stop.reason,
      })),
    ) : { error: null };
    if (stopError) {
      await service.from("route_plans").delete().eq("id", plan.id);
      throw stopError;
    }
    return json({ plan, stops, unassignedIds });
  } catch (error) {
    console.error("[optimize-routes]", error);
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ruttförslaget kunde inte skapas.",
      },
      500,
    );
  }
});

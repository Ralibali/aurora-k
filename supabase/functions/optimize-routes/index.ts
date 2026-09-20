import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Point = { lat: number; lng: number };
type Assignment = {
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
type Driver = {
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

function point(item?: Assignment | null): Point | null {
  return !item || item.geofence_lat == null || item.geofence_lng == null
    ? null
    : { lat: item.geofence_lat, lng: item.geofence_lng };
}

function routeDistance(groups: Map<string, Assignment[]>, depot: Point | null) {
  let total = 0;
  for (const jobs of groups.values()) {
    let previous = depot;
    for (const job of jobs) {
      total += distance(previous, point(job));
      previous = point(job) ?? previous;
    }
  }
  return total;
}

function fallbackPlan(
  assignments: Assignment[],
  drivers: Driver[],
  depot: Point | null,
  dayStart: string,
) {
  const remaining = [...assignments];
  const routes = new Map(
    drivers.map((driver) => [driver.id, [] as Assignment[]]),
  );
  const usedCapacity = new Map(drivers.map((driver) => [driver.id, 0]));

  while (remaining.length) {
    let best: { driver: Driver; job: Assignment; score: number } | null = null;
    for (const driver of drivers) {
      const current = routes.get(driver.id)!;
      const last = current.at(-1);
      const origin = last ? point(last) : depot;
      for (const job of remaining) {
        const hasSkills = (job.route_skills ?? []).every((skill) =>
          (driver.route_skills ?? []).includes(skill),
        );
        if (
          !hasSkills ||
          (usedCapacity.get(driver.id) ?? 0) + job.route_demand >
            driver.route_capacity
        )
          continue;
        const score = distance(origin, point(job)) + current.length * 250;
        if (!best || score < best.score) best = { driver, job, score };
      }
    }
    if (!best) break;
    routes.get(best.driver.id)!.push(best.job);
    usedCapacity.set(
      best.driver.id,
      (usedCapacity.get(best.driver.id) ?? 0) + best.job.route_demand,
    );
    remaining.splice(
      remaining.findIndex((job) => job.id === best!.job.id),
      1,
    );
  }

  const stops: PlannedStop[] = [];
  for (const [driverId, jobs] of routes) {
    let previous = depot;
    let cursor = new Date(dayStart).getTime();
    jobs.forEach((job, index) => {
      const leg = distance(previous, point(job));
      const duration = Math.round(leg / 13.9);
      cursor = Math.max(
        cursor + duration * 1_000,
        new Date(job.scheduled_start).getTime(),
      );
      stops.push({
        assignmentId: job.id,
        driverId,
        vehicleId: job.vehicle_id,
        sequence: index + 1,
        arrivalAt: new Date(cursor).toISOString(),
        departureAt: new Date(cursor + 15 * 60_000).toISOString(),
        distanceM: leg,
        durationS: duration,
        reason: point(job)
          ? "Närmaste lämpliga stopp med kapacitet och kompetens."
          : "Saknar koordinat; placerad efter tidsfönster.",
      });
      cursor += 15 * 60_000;
      previous = point(job) ?? previous;
    });
  }
  return { stops, unassignedIds: remaining.map((job) => job.id), routes };
}

async function vroomPlan(
  assignments: Assignment[],
  drivers: Driver[],
  depot: Point,
  dayStart: string,
  endpoint: string,
) {
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
            ) + 3_600,
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
  const apiToken = Deno.env.get("VROOM_API_TOKEN");
  if (apiToken) headers.Authorization = `Bearer ${apiToken}`;
  const result = await fetch(endpoint.replace(/\/$/, "") + "/", {
    method: "POST",
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
    if (!driver) continue;
    let sequence = 0;
    for (const step of route.steps ?? []) {
      if (step.type !== "job") continue;
      const job = jobByIndex.get(step.id);
      if (!job) continue;
      sequence += 1;
      stops.push({
        assignmentId: job.id,
        driverId: driver.id,
        vehicleId: job.vehicle_id,
        sequence,
        arrivalAt: step.arrival
          ? new Date(step.arrival * 1_000).toISOString()
          : null,
        departureAt: step.arrival
          ? new Date(
              (step.arrival + (step.service ?? 900)) * 1_000,
            ).toISOString()
          : null,
        distanceM: step.distance ?? 0,
        durationS: step.duration ?? 0,
        reason: "Optimerad av VROOM med kapacitet, kompetens och tidsfönster.",
      });
    }
  }
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
    const dayStart = String(input.dayStart ?? "");
    const dayEnd = String(input.dayEnd ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(planDate) || !dayStart || !dayEnd)
      return json({ error: "Ogiltigt datum." }, 400);

    const [
      { data: assignments, error: assignmentError },
      { data: drivers, error: driverError },
      { data: company },
    ] = await Promise.all([
      service
        .from("assignments")
        .select(
          "id,title,scheduled_start,scheduled_end,assigned_driver_id,vehicle_id,geofence_lat,geofence_lng,route_demand,route_skills",
        )
        .eq("company_id", role.company_id)
        .gte("scheduled_start", dayStart)
        .lt("scheduled_start", dayEnd)
        .in("status", ["pending", "unassigned", "active", "delayed"]),
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
    ]);
    if (assignmentError) throw assignmentError;
    if (driverError) throw driverError;
    if (!assignments?.length)
      return json({ error: "Inga öppna uppdrag finns för dagen." }, 400);
    if (!drivers?.length)
      return json({ error: "Inga tillgängliga chaufförer finns." }, 400);

    const jobs = assignments as Assignment[];
    const availableDrivers = drivers as Driver[];
    const depot =
      company?.depot_lat != null && company?.depot_lng != null
        ? { lat: Number(company.depot_lat), lng: Number(company.depot_lng) }
        : point(jobs.find((job) => point(job))!);
    const beforeGroups = new Map<string, Assignment[]>();
    for (const job of jobs) {
      const key = job.assigned_driver_id ?? "unassigned";
      beforeGroups.set(key, [...(beforeGroups.get(key) ?? []), job]);
    }
    for (const group of beforeGroups.values())
      group.sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));
    const beforeDistance = routeDistance(beforeGroups, depot);

    let provider = "aurora";
    let warning: string | null = null;
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
        );
        provider = "vroom";
      } catch (error) {
        console.warn("[optimize-routes] VROOM fallback", error);
        warning =
          "VROOM var inte tillgängligt. Aurora-förslaget visas istället.";
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
        "Ingen depå eller uppdragskoordinat finns; avstånd kan inte beräknas.",
      ]
        .filter(Boolean)
        .join(" ");

    const { data: plan, error: planError } = await service
      .from("route_plans")
      .insert({
        company_id: role.company_id,
        plan_date: planDate,
        optimizer_provider: provider,
        distance_before_m: beforeDistance,
        distance_after_m: afterDistance,
        duration_before_s: Math.round(beforeDistance / 13.9),
        duration_after_s: durationAfter,
        input_snapshot: {
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
    const { error: stopError } = await service.from("route_plan_stops").insert(
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
    );
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

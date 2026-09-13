import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function safeEqual(actual: string, expected: string) {
  const encoder = new TextEncoder();
  const left = encoder.encode(actual);
  const right = encoder.encode(expected);
  let mismatch = left.length ^ right.length;
  const size = Math.max(left.length, right.length);
  for (let index = 0; index < size; index += 1)
    mismatch |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return mismatch === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  const expectedSecret = Deno.env.get("FLEET_WEBHOOK_SECRET");
  const suppliedSecret = request.headers.get("x-fleet-webhook-secret") ?? "";
  if (!expectedSecret || !safeEqual(suppliedSecret, expectedSecret))
    return json({ error: "Unauthorized" }, 401);

  try {
    const body = await request.json();
    const position = body.position ?? body;
    const device = body.device ?? body;
    const externalId = String(
      device.uniqueId ?? position.uniqueId ?? position.deviceId ?? "",
    ).trim();
    const latitude = Number(position.latitude);
    const longitude = Number(position.longitude);
    if (
      !externalId ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    )
      return json({ error: "Device ID and coordinates are required" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id,company_id")
      .eq("external_tracking_device_id", externalId)
      .maybeSingle();
    if (vehicleError) throw vehicleError;
    if (!vehicle) return json({ error: "Unknown device" }, 404);

    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("id,assigned_driver_id")
      .eq("company_id", vehicle.company_id)
      .eq("vehicle_id", vehicle.id)
      .in("status", ["active", "delayed"])
      .not("actual_start", "is", null)
      .order("actual_start", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assignmentError) throw assignmentError;
    if (!assignment?.assigned_driver_id)
      return json({ accepted: true, tracked: false });

    const recordedAt =
      position.fixTime ??
      position.deviceTime ??
      position.serverTime ??
      new Date().toISOString();
    const heading = Number.isFinite(Number(position.course))
      ? Number(position.course)
      : null;
    const speed = Number.isFinite(Number(position.speed))
      ? Number(position.speed) * 1.852
      : null;
    const accuracy = Number.isFinite(Number(position.accuracy))
      ? Number(position.accuracy)
      : null;
    const payload = {
      company_id: vehicle.company_id,
      driver_id: assignment.assigned_driver_id,
      assignment_id: assignment.id,
      vehicle_id: vehicle.id,
      latitude,
      longitude,
      heading,
      speed,
    };
    const [
      { error: liveError },
      { error: historyError },
      { error: providerError },
    ] = await Promise.all([
      supabase
        .from("driver_locations")
        .upsert(
          { ...payload, updated_at: recordedAt },
          { onConflict: "driver_id" },
        ),
      supabase
        .from("fleet_location_history")
        .insert({
          ...payload,
          accuracy,
          source: "traccar",
          recorded_at: recordedAt,
        }),
      supabase.from("fleet_provider_connections").upsert(
        {
          company_id: vehicle.company_id,
          provider: "traccar",
          status: "active",
          last_event_at: new Date().toISOString(),
          last_error: null,
        },
        { onConflict: "company_id,provider" },
      ),
    ]);
    if (liveError) throw liveError;
    if (historyError) throw historyError;
    if (providerError)
      console.warn(
        "[fleet-provider-webhook] provider status update failed",
        providerError,
      );
    return json({ accepted: true, tracked: true });
  } catch (error) {
    console.error("[fleet-provider-webhook]", error);
    return json({ error: "Positionen kunde inte sparas" }, 500);
  }
});

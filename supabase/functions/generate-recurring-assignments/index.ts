// Generate concrete `assignments` rows from active `recurring_assignment_series`.
// Idempotent via UNIQUE(series_id, series_date) — safe to call from pg_cron every hour or on demand.
// Auth: service role bearer OR admin JWT (only generates for admin's own company then).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

type Series = {
  id: string;
  company_id: string;
  customer_id: string;
  assigned_driver_id: string;
  vehicle_id: string | null;
  title: string;
  address: string;
  instructions: string | null;
  priority: string;
  scheduled_time: string; // HH:MM:SS
  duration_minutes: number;
  frequency: "daily" | "weekly" | "monthly";
  weekdays: number[];
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  active: boolean;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function occurrenceMatches(series: Series, date: Date): boolean {
  const iso = isoDate(date);
  if (iso < series.start_date) return false;
  if (series.end_date && iso > series.end_date) return false;
  if (series.frequency === "daily") return true;
  if (series.frequency === "weekly") {
    return Array.isArray(series.weekdays) && series.weekdays.includes(date.getUTCDay());
  }
  if (series.frequency === "monthly") {
    if (!series.day_of_month) return false;
    // Clamp to last day of month
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth();
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const target = Math.min(series.day_of_month, lastDay);
    return date.getUTCDate() === target;
  }
  return false;
}

function buildScheduledStart(dateIso: string, time: string): string {
  // Store in UTC — server is Europe/Stockholm business hours but storing UTC preserves the wall clock via TZ config on client
  const [h = "08", mi = "00", s = "00"] = time.split(":");
  return `${dateIso}T${h.padStart(2, "0")}:${mi.padStart(2, "0")}:${s.padStart(2, "0")}Z`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "missing bearer token" });

  const isServiceRole = token === SERVICE_KEY;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  let restrictCompanyId: string | null = null;
  let triggeredByUser: string | null = null;
  let triggeredBy: "cron" | "admin" | "service" = isServiceRole ? "cron" : "admin";
  const startedAt = new Date().toISOString();

  if (!isServiceRole) {
    // Validate user + admin role
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: "invalid token" });
    const { data: profile } = await admin
      .from("profiles")
      .select("company_id, role")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (!profile?.company_id || profile.role !== "admin") {
      return json(403, { error: "admin role required" });
    }
    restrictCompanyId = profile.company_id as string;
    triggeredByUser = userData.user.id;
    triggeredBy = "admin";
  }

  async function logRun(row: {
    generated: number;
    considered: number;
    series_count: number;
    horizon_days: number | null;
    status: "success" | "error";
    error?: string | null;
  }) {
    try {
      await admin.from("recurring_generation_runs").insert({
        company_id: restrictCompanyId,
        triggered_by: triggeredBy,
        triggered_by_user: triggeredByUser,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        generated: row.generated,
        considered: row.considered,
        series_count: row.series_count,
        horizon_days: row.horizon_days,
        status: row.status,
        error: row.error ?? null,
      });
    } catch (e) {
      console.error("log run failed", e);
    }
  }

  let body: { horizon_days?: number; series_id?: string } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }
  const horizonDays = Math.min(Math.max(body.horizon_days ?? 14, 1), 60);

  let query = admin
    .from("recurring_assignment_series")
    .select("*")
    .eq("active", true);
  if (restrictCompanyId) query = query.eq("company_id", restrictCompanyId);
  if (body.series_id) query = query.eq("id", body.series_id);

  const { data: series, error: seriesErr } = await query;
  if (seriesErr) {
    await logRun({ generated: 0, considered: 0, series_count: 0, horizon_days: horizonDays, status: "error", error: seriesErr.message });
    return json(500, { error: seriesErr.message });
  }
  if (!series || series.length === 0) {
    await logRun({ generated: 0, considered: 0, series_count: 0, horizon_days: horizonDays, status: "success" });
    return json(200, { generated: 0, series: 0 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dates: Date[] = [];
  for (let i = 0; i < horizonDays; i++) dates.push(addDays(today, i));

  type Row = {
    series_id: string;
    series_date: string;
    company_id: string;
    customer_id: string;
    assigned_driver_id: string;
    vehicle_id: string | null;
    title: string;
    address: string;
    instructions: string | null;
    priority: string;
    scheduled_start: string;
    scheduled_end: string;
    status: string;
  };

  const rows: Row[] = [];
  for (const s of series as Series[]) {
    for (const d of dates) {
      if (!occurrenceMatches(s, d)) continue;
      const dateIso = isoDate(d);
      const start = buildScheduledStart(dateIso, s.scheduled_time);
      const end = new Date(new Date(start).getTime() + s.duration_minutes * 60_000).toISOString();
      rows.push({
        series_id: s.id,
        series_date: dateIso,
        company_id: s.company_id,
        customer_id: s.customer_id,
        assigned_driver_id: s.assigned_driver_id,
        vehicle_id: s.vehicle_id,
        title: s.title,
        address: s.address,
        instructions: s.instructions,
        priority: s.priority,
        scheduled_start: start,
        scheduled_end: end,
        status: "pending",
      });
    }
  }

  if (rows.length === 0) {
    await logRun({ generated: 0, considered: 0, series_count: series.length, horizon_days: horizonDays, status: "success" });
    return json(200, { generated: 0, series: series.length });
  }

  // Idempotent via unique(series_id, series_date). Use upsert with ignoreDuplicates.
  const { data, error } = await admin
    .from("assignments")
    .upsert(rows, { onConflict: "series_id,series_date", ignoreDuplicates: true })
    .select("id");

  if (error) {
    await logRun({ generated: 0, considered: rows.length, series_count: series.length, horizon_days: horizonDays, status: "error", error: error.message });
    return json(500, { error: error.message });
  }

  const generated = data?.length ?? 0;
  await logRun({ generated, considered: rows.length, series_count: series.length, horizon_days: horizonDays, status: "success" });
  return json(200, {
    generated: data?.length ?? 0,
    considered: rows.length,
    series: series.length,
    horizon_days: horizonDays,
  });
});
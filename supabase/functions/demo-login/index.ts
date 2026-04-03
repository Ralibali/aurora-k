import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_COMPANIES = [
  {
    name: "Demo Åkeri AB",
    orgNr: "556000-0001",
    admin: { email: "demo-akeri@aurora.test", password: "DemoAkeri2026!", fullName: "Anna Lindberg" },
    drivers: [
      { email: "karl@aurora.test", password: "DemoDriver2026!", fullName: "Karl Johansson" },
    ],
    customers: [
      { name: "Byggbolaget Norden AB", contact_person: "Erik Holm", email: "erik@byggnorden.se", phone: "070-111 22 33", visit_address: "Industrigatan 12, Göteborg" },
      { name: "Livsmedel Express AB", contact_person: "Sara Nyström", email: "sara@livsmedel.se", phone: "073-444 55 66", visit_address: "Hamngatan 5, Stockholm" },
    ],
    assignments: [
      { title: "Leverans betongblock", address: "Byggvägen 8, Mölndal", status: "completed", priority: "high" },
      { title: "Hämta pallgods", address: "Hamnen, Göteborg", status: "in_progress", priority: "normal" },
      { title: "Expressleverans kyl", address: "Kungsgatan 22, Stockholm", status: "pending", priority: "urgent" },
    ],
  },
  {
    name: "Demo Bemanning AB",
    orgNr: "556000-0002",
    admin: { email: "demo-bemanning@aurora.test", password: "DemoBemanning2026!", fullName: "Maria Eriksson" },
    drivers: [
      { email: "johan@aurora.test", password: "DemoDriver2026!", fullName: "Johan Svensson" },
    ],
    customers: [
      { name: "Stadstransport AB", contact_person: "Per Olsson", email: "per@stadstransport.se", phone: "070-222 33 44", visit_address: "Storgatan 1, Malmö" },
    ],
    assignments: [
      { title: "Personaltransport morgon", address: "Centralen, Malmö", status: "pending", priority: "normal" },
      { title: "Kvällstur lager", address: "Lagervägen 3, Lund", status: "completed", priority: "normal" },
    ],
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type } = await req.json().catch(() => ({ type: "akeri" }));
    const demo = type === "bemanning" ? DEMO_COMPANIES[1] : DEMO_COMPANIES[0];

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Ensure demo company exists
    const { data: existingCompany } = await admin
      .from("companies")
      .select("id")
      .eq("org_nr", demo.orgNr)
      .maybeSingle();

    let companyId: string;
    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const { data: newCompany, error: compErr } = await admin
        .from("companies")
        .insert({ name: demo.name, org_nr: demo.orgNr, subscription_status: "active", onboarding_completed: true })
        .select("id")
        .single();
      if (compErr) throw compErr;
      companyId = newCompany.id;

      // Create settings
      await admin.from("settings").insert({
        company_id: companyId,
        company_name: demo.name,
        org_number: demo.orgNr,
      });
    }

    // Helper: ensure user exists
    async function ensureUser(u: { email: string; password: string; fullName: string }, role: "admin" | "driver") {
      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((x: any) => x.email === u.email);

      let userId: string;
      if (existing) {
        userId = existing.id;
        // Reset password in case it changed
        await admin.auth.admin.updateUserById(userId, { password: u.password });
      } else {
        const { data, error } = await admin.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.fullName },
        });
        if (error) throw error;
        userId = data.user.id;
      }

      await admin.from("profiles").upsert({
        id: userId,
        email: u.email,
        full_name: u.fullName,
        role,
        company_id: companyId,
      }, { onConflict: "id" });

      const { data: existingRole } = await admin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", role)
        .maybeSingle();
      if (!existingRole) {
        await admin.from("user_roles").insert({ user_id: userId, role, company_id: companyId });
      }

      return userId;
    }

    // Create admin
    const adminUserId = await ensureUser(demo.admin, "admin");

    // Create drivers
    const driverIds: string[] = [];
    for (const d of demo.drivers) {
      const did = await ensureUser(d, "driver");
      driverIds.push(did);
    }

    // Seed customers if none exist
    const { count: custCount } = await admin
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);

    const customerIds: string[] = [];
    if (!custCount || custCount === 0) {
      for (const c of demo.customers) {
        const { data: cust } = await admin
          .from("customers")
          .insert({ ...c, company_id: companyId })
          .select("id")
          .single();
        if (cust) customerIds.push(cust.id);
      }
    } else {
      const { data: existingCusts } = await admin
        .from("customers")
        .select("id")
        .eq("company_id", companyId)
        .limit(3);
      customerIds.push(...(existingCusts || []).map((c: any) => c.id));
    }

    // Seed assignments if none exist
    const { count: assCount } = await admin
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);

    if (!assCount || assCount === 0) {
      for (let i = 0; i < demo.assignments.length; i++) {
        const a = demo.assignments[i];
        const scheduledStart = new Date();
        scheduledStart.setHours(8 + i, 0, 0, 0);
        await admin.from("assignments").insert({
          ...a,
          company_id: companyId,
          customer_id: customerIds[i % customerIds.length],
          assigned_driver_id: driverIds[i % driverIds.length] || adminUserId,
          scheduled_start: scheduledStart.toISOString(),
        });
      }
    }

    return new Response(
      JSON.stringify({
        email: demo.admin.email,
        password: demo.admin.password,
        companyName: demo.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

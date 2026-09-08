import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is an admin
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Derive the tenant from the authenticated profile, then require its admin membership.
    const { data: profile, error: profileError } = await callerClient.from("profiles")
      .select("company_id").eq("id", caller.id).maybeSingle();
    if (profileError || !profile?.company_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roleData, error: roleError } = await callerClient.from("user_roles")
      .select("role").eq("user_id", caller.id).eq("company_id", profile.company_id).eq("role", "admin").maybeSingle();
    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const body = await req.json();
    const { email, full_name, password } = body;
    if (body.company_id && body.company_id !== profile.company_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254
      || typeof full_name !== "string" || !full_name.trim() || full_name.length > 200
      || typeof password !== "string" || password.length < 8 || password.length > 128) {
      return new Response(JSON.stringify({ error: "Ange namn, e-post och ett lösenord med minst 8 tecken." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const company_id = profile.company_id;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Create user
    const { data: userData, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role: "driver" },
      });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Insert role
    const { error: roleWriteError } = await adminClient.from("user_roles").upsert({
      user_id: userId,
      role: "driver",
      company_id,
    }, { onConflict: "user_id,role" });

    // Profile is auto-created by trigger, but ensure data is correct
    const { error: profileWriteError } = await adminClient.from("profiles").upsert({
      id: userId,
      email,
      full_name,
      role: "driver",
      company_id,
    }, { onConflict: "id" });

    if (roleWriteError || profileWriteError) {
      // A partially provisioned account must not be returned as ready to use.
      const { error: rollbackError } = await adminClient.auth.admin.deleteUser(userId);
      console.error("[create-driver] Provisioning failed", { roleWriteError, profileWriteError, rollbackError });
      return new Response(JSON.stringify({ error: "Förarkontot kunde inte skapas. Försök igen." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Kunde inte skapa föraren" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

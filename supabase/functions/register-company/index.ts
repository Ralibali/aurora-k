import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, companyName, orgNr, fullName } = await req.json();

    if (!userId || !companyName?.trim()) {
      return new Response(
        JSON.stringify({ error: "userId and companyName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure the caller can only register themselves
    if (caller.id !== userId) {
      return new Response(
        JSON.stringify({ error: "Forbidden — you can only register your own account" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check user doesn't already belong to a company
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();

    if (existingProfile?.company_id) {
      return new Response(
        JSON.stringify({ error: "User already belongs to a company", companyId: existingProfile.company_id }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create company
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert({ name: companyName.trim(), org_nr: orgNr || null, subscription_status: "pending" })
      .select()
      .single();

    if (companyError) {
      console.error("[register-company] Company create error:", companyError);
      return new Response(
        JSON.stringify({ error: "Failed to create company" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile
    await adminClient.from("profiles").upsert({
      id: userId,
      email: caller.email,
      full_name: fullName || caller.user_metadata?.full_name || "Admin",
      role: "admin",
      company_id: company.id,
    }, { onConflict: "id" });

    // Insert user_role
    await adminClient.from("user_roles").upsert({
      user_id: userId,
      role: "admin",
      company_id: company.id,
    }, { onConflict: "user_id,role" });

    console.log(`[register-company] Created company ${company.id} for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, companyId: company.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[register-company] Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

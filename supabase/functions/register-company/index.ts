import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2.100.1/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { userId, companyName, orgNr, fullName } = await req.json();

    if (!userId || !companyName?.trim()) {
      return new Response(
        JSON.stringify({ error: "userId and companyName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify user exists
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      email: userData.user.email,
      full_name: fullName || userData.user.user_metadata?.full_name || "Admin",
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
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

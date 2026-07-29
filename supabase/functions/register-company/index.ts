import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders } from "../_shared/cors.ts";
import { newTrialSignupEmail } from "../_shared/email-templates.ts";

// Automatisk provperiod — nya företag får 14 dagar gratis utan betaluppgifter.
const TRIAL_DAYS = 14;
const ADMIN_EMAIL = "info@auroramedia.se";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

async function notifyOwnerOfTrialSignup(payload: {
  companyName: string;
  contactPerson: string;
  email: string;
  phone?: string | null;
  orgNr?: string | null;
  trialEndsAt: string;
}) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!lovableKey || !resendKey) {
    console.warn("[register-company] Mail-nycklar saknas — hoppar över ägar-notis");
    return;
  }
  const { subject, html } = newTrialSignupEmail(payload);
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from: "Aurora Transport <noreply@auroratransport.se>",
      to: [ADMIN_EMAIL],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    console.error("[register-company] Ägar-notis misslyckades:", res.status, await res.text());
  }
}

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

    const { userId, companyName, orgNr, fullName, phone } = await req.json();

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

    // Create company — starta provperioden direkt, inget betalkort krävs
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString();
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert({
        name: companyName.trim(),
        org_nr: orgNr || null,
        phone: phone || null,
        subscription_status: "trialing",
        trial_ends_at: trialEndsAt,
      })
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

    console.log(`[register-company] Created company ${company.id} for user ${userId} (trial t.o.m. ${trialEndsAt})`);

    // Maila ägaren så att uppföljning kan bokas — registreringen ska aldrig
    // misslyckas om mailet gör det, därför körs det i try/catch.
    try {
      await notifyOwnerOfTrialSignup({
        companyName: companyName.trim(),
        contactPerson: fullName || "Okänd",
        email: caller.email ?? "",
        phone: phone || null,
        orgNr: orgNr || null,
        trialEndsAt,
      });
    } catch (mailError) {
      console.error("[register-company] Kunde inte skicka ägar-notis:", mailError);
    }

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

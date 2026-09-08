import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders } from "../_shared/cors.ts";
import { sendResendMail, safeTemplateData } from "../_shared/resend.ts";
import { newTrialSignupEmail } from "../_shared/email-templates.ts";

// Automatisk provperiod — nya företag får 14 dagar gratis utan betaluppgifter.
const ADMIN_EMAIL = "info@auroramedia.se";

async function notifyOwnerOfTrialSignup(payload: {
  companyName: string;
  contactPerson: string;
  email: string;
  phone?: string | null;
  orgNr?: string | null;
  trialEndsAt: string;
}) {
  const { subject, html } = newTrialSignupEmail(safeTemplateData(payload));
  const key = `trial/${payload.email.toLowerCase()}/${payload.trialEndsAt}`;
  await sendResendMail({ to: ADMIN_EMAIL, subject, html }, key);

}

Deno.serve(async (req) => {
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Logga in för att slutföra registreringen." }, 401);
    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) return json({ error: "Logga in för att slutföra registreringen." }, 401);
    const body = await req.json().catch(() => null);
    if (!body || typeof body.companyName !== "string" || !body.companyName.trim() || body.companyName.length > 200
      || typeof body.fullName !== "string" || !body.fullName.trim() || body.fullName.length > 200
      || (body.orgNr != null && (typeof body.orgNr !== "string" || !/^\d{6}-?\d{4}$/.test(body.orgNr.trim())))
      || (body.phone != null && (typeof body.phone !== "string" || body.phone.length > 50))) {
      return json({ error: "Kontrollera företagsnamn, namn, organisationsnummer och telefonnummer." }, 400);
    }
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: previous, error: previousError } = await admin.from("profiles").select("company_id").eq("id", caller.id).maybeSingle();
    if (previousError) throw previousError;
    // This transaction derives identity from auth.uid(), serializes concurrent
    // retries, and atomically creates the company, profile and admin membership.
    const { data: companyId, error: registrationError } = await callerClient.rpc("complete_company_registration", {
      _name: body.companyName.trim(), _org_nr: body.orgNr?.trim() || null,
      _user_full_name: body.fullName.trim(), _phone: body.phone?.trim() || null,
    });
    if (registrationError || !companyId) {
      console.error("[register-company] Registration failed", registrationError);
      return json({ error: "Företaget kunde inte registreras. Försök igen." }, 500);
    }
    if (!previous?.company_id) {
      const { data: company, error: companyError } = await admin.from("companies").select("trial_ends_at").eq("id", companyId).single();
      if (companyError) throw companyError;
      try {
        await notifyOwnerOfTrialSignup({ companyName: body.companyName.trim(), contactPerson: body.fullName.trim(), email: caller.email ?? "", phone: body.phone?.trim() || null, orgNr: body.orgNr?.trim() || null, trialEndsAt: company.trial_ends_at });
      } catch (mailError) { console.error("[register-company] Owner notification failed", mailError); }
    }
    return json({ success: true, companyId });
  } catch (error) {
    console.error("[register-company] Error", error);
    return json({ error: "Registreringen kunde inte slutföras. Försök igen." }, 500);
  }
});

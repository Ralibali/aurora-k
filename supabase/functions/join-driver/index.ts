import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { z } from "https://esm.sh/zod@3.23.8";
import { sitePath } from "../_shared/site-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  token: z.string().uuid("Ogiltigt token-format"),
  name: z.string().trim().min(2, "Namnet måste vara minst 2 tecken").max(100, "Namnet får vara max 100 tecken"),
  password: z.string().min(8, "Lösenordet måste vara minst 8 tecken").max(128, "Lösenordet får vara max 128 tecken"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const parsed = BodySchema.safeParse(rawBody);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Valideringsfel", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, name, password } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Look up invitation
    const { data: invitation, error: invError } = await adminClient
      .from("invitations")
      .select("id, email, name, company_id, expires_at, created_at")
      .eq("token", token)
      .is("accepted_at", null)
      .maybeSingle();

    const expiresAt = invitation?.expires_at ? Date.parse(invitation.expires_at) : Date.parse(invitation?.created_at ?? "") + 7 * 86400000;
    if (invError || !invitation || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return new Response(
        JSON.stringify({ error: "Inbjudan saknas, har gått ut eller är redan använd. Logga in om du redan har anslutit." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // A new invitation may also belong to an existing account. In that case
    // the supplied password must authenticate that account; never reset it.
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email: invitation.email, password, email_confirm: true,
      user_metadata: { full_name: name },
    });
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey);
    const { data: signInData, error: signInError } = await callerClient.auth.signInWithPassword({ email: invitation.email, password });
    if (signInError || !signInData.session || !signInData.user) {
      return new Response(JSON.stringify({ error: createError
        ? "Om du redan har ett konto: använd ditt befintliga lösenord eller återställ det via inloggningssidan."
        : "Kontot är skapat men inloggningen misslyckades. Försök igen med samma lösenord." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Accept atomically as the authenticated recipient. The database verifies
    // the token, email and company membership before writing any profile/role.
    const { error: acceptError } = await callerClient.rpc("accept_invitation", { p_token: token, p_user_id: signInData.user.id });
    if (acceptError) {
      console.error("[join-driver] Invitation acceptance failed", acceptError);
      return new Response(JSON.stringify({ error: "Inbjudan kunde inte kopplas till kontot. Kontrollera att kontot inte tillhör ett annat företag och kontakta administratören." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (created?.user) {
      try {
        const { data: company } = await adminClient.from("companies").select("name").eq("id", invitation.company_id).single();
        const { error: emailError } = await adminClient.functions.invoke("send-email", { body: {
          to: invitation.email, templateName: "driver-welcome",
          templateData: { driverName: name, companyName: company?.name || "ditt företag", appUrl: sitePath("/driver/assignments") },
        } });
        if (emailError) console.error("[join-driver] Welcome email failed", emailError);
      } catch (emailError) { console.error("[join-driver] Welcome email failed", emailError); }
    }
    return new Response(JSON.stringify({ success: true, user_id: signInData.user.id, session: signInData.session }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Kunde inte ansluta föraren. Försök igen." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

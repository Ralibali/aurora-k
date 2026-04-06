import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { z } from "https://esm.sh/zod@3.23.8";

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
      .select("id, email, name, company_id")
      .eq("token", token)
      .is("accepted_at", null)
      .maybeSingle();

    if (invError || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invitation not found or already used" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user with email confirmed
    const { data: userData, error: createError } =
      await adminClient.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, role: "driver" },
      });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // Update profile
    await adminClient.from("profiles").upsert({
      id: userId,
      email: invitation.email,
      full_name: name,
      role: "driver",
      company_id: invitation.company_id,
    }, { onConflict: "id" });

    // Set role
    await adminClient.from("user_roles").upsert({
      user_id: userId,
      role: "driver",
      company_id: invitation.company_id,
    }, { onConflict: "user_id,role" });

    // Mark invitation accepted
    await adminClient
      .from("invitations")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invitation.id);

    // Look up company name for welcome email
    const { data: company } = await adminClient
      .from("companies")
      .select("name")
      .eq("id", invitation.company_id)
      .maybeSingle();

    // Send welcome email (fire-and-forget)
    try {
      await adminClient.functions.invoke("send-email", {
        body: {
          to: "info@auroramedia.se",
          templateName: "driver-welcome",
          templateData: {
            driverName: name,
            companyName: company?.name || "ditt företag",
            appUrl: `${req.headers.get("origin") || "https://aurora-k.lovable.app"}/driver/assignments`,
          },
        },
      });
    } catch (emailErr) {
      console.error("[join-driver] Welcome email failed:", emailErr);
    }

    // Generate a session for the new user by signing in
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: signInData, error: signInError } =
      await anonClient.auth.signInWithPassword({
        email: invitation.email,
        password,
      });

    if (signInError) {
      // User created but couldn't auto-sign in
      return new Response(
        JSON.stringify({ success: true, user_id: userId, session: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        session: signInData.session,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

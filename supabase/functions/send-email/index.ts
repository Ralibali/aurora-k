import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { corsHeaders } from "../_shared/cors.ts";
import { assignmentConfirmationEmail, driverWelcomeEmail, driverInviteEmail, newLeadNotificationEmail, newCustomerMessageEmail, bookingRequestCreatedEmail, bookingRequestConfirmationEmail, trackingStartedEmail, deliveryCompletedEmail } from "../_shared/email-templates.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const ADMIN_EMAIL = "info@auroramedia.se";

const TEMPLATE_MAP: Record<string, (data: Record<string, string>) => { subject: string; html: string }> = {
  'assignment-confirmation': assignmentConfirmationEmail,
  'driver-welcome': driverWelcomeEmail,
  'driver-invite': driverInviteEmail,
  'new-lead-notification': newLeadNotificationEmail,
  'new-customer-message': newCustomerMessageEmail,
  'booking-request-created': bookingRequestCreatedEmail,
  'booking-request-confirmation': bookingRequestConfirmationEmail,
  'tracking-started': trackingStartedEmail,
  'delivery-completed': deliveryCompletedEmail,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeBearer(authHeader: string | null) {
  return authHeader?.replace(/^Bearer\s+/i, "").trim() || "";
}

function isValidEmail(value: unknown) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

async function isAdminCaller(supabaseUrl: string, anonKey: string, serviceRoleKey: string, token: string) {
  if (!token) return false;
  if (serviceRoleKey && token === serviceRoleKey) return true;

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: userError } = await callerClient.auth.getUser(token);
  if (userError || !user) return false;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const [{ data: roleRow }, { data: platformAdmin }] = await Promise.all([
    adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1)
      .maybeSingle(),
    adminClient.rpc("is_platform_admin", { _user_id: user.id }).then(res => res).catch(() => ({ data: false })),
  ]);

  return Boolean(roleRow || platformAdmin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const { templateName, templateData } = body;
    let { to, subject, html } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const token = normalizeBearer(req.headers.get("Authorization"));
    const isPublicLeadNotification = templateName === "new-lead-notification";
    const adminCaller = isPublicLeadNotification ? false : await isAdminCaller(supabaseUrl, anonKey, serviceRoleKey, token);

    if (!isPublicLeadNotification && !adminCaller) {
      return json({ error: "Unauthorized" }, 401);
    }

    if (isPublicLeadNotification) {
      to = ADMIN_EMAIL;
    }

    if (templateName) {
      const templateFn = TEMPLATE_MAP[templateName];
      if (!templateFn) return json({ error: `Unknown template: ${templateName}` }, 400);
      const result = templateFn(templateData || {});
      subject = result.subject;
      html = result.html;
    } else if (!adminCaller || token !== serviceRoleKey) {
      // Only trusted server-to-server calls may send raw HTML/subject payloads.
      return json({ error: "Template is required" }, 403);
    }

    if (!isValidEmail(to) || !subject || !html) {
      return json({ error: "Missing or invalid to, subject, or html" }, 400);
    }

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Aurora Transport <noreply@auroratransport.se>",
        to: [to],
        subject,
        html,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error("[send-email] Resend error:", result);
      return json({ error: "Email send failed", details: result }, 502);
    }

    console.log(`[send-email] Sent to ${to}: ${subject}`);
    return json({ success: true, id: result.id });
  } catch (err) {
    console.error("[send-email] Error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

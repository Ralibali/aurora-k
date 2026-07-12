import { corsHeaders } from "npm:@supabase/supabase-js@2.100.1/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { z } from "https://esm.sh/zod@3";
import { newCustomerMessageEmail } from "../_shared/email-templates.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FALLBACK_ADMIN_EMAIL = "info@auroramedia.se";
const portalToken = z.string().trim().min(20).max(256).regex(/^[A-Za-z0-9._~-]+$/);

const RequestSchema = z.object({
  type: z.literal("new-customer-message"),
  token: portalToken,
  data: z.object({
    message: z.string().trim().min(1).max(4000),
  }),
});

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }, 400);
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!lovableKey || !resendKey) {
      console.error("[notify-admin] email provider secrets are missing");
      return json({ error: "Email service is not configured" }, 503);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: tokenRow, error: tokenError } = await admin
      .from("customer_access_tokens")
      .select("customer_id, company_id, expires_at, customer:customers(id, name, company_id)")
      .eq("token", parsed.data.token)
      .maybeSingle();

    if (tokenError || !tokenRow) return json({ error: "Unauthorized" }, 401);
    if (tokenRow.expires_at && new Date(tokenRow.expires_at as string).getTime() <= Date.now()) {
      return json({ error: "Token expired" }, 401);
    }

    const customer = Array.isArray(tokenRow.customer) ? tokenRow.customer[0] : tokenRow.customer;
    const companyId = tokenRow.company_id ?? customer?.company_id;
    if (!companyId || !customer?.id || !customer?.name) return json({ error: "Unauthorized" }, 401);

    const [{ data: companySettings }, { data: adminProfile }] = await Promise.all([
      admin.from("settings").select("email").eq("company_id", companyId).maybeSingle(),
      admin.from("profiles").select("email").eq("company_id", companyId).eq("role", "admin").not("email", "is", null).limit(1).maybeSingle(),
    ]);

    const recipient = companySettings?.email || adminProfile?.email || FALLBACK_ADMIN_EMAIL;
    const template = newCustomerMessageEmail({
      customerName: escapeHtml(customer.name),
      message: escapeHtml(parsed.data.data.message).replace(/\n/g, "<br>"),
      customerUrl: `https://auroratransport.se/admin/customers/${customer.id}`,
    });

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: "Aurora Transport <noreply@auroratransport.se>",
        to: [recipient],
        subject: template.subject,
        html: template.html,
      }),
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[notify-admin] Resend error:", result);
      return json({ error: "Email send failed" }, 502);
    }

    console.log(`[notify-admin] Sent ${parsed.data.type} notification for company ${companyId}`);
    return json({ success: true });
  } catch (err) {
    console.error("[notify-admin] Error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

import { corsHeaders } from "npm:@supabase/supabase-js@2.100.1/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import { z } from "https://esm.sh/zod@3";
import { deliverOutbox } from "../_shared/notification-outbox.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return json({ error: "Invalid request", details: parsed.error.flatten().fieldErrors }, 400);
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
    const companyId = tokenRow.company_id;
    if (customer?.company_id !== companyId) return json({ error: "Unauthorized" }, 401);
    if (!companyId || !customer?.id || !customer?.name) return json({ error: "Unauthorized" }, 401);

    // Content and recipients come from the committed portal message trigger.
    const result = await deliverOutbox(admin, companyId);
    if (result.failed) return json({ error: 'Meddelandet är sparat. Mejlaviseringen väntar på ett nytt försök.' }, 502);
    return json({ success: true });
  } catch (err) {
    console.error("[notify-admin] Error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

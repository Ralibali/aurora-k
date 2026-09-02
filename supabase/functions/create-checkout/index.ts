import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeOrigin } from "../_shared/site-url.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabase = createClient(supabaseUrl, anonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.email) return json({ error: "Not authenticated" }, 401);

    const { companyId } = await req.json().catch(() => ({}));
    if (!companyId) return json({ error: "companyId is required" }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: membership } = await admin
      .from("user_roles")
      .select("company_id")
      .eq("user_id", user.id)
      .eq("company_id", companyId)
      .eq("role", "admin")
      .maybeSingle();

    if (!membership) return json({ error: "Forbidden" }, 403);

    const { data: company, error: companyError } = await admin
      .from("companies")
      .select("id, name, stripe_customer_id")
      .eq("id", companyId)
      .single();
    if (companyError || !company) return json({ error: "Company not found" }, 404);

    const monthlyPriceId = Deno.env.get("STRIPE_MONTHLY_PRICE_ID");
    if (!monthlyPriceId) throw new Error("STRIPE_MONTHLY_PRICE_ID is not configured");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2025-08-27.basil",
    });

    let customerId = company.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: company.name || undefined,
        metadata: { company_id: company.id, supabase_user_id: user.id },
      });
      customerId = customer.id;
      await admin.from("companies").update({ stripe_customer_id: customerId }).eq("id", company.id);
    }

    const setupPriceId = Deno.env.get("STRIPE_SETUP_PRICE_ID");
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    if (setupPriceId) lineItems.push({ price: setupPriceId, quantity: 1 });
    lineItems.push({ price: monthlyPriceId, quantity: 1 });

    const origin = safeOrigin(req);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: lineItems,
      mode: "subscription",
      metadata: { company_id: company.id },
      success_url: `${origin}/onboarding?checkout=success`,
      cancel_url: `${origin}/register?cancelled=true`,
    });

    return json({ url: session.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return json({ error: msg }, 500);
  }
});

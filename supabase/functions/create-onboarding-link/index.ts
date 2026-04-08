import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is platform admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check platform admin
    const { data: isAdmin } = await callerClient.rpc("is_platform_admin", { _user_id: caller.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden — platform admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_name, org_nr, admin_email, admin_name } = await req.json();
    if (!company_name || !admin_email || !admin_name) {
      return new Response(
        JSON.stringify({ error: "company_name, admin_email and admin_name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Create company
    const { data: company, error: companyErr } = await adminClient
      .from("companies")
      .insert({ name: company_name, org_nr: org_nr || null, subscription_status: "pending" })
      .select("id")
      .single();

    if (companyErr) {
      return new Response(JSON.stringify({ error: "Could not create company: " + companyErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create admin user account
    const tempPassword = crypto.randomUUID().slice(0, 12);
    const { data: userData, error: userErr } = await adminClient.auth.admin.createUser({
      email: admin_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: admin_name, role: "admin" },
    });

    if (userErr) {
      // Clean up company if user creation fails
      await adminClient.from("companies").delete().eq("id", company.id);
      return new Response(JSON.stringify({ error: "Could not create user: " + userErr.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Update profile with company
    await adminClient.from("profiles").upsert({
      id: userId,
      email: admin_email,
      full_name: admin_name,
      role: "admin",
      company_id: company.id,
    }, { onConflict: "id" });

    // Add admin role
    await adminClient.from("user_roles").upsert({
      user_id: userId,
      role: "admin",
      company_id: company.id,
    }, { onConflict: "user_id,role" });

    // 3. Create Stripe checkout session
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    let checkoutUrl: string | null = null;

    if (stripeKey) {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      const customer = await stripe.customers.create({
        email: admin_email,
        name: company_name,
        metadata: { company_id: company.id, supabase_user_id: userId },
      });

      // Save stripe customer id on company
      await adminClient.from("companies").update({
        stripe_customer_id: customer.id,
      }).eq("id", company.id);

      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
      const setupPriceId = Deno.env.get("STRIPE_SETUP_PRICE_ID");
      const monthlyPriceId = Deno.env.get("STRIPE_MONTHLY_PRICE_ID");
      if (setupPriceId) lineItems.push({ price: setupPriceId, quantity: 1 });
      if (monthlyPriceId) lineItems.push({ price: monthlyPriceId, quantity: 1 });

      if (lineItems.length > 0) {
        const origin = req.headers.get("origin") || "https://aurora-k.lovable.app";
        const session = await stripe.checkout.sessions.create({
          customer: customer.id,
          line_items: lineItems,
          mode: "subscription",
          metadata: { company_id: company.id },
          success_url: `${origin}/login?checkout=success`,
          cancel_url: `${origin}/login?checkout=cancelled`,
        });
        checkoutUrl = session.url;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        company_id: company.id,
        user_id: userId,
        temp_password: tempPassword,
        checkout_url: checkoutUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

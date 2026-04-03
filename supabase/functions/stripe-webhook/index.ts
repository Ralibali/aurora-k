import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  welcomeEmail,
  paymentFailedEmail,
  subscriptionCancelledEmail,
} from "../_shared/email-templates.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2025-08-27.basil",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabase = createClient(
  supabaseUrl,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

async function sendEmail(to: string, template: { subject: string; html: string }) {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
    },
    body: JSON.stringify({ to, subject: template.subject, html: template.html }),
  });
  if (!res.ok) console.error("[stripe-webhook] Email send failed:", await res.text());
  else console.log(`[stripe-webhook] Email sent to ${to}`);
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("No signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body, signature, Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  console.log(`[stripe-webhook] Event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;
        if (!companyId) { console.error("No company_id in metadata"); break; }

        await supabase.from("companies").update({
          subscription_status: "active",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
        }).eq("id", companyId);

        // Send welcome email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("company_id", companyId)
          .eq("role", "admin")
          .limit(1)
          .single();

        const { data: company } = await supabase
          .from("companies")
          .select("name")
          .eq("id", companyId)
          .single();

        if (profile) {
          const firstName = profile.full_name?.split(" ")[0] || "där";
          const tmpl = welcomeEmail({
            firstName,
            companyName: company?.name || "Ditt företag",
            dashboardUrl: `https://aurora-k.lovable.app/admin`,
          });
          await sendEmail(profile.email, tmpl);
        }

        console.log(`[stripe-webhook] Company ${companyId} activated`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: company } = await supabase
          .from("companies").select("id").eq("stripe_customer_id", customerId).single();

        if (company) {
          await supabase.from("companies").update({ subscription_status: "past_due" }).eq("id", company.id);

          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("company_id", company.id)
            .eq("role", "admin")
            .limit(1)
            .single();

          if (profile) {
            const tmpl = paymentFailedEmail({
              firstName: profile.full_name?.split(" ")[0] || "där",
              portalUrl: `https://aurora-k.lovable.app/admin/settings`,
            });
            await sendEmail(profile.email, tmpl);
          }

          console.log(`[stripe-webhook] Company ${company.id} set to past_due`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: company } = await supabase
          .from("companies").select("id").eq("stripe_customer_id", customerId).single();

        if (company) {
          await supabase.from("companies").update({ subscription_status: "cancelled" }).eq("id", company.id);

          const { data: profile } = await supabase
            .from("profiles")
            .select("email, full_name")
            .eq("company_id", company.id)
            .eq("role", "admin")
            .limit(1)
            .single();

          if (profile) {
            const tmpl = subscriptionCancelledEmail({
              firstName: profile.full_name?.split(" ")[0] || "där",
              reactivateUrl: `https://aurora-k.lovable.app/admin/settings`,
            });
            await sendEmail(profile.email, tmpl);
          }

          console.log(`[stripe-webhook] Company ${company.id} cancelled`);
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe-webhook] Error processing event:", err);
    return new Response("Error processing", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

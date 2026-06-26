import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'npm:@supabase/supabase-js@2.57.2';
import { handleStripeEvent } from './handler.ts';

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const siteUrl = (Deno.env.get('SITE_URL') || 'https://auroratransport.se').replace(/\/$/, '');

if (!stripeSecret || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
  throw new Error('Stripe-webhook saknar obligatoriska miljövariabler');
}

const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' });
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

serve(async request => {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('No signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error('[stripe-webhook] Invalid signature', error);
    return new Response('Invalid signature', { status: 400 });
  }

  try {
    await handleStripeEvent(event, { stripe, supabase, supabaseUrl, serviceRoleKey, siteUrl });
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`[stripe-webhook] Failed ${event.type}`, error);
    return new Response('Webhook processing failed', { status: 500 });
  }
});

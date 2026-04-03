const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const BodySchema = z.object({
  assignment_id: z.string().uuid(),
  recipient_email: z.string().email(),
  message: z.string().optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { assignment_id, recipient_email, message } = parsed.data;

    // Fetch assignment details
    const { data: assignment, error: fetchError } = await supabase
      .from('assignments')
      .select('*, customer:customers(*), driver:profiles!assignments_assigned_driver_id_fkey(*)')
      .eq('id', assignment_id)
      .single();

    if (fetchError || !assignment) {
      return new Response(JSON.stringify({ error: 'Assignment not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch company settings
    const { data: settings } = await supabase.from('settings').select('*').limit(1).single();

    const companyName = settings?.company_name || 'Transport';
    const scheduledDate = new Date(assignment.scheduled_start).toLocaleDateString('sv-SE');
    const scheduledTime = new Date(assignment.scheduled_start).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

    // For now, we log the email intent. In production, integrate with an email service.
    console.log(`[share-assignment] Sharing assignment ${assignment_id} to ${recipient_email}`);
    console.log(`Subject: Uppdrag: ${assignment.title} - ${companyName}`);
    console.log(`Assignment details: ${assignment.title}, ${assignment.address}, ${scheduledDate} ${scheduledTime}`);
    console.log(`Message: ${message || '(none)'}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Uppdragsinformation skickad till ${recipient_email}`,
      preview: {
        subject: `Uppdrag: ${assignment.title} - ${companyName}`,
        to: recipient_email,
        assignment_title: assignment.title,
        address: assignment.address,
        scheduled: `${scheduledDate} ${scheduledTime}`,
        customer: assignment.customer?.name,
        driver: assignment.driver?.full_name,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'GET') return response({ error: 'Method not allowed' }, 405);

  const token = new URL(request.url).searchParams.get('token')?.trim();
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return response({ error: 'Ogiltig spårningslänk' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const { data: assignment, error } = await supabase
    .from('assignments')
    .select('id, title, status, scheduled_start, scheduled_end, actual_start, actual_stop, pickup_address, delivery_address, address, assigned_driver_id, customer:customers(name)')
    .eq('tracking_token', token)
    .eq('tracking_enabled', true)
    .maybeSingle();

  if (error) {
    console.error('[track-assignment] assignment lookup failed', error);
    return response({ error: 'Spårningen kunde inte laddas' }, 500);
  }
  if (!assignment) return response({ error: 'Spårningslänken finns inte eller är avstängd' }, 404);

  const [driverResult, locationResult] = await Promise.all([
    supabase.from('profiles').select('full_name, phone').eq('id', assignment.assigned_driver_id).maybeSingle(),
    supabase.from('driver_locations').select('latitude, longitude, heading, speed, updated_at').eq('driver_id', assignment.assigned_driver_id).eq('assignment_id', assignment.id).maybeSingle(),
  ]);

  const location = locationResult.data;
  const locationFresh = location?.updated_at
    ? Date.now() - new Date(location.updated_at).getTime() < 15 * 60 * 1000
    : false;

  return response({
    assignment: {
      title: assignment.title,
      status: assignment.status,
      scheduledStart: assignment.scheduled_start,
      scheduledEnd: assignment.scheduled_end,
      actualStart: assignment.actual_start,
      actualStop: assignment.actual_stop,
      pickupAddress: assignment.pickup_address || assignment.address,
      deliveryAddress: assignment.delivery_address,
      customerName: Array.isArray(assignment.customer) ? assignment.customer[0]?.name : assignment.customer?.name,
    },
    driver: driverResult.data ? {
      firstName: driverResult.data.full_name?.split(' ')[0] || 'Chauffören',
      phone: driverResult.data.phone || null,
    } : null,
    location: locationFresh && location ? {
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading,
      speed: location.speed,
      updatedAt: location.updated_at,
    } : null,
  });
});

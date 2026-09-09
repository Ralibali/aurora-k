import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.1';
import { handleMapsConfig } from './handler.ts';

Deno.serve(req => {
  const authHeader = req.headers.get('Authorization') ?? '';
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  return handleMapsConfig(req, db as never, name => Deno.env.get(name));
});

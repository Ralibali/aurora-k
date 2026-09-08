import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.1';
import { handleFortnox } from './handler.ts';
Deno.serve(req => handleFortnox(req, createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } }), name => Deno.env.get(name)));

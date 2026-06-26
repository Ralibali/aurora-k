import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { extractPdfText } from '../_shared/pdf-text.ts';
import { parseInboundOrder } from '../_shared/order-parser.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return json({ error: 'Server configuration missing' }, 500);

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
  if (!roles?.some(row => row.role === 'admin')) return json({ error: 'Admin access required' }, 403);

  try {
    const form = await request.formData();
    const file = form.get('file');
    const subject = String(form.get('subject') ?? '');
    if (!(file instanceof File)) return json({ error: 'A file is required' }, 400);
    if (file.size > 20 * 1024 * 1024) return json({ error: 'Filen får vara högst 20 MB' }, 413);

    const bytes = new Uint8Array(await file.arrayBuffer());
    let text = '';
    let pages = 0;
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const pdf = await extractPdfText(bytes);
      text = pdf.text;
      pages = pdf.pages;
    } else if (file.type.startsWith('text/') || /\.(csv|txt)$/i.test(file.name)) {
      text = new TextDecoder().decode(bytes);
    } else {
      return json({ error: 'Formatet stöds inte. Använd PDF, CSV eller TXT.' }, 415);
    }

    if (!text.trim()) return json({ error: 'Dokumentet innehåller ingen maskinläsbar text' }, 422);
    const parsed = parseInboundOrder(text, subject || file.name.replace(/\.[^.]+$/, ''));
    return json({ parsed, document: { filename: file.name, contentType: file.type, size: file.size, pages, extractedCharacters: text.length } });
  } catch (error) {
    console.error('[parse-order-document]', error);
    return json({ error: error instanceof Error ? error.message : 'Dokumentet kunde inte tolkas' }, 500);
  }
});

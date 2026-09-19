import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { extractPdfText } from '../_shared/pdf-text.ts';
import { parseInboundOrder, parseTransportDocument } from '../_shared/order-parser.ts';
import { azureOcrConfigured, extractTextWithAzureOcr } from '../_shared/azure-document-ocr.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const MAX_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

function safeName(value: string) {
  return value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 160) || 'dokument';
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function isImage(file: File) {
  return IMAGE_TYPES.includes(file.type.toLowerCase()) || /\.(jpe?g|png|webp)$/i.test(file.name);
}

function isPlainText(file: File) {
  return file.type.startsWith('text/') || /\.(csv|txt)$/i.test(file.name);
}

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
  const { data: roles, error: roleError } = await supabase.from('user_roles').select('role,company_id').eq('user_id', user.id);
  if (roleError) return json({ error: 'Behörigheten kunde inte kontrolleras' }, 500);
  const adminRole = (roles ?? []).find(row => row.role === 'admin' && row.company_id);
  if (!adminRole) return json({ error: 'Admin access required' }, 403);
  const companyId = adminRole.company_id as string;

  let documentRowId: string | null = null;
  let storagePath: string | null = null;
  let file: File | null = null;

  try {
    const form = await request.formData();
    const candidate = form.get('file');
    const subject = String(form.get('subject') ?? '');
    const persist = String(form.get('persist') ?? '') === 'true';
    if (!(candidate instanceof File)) return json({ error: 'En fil krävs' }, 400);
    file = candidate;
    if (file.size > MAX_BYTES) return json({ error: 'Filen får vara högst 20 MB' }, 413);
    if (!isPdf(file) && !isImage(file) && !isPlainText(file)) {
      return json({ error: 'Formatet stöds inte. Använd PDF, JPG, PNG, WebP, CSV eller TXT.' }, 415);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    if (persist) {
      const path = `${companyId}/documents/${crypto.randomUUID()}-${safeName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from('order-inbox').upload(path, bytes, {
        contentType: file.type || 'application/octet-stream',
      });
      if (uploadError) return json({ error: 'Filen kunde inte sparas. Försök igen.' }, 502);
      storagePath = path;

      const { data: inserted, error: insertError } = await supabase
        .from('inbound_documents')
        .insert({
          company_id: companyId,
          uploaded_by: user.id,
          filename: file.name,
          content_type: file.type || '',
          size_bytes: file.size,
          storage_path: path,
          status: 'new',
        })
        .select('id')
        .single();
      if (insertError) return json({ error: 'Dokumentet kunde inte registreras i inkorgen.' }, 502);
      documentRowId = inserted.id as string;
    }

    let text = '';
    let pages = 0;
    let extractionMethod = 'embedded-text';
    if (isPdf(file)) {
      const pdf = await extractPdfText(bytes);
      text = pdf.text;
      pages = pdf.pages;
      extractionMethod = pdf.extractionMethod;
    } else if (isImage(file)) {
      if (!azureOcrConfigured()) {
        throw new Error('Textigenkänning för bilder är inte aktiverad. Ladda upp dokumentet som PDF.');
      }
      const ocr = await extractTextWithAzureOcr(bytes);
      text = ocr.text;
      pages = ocr.pages;
      extractionMethod = 'azure-ocr';
    } else {
      text = new TextDecoder().decode(bytes);
    }

    if (!text.trim()) throw new Error('Dokumentet innehåller ingen läsbar text');

    const documentTitle = subject || file.name.replace(/\.[^.]+$/, '');
    const analysis = parseTransportDocument(text, documentTitle);

    if (documentRowId) {
      await supabase
        .from('inbound_documents')
        .update({
          document_type: analysis.documentType,
          confidence: analysis.confidence,
          field_confidence: analysis.fieldConfidence,
          signature_detected: analysis.signatureDetected,
          parsed_payload: { fields: analysis.fields, order: analysis.order, requiresReview: analysis.requiresReview },
          status: 'new',
          error_message: null,
        })
        .eq('id', documentRowId);
    }

    return json({
      // Bakåtkompatibelt svar för den befintliga PDF-importen.
      parsed: analysis.order,
      document: {
        id: documentRowId,
        filename: file.name,
        contentType: file.type,
        size: file.size,
        pages,
        extractedCharacters: text.length,
        extractionMethod,
        storagePath,
      },
      documentType: analysis.documentType,
      typeConfidence: analysis.typeConfidence,
      confidence: analysis.confidence,
      requiresReview: analysis.requiresReview,
      signatureDetected: analysis.signatureDetected,
      fields: analysis.fields,
      fieldConfidence: analysis.fieldConfidence,
    });
  } catch (error) {
    console.error('[parse-order-document]', error);
    const message = error instanceof Error ? error.message : 'Dokumentet kunde inte tolkas';
    // Filen och raden behålls; endast status och felmeddelande uppdateras.
    if (documentRowId) {
      await supabase.from('inbound_documents').update({ status: 'error', error_message: message }).eq('id', documentRowId);
    }
    return json({ error: message, document: documentRowId ? { id: documentRowId, storagePath } : undefined }, 422);
  }
});

export { parseInboundOrder };

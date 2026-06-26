import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function signedUpload(admin: any, userId: string, assignmentId: string, operationId: string, file: File, suffix: string) {
  const path = `${userId}/${assignmentId}/${operationId}-${suffix}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await admin.storage.from('consignment-notes').upload(path, bytes, {
    contentType: file.type || 'application/octet-stream',
    upsert: true,
  });
  if (error) throw error;
  const { data, error: signedError } = await admin.storage.from('consignment-notes').createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signedError) throw signedError;
  return data.signedUrl;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) return reply({ error: 'Server configuration missing' }, 500);

  const auth = createClient(url, anon, { global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return reply({ error: 'Unauthorized' }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false } });

  let operationKey = '';
  try {
    const form = await request.formData();
    operationKey = String(form.get('idempotencyKey') ?? '');
    const assignmentId = String(form.get('assignmentId') ?? '');
    const operationType = String(form.get('operationType') ?? '');
    const metadata = JSON.parse(String(form.get('metadata') ?? '{}')) as Record<string, unknown>;
    if (!/^[0-9a-f-]{36}$/i.test(operationKey) || !/^[0-9a-f-]{36}$/i.test(assignmentId)) return reply({ error: 'Ogiltig operation' }, 400);
    if (!['delivery_proof', 'assignment_status'].includes(operationType)) return reply({ error: 'Okänd operationstyp' }, 400);

    const { data: assignment } = await admin.from('assignments').select('id,company_id,assigned_driver_id,status,driver_comment').eq('id', assignmentId).maybeSingle();
    if (!assignment) return reply({ error: 'Uppdraget hittades inte' }, 404);
    const { data: adminRole } = await admin.from('user_roles').select('role').eq('user_id', user.id).eq('company_id', assignment.company_id).eq('role', 'admin').maybeSingle();
    if (assignment.assigned_driver_id !== user.id && !adminRole) return reply({ error: 'Du får inte ändra detta uppdrag' }, 403);

    const { data: previous } = await admin.from('driver_sync_operations').select('status,result').eq('idempotency_key', operationKey).maybeSingle();
    if (previous?.status === 'completed') return reply({ synced: true, duplicate: true, result: previous.result });

    if (previous) {
      await admin.from('driver_sync_operations').update({ status: 'processing', error_message: null, updated_at: new Date().toISOString() }).eq('idempotency_key', operationKey);
    } else {
      const { error: insertError } = await admin.from('driver_sync_operations').insert({
        idempotency_key: operationKey,
        company_id: assignment.company_id,
        assignment_id: assignmentId,
        user_id: user.id,
        operation_type: operationType,
        status: 'processing',
      });
      if (insertError) {
        const { data: raced } = await admin.from('driver_sync_operations').select('status,result').eq('idempotency_key', operationKey).maybeSingle();
        if (raced?.status === 'completed') return reply({ synced: true, duplicate: true, result: raced.result });
        throw insertError;
      }
    }

    let result: Record<string, unknown> = {};
    if (operationType === 'assignment_status') {
      const nextStatus = String(metadata.status ?? '');
      if (!['pending', 'active', 'completed', 'delayed'].includes(nextStatus)) throw new Error('Ogiltig status');
      const updates: Record<string, unknown> = { status: nextStatus };
      if (nextStatus === 'active') updates.actual_start = String(metadata.changedAt ?? new Date().toISOString());
      if (nextStatus === 'completed') updates.actual_stop = String(metadata.changedAt ?? new Date().toISOString());
      const { error } = await admin.from('assignments').update(updates).eq('id', assignmentId);
      if (error) throw error;
      result = { status: nextStatus };
    } else {
      const photo = form.get('photo');
      const signature = form.get('signature');
      const photoUrl = photo instanceof File ? await signedUpload(admin, user.id, assignmentId, operationKey, photo, 'delivery-photo') : String(metadata.existingPhotoUrl ?? '') || null;
      const signatureUrl = signature instanceof File ? await signedUpload(admin, user.id, assignmentId, operationKey, signature, 'signature.png') : String(metadata.existingSignatureUrl ?? '') || null;
      if (metadata.requirePhoto && !photoUrl) throw new Error('Foto krävs');
      if (metadata.requireSignature && !signatureUrl) throw new Error('Signatur krävs');

      const completedAt = String(metadata.completedAt ?? new Date().toISOString());
      const recipientName = String(metadata.recipientName ?? '').trim();
      const note = String(metadata.note ?? '').trim();
      const proof = {
        operationId: operationKey,
        photoUrl,
        signatureUrl,
        recipientName,
        note,
        latitude: typeof metadata.latitude === 'number' ? metadata.latitude : null,
        longitude: typeof metadata.longitude === 'number' ? metadata.longitude : null,
        completedAt,
      };

      const { data: existingProtocol } = await admin
        .from('assignment_protocols')
        .select('id')
        .eq('assignment_id', assignmentId)
        .eq('protocol_type', 'delivery_proof')
        .ilike('content', `%${operationKey}%`)
        .maybeSingle();
      if (!existingProtocol) {
        const { error: protocolError } = await admin.from('assignment_protocols').insert({
          assignment_id: assignmentId,
          company_id: assignment.company_id,
          created_by: user.id,
          protocol_type: 'delivery_proof',
          title: 'Digitalt leveransbevis',
          signature_url: signatureUrl,
          content: JSON.stringify(proof),
        });
        if (protocolError) throw protocolError;
      }

      const event = `[${new Date(completedAt).toLocaleString('sv-SE')}] Uppdrag slutfört${recipientName ? `: Mottagare ${recipientName}` : ''}${note ? ` · ${note}` : ''}`;
      const commentAlreadyAdded = String(assignment.driver_comment ?? '').includes(operationKey);
      const comment = commentAlreadyAdded ? assignment.driver_comment : [assignment.driver_comment, `${event} [sync:${operationKey}]`].filter(Boolean).join('\n');
      const { error: assignmentError } = await admin.from('assignments').update({
        status: 'completed',
        actual_stop: completedAt,
        consignment_photo_url: photoUrl,
        signature_url: signatureUrl,
        driver_comment: comment,
      }).eq('id', assignmentId);
      if (assignmentError) throw assignmentError;
      result = proof;
    }

    await admin.from('driver_sync_operations').update({ status: 'completed', result, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('idempotency_key', operationKey);
    return reply({ synced: true, result });
  } catch (error) {
    console.error('[driver-sync]', error);
    if (operationKey) await admin.from('driver_sync_operations').update({ status: 'failed', error_message: error instanceof Error ? error.message : 'Synkfel', updated_at: new Date().toISOString() }).eq('idempotency_key', operationKey);
    return reply({ error: error instanceof Error ? error.message : 'Synkningen misslyckades' }, 500);
  }
});

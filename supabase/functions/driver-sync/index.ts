import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.100.1';
import { deliverOutbox } from '../_shared/notification-outbox.ts';
import { DriverRequestError, validateDriverImage, validateDriverMetadata } from './validation.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };
function notifyAfterCommit(admin: SupabaseClient, companyId: string) {
  const task = deliverOutbox(admin, companyId).catch(error => console.error('[driver-sync] Notification queued', error));
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(task);
  return task;
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function signedUpload(admin: SupabaseClient, userId: string, assignmentId: string, operationId: string, file: File, suffix: string) {
  const path = `${userId}/${assignmentId}/${operationId}-${suffix}`;
  const { error } = await admin.storage.from('consignment-notes').upload(path, file, { contentType: file.type, upsert: false });
  // A retry must reuse its first stored evidence, never overwrite it mid-commit.
  if (error && String(error.statusCode) !== '409') throw error;
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
  if (!user) return reply({ error: 'Logga in igen för att synka' }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false } });
  try {
    const form = await request.formData();
    const operationKey = String(form.get('idempotencyKey') ?? '');
    const assignmentId = String(form.get('assignmentId') ?? '');
    const operationType = String(form.get('operationType') ?? '');
    if (!uuid.test(operationKey) || !uuid.test(assignmentId)) throw new DriverRequestError('Ogiltig operation');
    let input: unknown;
    try { input = JSON.parse(String(form.get('metadata') ?? '{}')); }
    catch { throw new DriverRequestError('Ogiltiga uppgifter'); }
    const metadata = validateDriverMetadata(operationType, input);
    const { data: assignment, error: readError } = await admin.from('assignments').select('id,company_id,assigned_driver_id,status').eq('id', assignmentId).maybeSingle();
    if (readError) throw readError;
    if (!assignment) throw new DriverRequestError('Uppdraget hittades inte', 404);
    const { data: roles, error: roleError } = await admin.from('user_roles').select('role').eq('user_id', user.id).eq('company_id', assignment.company_id).in('role', ['admin', 'driver']);
    if (roleError) throw roleError;
    if (!roles?.length || (assignment.assigned_driver_id !== user.id && !roles.some(role => role.role === 'admin'))) throw new DriverRequestError('Du får inte ändra detta uppdrag', 403);
    const { data: previous, error: previousError } = await admin.from('driver_sync_operations').select('user_id,assignment_id,operation_type,status,result').eq('idempotency_key', operationKey).maybeSingle();
    if (previousError) throw previousError;
    if (previous && (previous.user_id !== user.id || previous.assignment_id !== assignmentId || previous.operation_type !== operationType)) throw new DriverRequestError('Operationsnyckeln används redan', 409);
    if (previous?.status === 'completed') {
      void notifyAfterCommit(admin, assignment.company_id);
      return reply({ synced: true, duplicate: true, result: previous.result });
    }
    if (!['pending', 'unassigned', 'active', 'delayed'].includes(assignment.status)) throw new DriverRequestError('Uppdraget har redan avslutats eller avbokats. Kontakta kontoret.', 409);
    const photoPart = form.get('photo');
    const signaturePart = form.get('signature');
    const photo = photoPart instanceof File ? photoPart : null;
    const signature = signaturePart instanceof File ? signaturePart : null;
    validateDriverImage(photo);
    validateDriverImage(signature);
    const photoUrl = operationType === 'delivery_proof' && photo ? await signedUpload(admin, user.id, assignmentId, operationKey, photo, 'delivery-photo') : null;
    const signatureUrl = operationType === 'delivery_proof' && signature ? await signedUpload(admin, user.id, assignmentId, operationKey, signature, 'signature.png') : null;
    const { data: result, error } = await admin.rpc('sync_driver_operation', {
      p_user_id: user.id, p_operation_id: operationKey, p_assignment_id: assignmentId,
      p_operation_type: operationType, p_metadata: metadata, p_photo_url: photoUrl, p_signature_url: signatureUrl,
    });
    if (error) {
      if (error.code === '42501') throw new DriverRequestError(error.message, 403);
      if (['P0001', '22007', '22023', '23514'].includes(error.code)) throw new DriverRequestError(error.message, 409);
      throw error;
    }
    // The transaction's trigger already persisted the event; sending failures
    // remain in the outbox and never undo a driver's completed operation.
    void notifyAfterCommit(admin, assignment.company_id);
    return reply({ synced: true, result });
  } catch (error) {
    if (error instanceof DriverRequestError) return reply({ error: error.message }, error.status);
    console.error('[driver-sync]', error);
    return reply({ error: 'Synkningen misslyckades. Ändringen ligger kvar i mobilen för ett nytt försök.' }, 500);
  }
});

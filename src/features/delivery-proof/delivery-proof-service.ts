import { supabase } from '@/integrations/supabase/client';

export type DeliveryProofResult = {
  photoUrl: string | null;
  signatureUrl: string | null;
  recipientName: string;
  note: string;
  latitude: number | null;
  longitude: number | null;
};

async function upload(userId: string, assignmentId: string, file: Blob, filename: string) {
  const path = `${userId}/${assignmentId}/${Date.now()}-${filename}`;
  const { error } = await supabase.storage.from('consignment-notes').upload(path, file, {
    contentType: file.type || 'application/octet-stream',
  });
  if (error) throw error;
  const { data, error: signedError } = await supabase.storage
    .from('consignment-notes')
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signedError) throw signedError;
  return data.signedUrl;
}

function locate(): Promise<{ latitude: number | null; longitude: number | null }> {
  if (!('geolocation' in navigator)) return Promise.resolve({ latitude: null, longitude: null });
  return new Promise(resolve => navigator.geolocation.getCurrentPosition(
    position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
    () => resolve({ latitude: null, longitude: null }),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
  ));
}

export async function saveDeliveryProof(input: {
  assignmentId: string;
  userId: string;
  companyId?: string | null;
  photo?: File | null;
  signature?: Blob | null;
  existingPhotoUrl?: string | null;
  existingSignatureUrl?: string | null;
  recipientName: string;
  note: string;
}) {
  const location = await locate();
  const extension = input.photo?.name.split('.').pop() || 'jpg';
  const photoUrl = input.photo
    ? await upload(input.userId, input.assignmentId, input.photo, `delivery.${extension}`)
    : input.existingPhotoUrl ?? null;
  const signatureUrl = input.signature
    ? await upload(input.userId, input.assignmentId, input.signature, 'signature.png')
    : input.existingSignatureUrl ?? null;

  const result: DeliveryProofResult = {
    photoUrl,
    signatureUrl,
    recipientName: input.recipientName.trim(),
    note: input.note.trim(),
    ...location,
  };

  const { error } = await supabase.from('assignment_protocols').insert({
    assignment_id: input.assignmentId,
    company_id: input.companyId ?? null,
    created_by: input.userId,
    protocol_type: 'delivery_proof',
    title: 'Digitalt leveransbevis',
    signature_url: signatureUrl,
    content: JSON.stringify({ ...result, completedAt: new Date().toISOString() }),
  });
  if (error) throw error;
  return result;
}

import { syncOrQueueDriverOperation } from '@/lib/driver-offline-queue';

export type DeliveryProofResult = {
  photoUrl: string | null;
  signatureUrl: string | null;
  recipientName: string;
  note: string;
  latitude: number | null;
  longitude: number | null;
  queued: boolean;
  operationId: string;
};

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
  requirePhoto?: boolean | null;
  requireSignature?: boolean | null;
}) {
  const location = await locate();
  const completedAt = new Date().toISOString();
  const operation = await syncOrQueueDriverOperation({
    assignmentId: input.assignmentId,
    operationType: 'delivery_proof',
    photo: input.photo,
    signature: input.signature,
    metadata: {
      recipientName: input.recipientName.trim(),
      note: input.note.trim(),
      existingPhotoUrl: input.existingPhotoUrl ?? null,
      existingSignatureUrl: input.existingSignatureUrl ?? null,
      requirePhoto: Boolean(input.requirePhoto),
      requireSignature: Boolean(input.requireSignature),
      completedAt,
      ...location,
    },
  });
  const serverResult = operation.result ?? {};
  return {
    photoUrl: typeof serverResult.photoUrl === 'string' ? serverResult.photoUrl : input.existingPhotoUrl ?? null,
    signatureUrl: typeof serverResult.signatureUrl === 'string' ? serverResult.signatureUrl : input.existingSignatureUrl ?? null,
    recipientName: input.recipientName.trim(),
    note: input.note.trim(),
    ...location,
    queued: operation.queued,
    operationId: operation.operationId,
  } satisfies DeliveryProofResult;
}

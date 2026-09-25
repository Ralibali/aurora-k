import { syncOrQueueDriverOperation } from '@/lib/driver-offline-queue';

export type DeliveryProofResult = {
  photoPath: string | null;
  signaturePath: string | null;
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
      completedAt,
      ...location,
    },
  });
  const serverResult = operation.result ?? {};
  return {
    photoPath: typeof serverResult.photoPath === 'string' ? serverResult.photoPath : null,
    signaturePath: typeof serverResult.signaturePath === 'string' ? serverResult.signaturePath : null,
    recipientName: input.recipientName.trim(),
    note: input.note.trim(),
    ...location,
    queued: operation.queued,
    operationId: operation.operationId,
  } satisfies DeliveryProofResult;
}

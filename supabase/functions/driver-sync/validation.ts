export class DriverRequestError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export function validateDriverMetadata(type: string, value: unknown, now = Date.now()): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DriverRequestError('Ogiltiga uppgifter');
  const input = value as Record<string, unknown>;
  if (type === 'assignment_status' && input.status !== 'active') throw new DriverRequestError('Slutför uppdraget med leveransbevis');
  if (!['assignment_status', 'delivery_proof'].includes(type)) throw new DriverRequestError('Okänd operationstyp');
  const key = type === 'assignment_status' ? 'changedAt' : 'completedAt';
  const time = typeof input[key] === 'string' ? new Date(input[key] as string).getTime() : NaN;
  if (!Number.isFinite(time) || time > now + 10 * 60_000) throw new DriverRequestError('Ogiltig tid för ändringen');
  if (type === 'assignment_status') return { status: 'active', changedAt: new Date(time).toISOString() };
  const recipientName = typeof input.recipientName === 'string' ? input.recipientName.trim() : '';
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  if (recipientName.length > 200 || note.length > 8000) throw new DriverRequestError('Namnet eller kommentaren är för lång');
  const coordinate = (key: string, max: number) => typeof input[key] === 'number' && Number.isFinite(input[key]) && Math.abs(input[key] as number) <= max ? input[key] : null;
  // Requirements and existing URLs come exclusively from the locked database row.
  return { recipientName, note, completedAt: new Date(time).toISOString(), latitude: coordinate('latitude', 90), longitude: coordinate('longitude', 180) };
}

export function validateDriverImage(file: File | null) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type) || file.size === 0 || file.size > 15 * 1024 * 1024) throw new DriverRequestError('Välj en bild på högst 15 MB (JPEG, PNG, WebP eller HEIC)');
}

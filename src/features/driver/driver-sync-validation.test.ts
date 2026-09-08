import { describe, expect, it } from 'vitest';
import { validateDriverImage, validateDriverMetadata } from '../../../supabase/functions/driver-sync/validation';
const completedAt = '2026-09-08T09:00:00Z';
const now = new Date('2026-09-08T10:00:00Z').getTime();
describe('driver sync request validation', () => {
  it('cannot complete by bypassing the proof operation', () => {
    for (const status of ['completed', 'pending', 'cancelled', 'delayed']) expect(() => validateDriverMetadata('assignment_status', { status, changedAt: completedAt }, now)).toThrow();
  });
  it('strips client proof requirements, existing URLs and unrelated assignment fields', () => {
    expect(validateDriverMetadata('delivery_proof', { completedAt, recipientName: ' Anna ', note: ' Paket ', requirePhoto: false, requireSignature: false, existingPhotoUrl: 'https://fake.invalid/proof', company_id: 'other', latitude: 91, longitude: 200 }, now)).toEqual({ completedAt: '2026-09-08T09:00:00.000Z', recipientName: 'Anna', note: 'Paket', latitude: null, longitude: null });
  });
  it('rejects malformed or future timestamps but accepts an offline timestamp', () => {
    expect(() => validateDriverMetadata('delivery_proof', { completedAt: 'invalid' }, now)).toThrow();
    expect(() => validateDriverMetadata('delivery_proof', { completedAt: '2026-09-08T12:00:00Z' }, now)).toThrow();
    expect(validateDriverMetadata('assignment_status', { status: 'active', changedAt: '2026-09-07T09:00:00Z' }, now).status).toBe('active');
  });
  it('rejects empty, nonimage and oversized evidence', () => {
    expect(() => validateDriverImage(new File([''], 'empty.png', { type: 'image/png' }))).toThrow();
    expect(() => validateDriverImage(new File(['code'], 'code.svg', { type: 'image/svg+xml' }))).toThrow();
    expect(() => validateDriverImage({ type: 'image/jpeg', size: 16 * 1024 * 1024 } as File)).toThrow();
    expect(() => validateDriverImage(new File(['photo'], 'photo.jpg', { type: 'image/jpeg' }))).not.toThrow();
  });
});

import { ipHash } from '../_shared/client-ip.ts';
export function bookingNumber(id: string) { return `AT-${id.replace(/-/g, '').slice(0, 10).toUpperCase()}`; }
export function honeypotBooking(value: unknown): { booking: { id: string; public_order_number: string }; order_number: string } | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  if (typeof input.website !== 'string' || !input.website.trim()) return null;
  const id = typeof input.request_id === 'string' ? input.request_id : crypto.randomUUID();
  const number = bookingNumber(id);
  return { booking: { id, public_order_number: number }, order_number: number };
}
export async function allowBooking(request: Request, companyId: string, consume: (key: string, limit: number, seconds: number) => Promise<boolean>) {
  if (!await consume(`public-booking:ip:${await ipHash(request)}`, 5, 600)) return false;
  return consume(`public-booking:company:${companyId}`, 50, 86400);
}

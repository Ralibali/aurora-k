import { describe, expect, it, vi } from 'vitest';
import { storeProof } from '../../supabase/functions/driver-sync/handler';
import { clientIp, ipHash } from '../../supabase/functions/_shared/client-ip';
import { signProofs, proofPath } from '../../supabase/functions/_shared/proof-paths';
import { allowBooking, honeypotBooking } from '../../supabase/functions/public-booking/handler';
import { allowDemo } from '../../supabase/functions/demo-login/handler';
import { trackingExpired } from '../../supabase/functions/track-assignment/handler';
import { validDriverPassword } from '../../supabase/functions/join-driver/handler';
import { retiredUpdatePassword } from '../../supabase/functions/update-password/handler';
import { acceptsCurrentLegal } from '../../supabase/functions/register-company/handler';
import { isAppRoute } from './app-service-worker';
const request = (headers: Record<string, string> = {}) => new Request('https://example.invalid', { headers });
describe('public endpoint hardening', () => {
 it('trusts only the validated last XFF value', () => {
  expect(clientIp(request({ 'x-forwarded-for': 'forged, 2001:DB8::1', 'cf-connecting-ip': '1.2.3.4', 'x-real-ip': '1.2.3.4' }))).toBe('2001:db8::1');
  expect(clientIp(request({ 'cf-connecting-ip': '1.2.3.4' }))).toBe('unknown');
  expect(clientIp(request({ 'x-forwarded-for': '999.999.999.999' }))).toBe('unknown');
  expect(clientIp(request({ 'x-forwarded-for': 'abc' }))).toBe('unknown');
  expect(clientIp(request({ 'x-forwarded-for': '1.2.3.4, invalid!' }))).toBe('unknown');
 });
 it('uses one IP bucket despite spoofed prefixes and changing User-Agent, plus the daily company quota', async () => {
  const consume = vi.fn().mockResolvedValue(true);
  const first = request({ 'x-forwarded-for': 'fake, 192.0.2.1', 'user-agent': 'A' });
  const second = request({ 'x-forwarded-for': 'other, 192.0.2.1', 'user-agent': 'B' });
  expect(await ipHash(first)).toBe(await ipHash(second));
  await allowBooking(first, 'company', consume);
  expect(consume.mock.calls).toEqual([[`public-booking:ip:${await ipHash(first)}`,5,600],['public-booking:company:company',50,86400]]);
  consume.mockReset().mockResolvedValue(false);
  expect(await allowBooking(second, 'company', consume)).toBe(false);
  expect(consume).toHaveBeenCalledOnce();
 });
 it('limits demo attempts to 20 per hour on the IP hash', async () => {
  const consume = vi.fn().mockResolvedValue(false);
  expect(await allowDemo(request(), consume)).toBe(false);
  expect(consume).toHaveBeenCalledWith(`demo-login:ip:${await ipHash(request())}`,20,3600);
 });
 it('returns a plausible booking receipt for honeypots without database work', () => {
  expect(honeypotBooking({website:'bot',request_id:'abcd-1234'})).toEqual({booking:{id:'abcd-1234',public_order_number:'AT-ABCD1234'},order_number:'AT-ABCD1234'});
  expect(honeypotBooking({website:''})).toBeNull();
 });
 it('retires password updates even for authenticated callers', () => {
  expect(retiredUpdatePassword(new Request('https://example.invalid',{method:'POST',headers:{Authorization:'Bearer token'}})).status).toBe(410);
 });
 it('enforces character minimum and byte maximum', () => {
  expect(validDriverPassword('a'.repeat(9))).toBe(false);
  expect(validDriverPassword('a'.repeat(10))).toBe(true);
  expect(validDriverPassword('å'.repeat(36))).toBe(true);
  expect(validDriverPassword('å'.repeat(37))).toBe(false);
 });
 it('expires cancelled jobs and the exact 24-hour boundary', () => {
  const stop='2026-01-01T00:00:00Z', boundary=Date.parse(stop)+86400000;
  expect(trackingExpired({status:'completed',actual_stop:stop},boundary-1)).toBe(false);
  expect(trackingExpired({status:'completed',actual_stop:stop},boundary)).toBe(true);
  expect(trackingExpired({status:'cancelled',actual_stop:null})).toBe(true);
  expect(trackingExpired({status:'active',actual_stop:null})).toBe(false);
 });
 it('requires both current legal versions', () => {
  expect(acceptsCurrentLegal({termsVersion:'2026-09-23',dpaVersion:'2026-09-23'})).toBe(true);
  expect(acceptsCurrentLegal({termsVersion:'old',dpaVersion:'2026-09-23'})).toBe(false);
 });
});
describe('durable proof URLs', () => {
 it('recovers both legacy path formats and batches unique paths for exactly one hour', async () => {
  const sign = vi.fn(async (_bucket: string, paths: string[], _expires: number) => paths.map(path=>({path,signedUrl:`https://signed/${path}`})));
  const rows = await signProofs([{ proof_photo_path:'consignment-notes/user/photo.jpg', signature_url:'https://old/storage/v1/object/public/signatures/user/sign.png' }, {consignment_photo_url:'https://old/storage/v1/object/sign/consignment-notes/user/photo.jpg?token=expired'}],sign);
  expect(sign.mock.calls).toEqual([['consignment-notes',['user/photo.jpg'],3600],['signatures',['user/sign.png'],3600]]);
  expect(rows[0].consignment_photo_url).toBe(rows[1].consignment_photo_url);
  expect(rows[0].signature_url).toBe('https://signed/user/sign.png');
  expect(proofPath(null,'https://unrelated/photo.jpg')).toBeNull();
 });
});
describe('PWA route isolation', () => {
 it.each(['/','/blogg','/ads/akeri','/portal/token','/villkor','/pub-avtal','/login','/administrator'])('does not install on %s',path=>expect(isAppRoute(path)).toBe(false));
 it.each(['/admin','/driver','/driver/assignments/1','/platform','/onboarding'])('retains app registration on %s',path=>expect(isAppRoute(path)).toBe(true));
});

it('stores durable evidence once, reuses duplicate uploads and fails on storage errors', async () => {
 const upload = vi.fn().mockResolvedValue({error:null});
 const from = vi.fn(()=>({upload}));
 const file = new File(['photo'],'photo.jpg',{type:'image/jpeg'});
 const store=()=>storeProof({storage:{from}},'driver','job','operation',file,'photo.jpg');
 expect(await store()).toBe('consignment-notes/driver/job/operation-photo.jpg');
 expect(upload).toHaveBeenCalledWith('driver/job/operation-photo.jpg',file,{contentType:'image/jpeg',upsert:false});
 upload.mockResolvedValue({error:{statusCode:409}});
 expect(await store()).toBe('consignment-notes/driver/job/operation-photo.jpg');
 upload.mockResolvedValue({error:{statusCode:500}});
 await expect(store()).rejects.toEqual({statusCode:500});
});

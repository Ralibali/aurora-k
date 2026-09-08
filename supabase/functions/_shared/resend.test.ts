import { describe, expect, it, vi } from 'vitest';
import { resendRequest, sendResendMail, safeTemplateData } from './resend';
import { invitationIsCurrent, literalEmailPattern, publicLeadTemplateData } from '../send-email/validation';
const mail = { to: 'fixture@example.invalid', subject: 'Test', html: '<p>Test</p>' };
describe('Resend transport configuration and acknowledgement', () => {
  it('uses the Lovable gateway by default and preserves the idempotency header', () => {
    const request = resendRequest('/emails', { headers: { 'Idempotency-Key': 'event-a' } }, { apiKey: 'connector-key', gatewayKey: 'gateway-key' });
    expect(request.url).toBe('https://connector-gateway.lovable.dev/resend/emails');
    const headers = new Headers(request.init.headers);
    expect(headers.get('Authorization')).toBe('Bearer gateway-key');
    expect(headers.get('X-Connection-Api-Key')).toBe('connector-key');
    expect(headers.get('Idempotency-Key')).toBe('event-a');
  });
  it('requires explicit direct mode and does not leak gateway credentials into it', () => {
    expect(() => resendRequest('/emails', {}, { apiKey: 're_key' })).toThrow('gateway');
    expect(() => resendRequest('/emails', {}, { apiKey: 're_key', gatewayKey: 'gateway', mode: 'typo' })).toThrow('Invalid Resend mode');
    const request = resendRequest('/emails', { headers: { 'X-Connection-Api-Key': 'stale-key' } }, { apiKey: 're_key', mode: 'direct' });
    expect(request.url).toBe('https://api.resend.com/emails');
    expect(new Headers(request.init.headers).get('Authorization')).toBe('Bearer re_key');
    expect(new Headers(request.init.headers).has('X-Connection-Api-Key')).toBe(false);
  });
  it('reuses an event key and sends the configured verified sender', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'mail-id' })));
    const result = await sendResendMail(mail, 'event-a', { apiKey: 're_key', mode: 'direct', from: 'Transport <verified@example.invalid>' }, fetcher);
    expect(result.id).toBe('mail-id');
    expect(new Headers(fetcher.mock.calls[0][1].headers).get('Idempotency-Key')).toBe('event-a');
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ from: 'Transport <verified@example.invalid>', to: ['fixture@example.invalid'] });
  });
  it.each(['{}', 'null', 'not json'])('never confirms delivery without a provider ID: %s', body => {
    return expect(sendResendMail(mail, 'event-a', { apiKey: 're_key', mode: 'direct' }, vi.fn().mockResolvedValue(new Response(body)))).rejects.toThrow('email ID');
  });
  it('propagates provider failures and rejects missing deduplication keys before fetch', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Rate limited' }), { status: 429 }));
    await expect(sendResendMail(mail, 'event-a', { apiKey: 're_key', mode: 'direct' }, fetcher)).rejects.toThrow('Resend 429');
    fetcher.mockClear();
    await expect(sendResendMail(mail, ' ', { apiKey: 're_key', mode: 'direct' }, fetcher)).rejects.toThrow('idempotency key');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
describe('saved mail identity and template inputs', () => {
  it('escapes wildcard email characters before an exact case-insensitive recipient lookup', () => {
    expect(literalEmailPattern('first_last%tag@example.invalid')).toBe('first\\_last\\%tag@example.invalid');
  });
  it('uses the same legacy invitation expiry as accepting an invitation', () => {
    const now = Date.parse('2026-09-08T12:00:00Z');
    expect(invitationIsCurrent({ created_at: '2026-09-02T12:00:00Z' }, now)).toBe(true);
    expect(invitationIsCurrent({ created_at: '2026-09-01T12:00:00Z' }, now)).toBe(false);
    expect(invitationIsCurrent({ created_at: '2026-09-02T12:00:00Z', expires_at: 'invalid' }, now)).toBe(false);
    expect(invitationIsCurrent({ created_at: '2026-09-02T12:00:00Z', accepted_at: '2026-09-03T12:00:00Z' }, now)).toBe(false);
  });
  it('provides required lead fields and escapes HTML while rejecting unsafe link schemes', () => {
    const data = safeTemplateData(publicLeadTemplateData({ name: '<img src=x>', email: 'a@example.invalid', html: '<script>' }));
    expect(data.companyName).toBe('&lt;img src=x&gt;');
    expect(data.contactPerson).toBe('&lt;img src=x&gt;');
    expect(data).not.toHaveProperty('html');
    expect(safeTemplateData({ joinUrl: 'javascript:alert(1)' }).joinUrl).toBe('');
  });
});

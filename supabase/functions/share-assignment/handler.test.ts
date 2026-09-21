import { webcrypto } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleShareAssignment, type ShareDependencies } from './handler';
const id = '30000000-0000-4000-8000-000000000001';
const requestId = '40000000-0000-4000-8000-000000000001';
const request = (body: unknown = { assignment_id: id, recipient_email: 'receiver@example.test', request_id: requestId }, token = 'token') => new Request('https://example.test/share-assignment', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) });
let deps: ShareDependencies;
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  deps = {
    user: vi.fn().mockResolvedValue({ id: 'user' }), companyId: vi.fn().mockResolvedValue('company'),
    isAdmin: vi.fn().mockResolvedValue(true), company: vi.fn().mockResolvedValue({ name: 'Åkeri <AB>', org_nr: 'real-company' }),
    assignment: vi.fn().mockResolvedValue({ id, company_id: 'company', title: '<script>unsafe</script>', status: 'active', scheduled_start: '2026-09-21T08:00:00Z', address: 'Testgatan 1', customer: { email: 'customer@example.test' } }),
    allowSend: vi.fn().mockResolvedValue(true), send: vi.fn().mockResolvedValue({ id: 'mail-1' }),
  };
});
describe('assignment email delivery', () => {
  it('identifies the deployed mail version without authentication or sending', async () => {
    const response = await handleShareAssignment(new Request('https://example.test/share-assignment', { method: 'OPTIONS' }), deps);
    expect(response.headers.get('X-Aurora-Assignment-Mail')).toBe('2026-09-21');
    expect(deps.user).not.toHaveBeenCalled();
    expect(deps.send).not.toHaveBeenCalled();
  });
  it('sends escaped assignment content in Swedish time and confirms the provider ID', async () => {
    const response = await handleShareAssignment(request(), deps);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, id: 'mail-1', recipient: 'receiver@example.test' });
    expect(deps.assignment).toHaveBeenCalledWith(id, 'company');
    expect(deps.send).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('10:00') }), expect.stringMatching(/^assignment\/[a-f0-9]{64}$/));
    const mail = vi.mocked(deps.send).mock.calls[0][0];
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('Pågående');
  });
  it('derives notification recipients from the stored customer', async () => {
    await handleShareAssignment(request({ assignment_id: id, mode: 'customer_notification', recipient_email: 'injected@example.test' }), deps);
    expect(deps.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'customer@example.test' }), expect.any(String));
  });
  it('uses the same provider key on a retry', async () => {
    await handleShareAssignment(request(), deps);
    await handleShareAssignment(request(), deps);
    const calls = vi.mocked(deps.send).mock.calls;
    expect(calls[0][1]).toEqual(calls[1][1]);
  });
  it.each(['anonymous', 'driver', 'wrong tenant', 'demo', 'lookup error'])('does not send for %s', async kind => {
    if (kind === 'driver') vi.mocked(deps.isAdmin).mockResolvedValue(false);
    if (kind === 'wrong tenant') vi.mocked(deps.assignment).mockResolvedValue({ company_id: 'other' } as never);
    if (kind === 'demo') vi.mocked(deps.company).mockResolvedValue({ name: 'Demo', org_nr: '556000-0001' });
    if (kind === 'lookup error') vi.mocked(deps.isAdmin).mockRejectedValue(new Error('database'));
    const response = await handleShareAssignment(request(undefined, kind === 'anonymous' ? '' : 'token'), deps);
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(deps.send).not.toHaveBeenCalled();
  });
  it.each(['bad-email', '', 'one@example.test\r\nBcc: other@example.test'])('rejects recipient %s', async recipient => {
    expect((await handleShareAssignment(request({ assignment_id: id, recipient_email: recipient }), deps)).status).toBe(400);
    expect(deps.send).not.toHaveBeenCalled();
  });
  it('returns a retryable error when the mail provider fails', async () => {
    vi.mocked(deps.send).mockRejectedValue(new Error('provider secret response'));
    const response = await handleShareAssignment(request(), deps);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('provider secret');
  });
  it('does not report success without a mail provider acknowledgement', async () => {
    vi.mocked(deps.send).mockResolvedValue({ id: '' });
    expect((await handleShareAssignment(request(), deps)).status).toBe(502);
  });
  it('enforces the company send limit before calling the mail provider', async () => {
    vi.mocked(deps.allowSend).mockResolvedValue(false);
    expect((await handleShareAssignment(request(), deps)).status).toBe(429);
    expect(deps.send).not.toHaveBeenCalled();
  });
});

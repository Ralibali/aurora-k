import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deliverOutbox, renderTransportNotification } from './notification-outbox';
const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('./resend.ts', async importOriginal => ({ ...await importOriginal<typeof import('./resend')>(), sendResendMail: (...args: unknown[]) => mocks.send(...args) }));
type Row = { id: string; recipient_email: string; payload: Record<string, unknown>; type: string; attempts: number };
const row = (id = 'job-a'): Row => ({ id, recipient_email: 'recipient@example.invalid', payload: { mail: { subject: 'Saved subject', html: '<p>Saved content</p>' } }, type: 'trusted-service-mail', attempts: 1 });
function database(rows: Row[], options: { rejectSentUpdate?: boolean; newerClaim?: boolean } = {}) {
  const updates: { values: Record<string, unknown>; conditions: [string, unknown][] }[] = [];
  let status = 'pending';
  const rpc = vi.fn().mockResolvedValue({ data: rows, error: null });
  const from = vi.fn(() => ({ update(values: Record<string, unknown>) {
    const record = { values, conditions: [] as [string, unknown][] };
    updates.push(record);
    const outcome = () => {
      if (values.status === 'sent' && options.rejectSentUpdate) {
        // Simulate the server committing sent while its response is lost.
        status = 'sent';
        return { data: null, error: new Error('Response lost') };
      }
      const eligible = !options.newerClaim && (record.conditions.find(([key]) => key === 'status')?.[1] as string[]).includes(status);
      if (eligible) status = String(values.status);
      return { data: eligible ? { id: rows[0]?.id } : null, error: null };
    };
    const chain = {
      eq(key: string, value: unknown) { record.conditions.push([key, value]); return chain; },
      in(key: string, values: string[]) { record.conditions.push([key, values]); return chain; },
      select() { return chain; }, maybeSingle: async () => outcome(),
      then(resolve: (value: ReturnType<typeof outcome>) => unknown) { return Promise.resolve(outcome()).then(resolve); },
    };
    return chain;
  } }));
  return { admin: { rpc, from } as unknown as Parameters<typeof deliverOutbox>[0], rpc, updates, status: () => status };
}
beforeEach(() => {
  mocks.send.mockReset().mockResolvedValue({ id: 'provider-id' });
  vi.stubGlobal('Deno', { env: { get: () => undefined } });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe('durable notification delivery', () => {
  it('claims a bounded company batch and confirms only the current claim', async () => {
    const db = database([row()]);
    expect(await deliverOutbox(db.admin, 'company-a')).toEqual({ sent: 1, failed: 0 });
    expect(db.rpc).toHaveBeenCalledWith('claim_notification_emails', { p_company_id: 'company-a', p_limit: 5 });
    expect(mocks.send).toHaveBeenCalledWith({ to: 'recipient@example.invalid', subject: 'Saved subject', html: '<p>Saved content</p>' }, 'outbox/job-a');
    expect(db.updates[0].conditions).toEqual([['id', 'job-a'], ['attempts', 1], ['status', ['pending', 'failed']]]);
  });
  it('does not claim success on provider rejection and retains the same event key for retry', async () => {
    mocks.send.mockRejectedValueOnce(new Error('Resend 429'));
    const first = database([row()]);
    expect(await deliverOutbox(first.admin)).toEqual({ sent: 0, failed: 1 });
    expect(first.status()).toBe('failed');
    const retry = database([{ ...row(), attempts: 2 }]);
    await deliverOutbox(retry.admin);
    expect(mocks.send.mock.calls.map(call => call[1])).toEqual(['outbox/job-a', 'outbox/job-a']);
  });
  it('does not overwrite a committed sent status after losing the update response', async () => {
    const db = database([row()], { rejectSentUpdate: true });
    await deliverOutbox(db.admin);
    expect(db.status()).toBe('sent');
    expect(db.updates[1].conditions).toContainEqual(['status', ['pending', 'failed']]);
  });
  it('cannot write back an older attempt after another worker reclaims it', async () => {
    const db = database([row()], { newerClaim: true });
    expect(await deliverOutbox(db.admin)).toEqual({ sent: 0, failed: 0 });
    expect(db.updates[0].conditions).toContainEqual(['attempts', 1]);
  });
  it('spaces provider requests by at least 550ms', async () => {
    vi.useFakeTimers();
    const db = database([row('first'), row('second')]);
    const delivery = deliverOutbox(db.admin);
    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(549);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await delivery;
    expect(mocks.send).toHaveBeenCalledTimes(2);
  });
  it('rejects malformed raw payload content before contacting the provider', async () => {
    const db = database([{ ...row(), payload: { mail: { subject: {}, html: 'text' } } }]);
    expect(await deliverOutbox(db.admin)).toEqual({ sent: 0, failed: 1 });
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
describe('server snapshot email templates', () => {
  it('supports nullable booking fields and treats customer content as text', () => {
    const template = renderTransportNotification('booking-request-created', { companyName: 'A & B', customerName: '<img src=x>', customerEmail: null, customerPhone: null, title: 'Paket', description: null, preferredDate: null });
    expect(template.html).toContain('&lt;img src=x&gt;');
    expect(template.html).not.toContain('<img src=x>');
    expect(template.html).not.toContain('undefined');
  });
  it('escapes assignment content and builds canonical driver links from IDs', () => {
    const template = renderTransportNotification('assignment-confirmation', { assignmentId: 'job-a', driverName: '<script>alert(1)</script>', title: 'Paket', address: null });
    expect(template.html).toContain('&lt;script&gt;');
    expect(template.html).toContain('https://auroratransport.se/driver/assignments/job-a');
    expect(template.html).not.toContain('<script>');
  });
  it('never sends a tracking message with an absent tracking link', () => {
    expect(() => renderTransportNotification('tracking-started', { trackingToken: null })).toThrow('tracking token');
    expect(() => renderTransportNotification('unknown', {})).toThrow('Unknown notification');
  });
});

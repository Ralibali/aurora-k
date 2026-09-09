import { webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAuthEmail, type AuthEmailDependencies } from '../../supabase/functions/auth-email/handler';

const registration = { companyName: 'Pilot Åkeri', orgNr: '556123-4567', fullName: 'Anna Test', phone: '0701234567' };
const signup = { type: 'signup', email: ' Anna@Example.com ', password: 'StrongPassword123', registration };
const user = { id: 'user-1', email_confirmed_at: null };
const actionLink = 'https://project.supabase.co/auth/v1/verify?token=SECRET_TOKEN&type=signup&redirect_to=https%3A%2F%2Fauroratransport.se%2Fregister';
const hashedToken = 'SECRET_TOKEN_HASH_0123456789';
const linkProperties = (type = 'signup') => ({ action_link: actionLink, hashed_token: hashedToken, verification_type: type });
const deps = {
  siteUrl: 'https://auroratransport.se', authUrl: 'https://project.supabase.co',
  rateLimit: vi.fn(), findUser: vi.fn(), createUser: vi.fn(), generateLink: vi.fn(), sendMail: vi.fn(), reportFailure: vi.fn(),
} satisfies AuthEmailDependencies;
const request = (body: unknown, headers: Record<string, string> = {}) => new Request('https://project.supabase.co/functions/v1/auth-email', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '198.51.100.1', ...headers }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('crypto', webcrypto);
  deps.rateLimit.mockResolvedValue(true);
  deps.findUser.mockResolvedValue(null);
  deps.createUser.mockResolvedValue({ data: { user }, error: null });
  deps.generateLink.mockImplementation(async input => ({ data: { properties: linkProperties(input.type) }, error: null }));
  deps.sendMail.mockResolvedValue({ id: 'mail-1' });
});
afterEach(() => vi.unstubAllGlobals());

describe('public auth email boundary', () => {
  it('creates an unconfirmed user with only business metadata and keeps tokens out of the response', async () => {
    const response = await handleAuthEmail(request({ ...signup, role: 'platform_admin', metadata: { role: 'platform_admin' }, redirectTo: 'https://evil.test', registration: { ...registration, role: 'admin' } }), deps);
    expect(await response.json()).toEqual({ accepted: true });
    expect(deps.createUser).toHaveBeenCalledWith({ email: 'anna@example.com', password: signup.password, email_confirm: false, user_metadata: { full_name: registration.fullName, company_registration: registration } });
    expect(deps.generateLink).toHaveBeenCalledWith({ type: 'signup', email: 'anna@example.com', password: expect.any(String) });
    expect(deps.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'anna@example.com', html: expect.stringContaining('SECRET_TOKEN') }), expect.stringMatching(/^auth-email-[a-f0-9]{64}$/));
    expect(deps.reportFailure).not.toHaveBeenCalled();
    const html = deps.sendMail.mock.calls[0][0].html;
    expect(html).toContain(`href="https://auroratransport.se/auth/confirm#token_hash=${hashedToken}&amp;type=signup"`);
    expect(html).not.toContain('/auth/v1/verify');
    expect(html).not.toContain('evil.test');
    expect(html).not.toContain('redirect_to');
  });
  it('does not mutate or send signup mail for a confirmed account', async () => {
    deps.findUser.mockResolvedValue({ ...user, email_confirmed_at: '2026-09-01T12:00:00Z' });
    expect(await (await handleAuthEmail(request(signup), deps)).json()).toEqual({ accepted: true });
    expect(deps.createUser).not.toHaveBeenCalled();
    expect(deps.generateLink).not.toHaveBeenCalled();
    expect(deps.sendMail).not.toHaveBeenCalled();
  });
  it('resends confirmation when signup is retried without replacing the original account details', async () => {
    deps.findUser.mockResolvedValue(user);
    expect(await (await handleAuthEmail(request(signup), deps)).json()).toEqual({ accepted: true });
    expect(deps.createUser).not.toHaveBeenCalled();
    expect(deps.generateLink).toHaveBeenCalledWith({ type: 'signup', email: 'anna@example.com', password: expect.any(String) });
    expect(deps.generateLink.mock.calls[0][0].password).not.toBe(signup.password);
    expect(deps.generateLink.mock.calls[0][0]).not.toHaveProperty('options');
    expect(deps.sendMail).toHaveBeenCalledOnce();
  });
  it.each([null, '2026-09-01T12:00:00Z'])('handles concurrent duplicate creation without changing the other account (confirmed=%s)', async email_confirmed_at => {
    deps.findUser.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...user, email_confirmed_at });
    deps.createUser.mockResolvedValue({ data: { user: null }, error: { code: 'email_exists' } });
    expect(await (await handleAuthEmail(request(signup), deps)).json()).toEqual({ accepted: true });
    expect(deps.createUser).toHaveBeenCalledOnce();
    expect(deps.sendMail).toHaveBeenCalledTimes(email_confirmed_at ? 0 : 1);
  });
  it('does not generate a signup link if a concurrently created account cannot be found', async () => {
    deps.createUser.mockResolvedValue({ data: { user: null }, error: { code: 'email_exists' } });
    expect(await (await handleAuthEmail(request(signup), deps)).json()).toEqual({ accepted: true });
    expect(deps.generateLink).not.toHaveBeenCalled();
  });
  it('resends only for an existing unconfirmed user, with no password or metadata replacement', async () => {
    await handleAuthEmail(request({ type: 'resend', email: signup.email }), deps);
    expect(deps.generateLink).not.toHaveBeenCalled();
    deps.findUser.mockResolvedValue(user);
    await handleAuthEmail(request({ type: 'resend', email: signup.email, registration: { companyName: 'Attacker' }, password: 'attacker-password' }), deps);
    expect(deps.createUser).not.toHaveBeenCalled();
    expect(deps.generateLink.mock.calls[0][0]).not.toHaveProperty('options');
    expect(deps.generateLink.mock.calls[0][0].password).not.toBe('attacker-password');
    expect(deps.sendMail).toHaveBeenCalledOnce();
  });
  it('gives the same generic recovery result for unknown accounts and mail-provider failures', async () => {
    deps.generateLink.mockResolvedValueOnce({ data: { properties: null }, error: { code: 'user_not_found', message: 'private@example.com' } });
    const missing = await handleAuthEmail(request({ type: 'recovery', email: signup.email }), deps);
    deps.sendMail.mockRejectedValueOnce(new Error('provider contains SECRET_TOKEN and private@example.com'));
    const failedMail = await handleAuthEmail(request({ type: 'recovery', email: signup.email }), deps);
    expect(missing.status).toBe(failedMail.status);
    expect(await missing.json()).toEqual(await failedMail.json());
    expect(deps.generateLink).toHaveBeenLastCalledWith({ type: 'recovery', email: 'anna@example.com' });
    expect(deps.sendMail.mock.calls[0][0].html).toContain(`href="https://auroratransport.se/auth/confirm#token_hash=${hashedToken}&amp;type=recovery"`);
    expect(JSON.stringify(deps.reportFailure.mock.calls)).not.toContain('SECRET_TOKEN');
    expect(JSON.stringify(deps.reportFailure.mock.calls)).not.toContain('@');
  });
  it('limits IP and normalized email separately before any privileged auth call, without storing them in cleartext', async () => {
    await handleAuthEmail(request(signup, { 'x-forwarded-for': 'attacker-controlled, 198.51.100.1' }), deps);
    expect(deps.rateLimit.mock.calls.map(call => call.slice(1))).toEqual([[20, 3600], [4, 3600]]);
    const firstKey = deps.rateLimit.mock.calls[0][0];
    expect(firstKey).toMatch(/^auth-email:ip:[a-f0-9]{64}$/);
    expect(deps.rateLimit.mock.calls[1][0]).toMatch(/^auth-email:email:[a-f0-9]{64}$/);
    deps.rateLimit.mockClear();
    await handleAuthEmail(request(signup, { 'x-forwarded-for': 'different-spoof, 198.51.100.1' }), deps);
    expect(deps.rateLimit.mock.calls[0][0]).toBe(firstKey);
    deps.createUser.mockClear();
    deps.rateLimit.mockResolvedValue(false);
    expect((await handleAuthEmail(request(signup), deps)).status).toBe(429);
    expect(deps.createUser).not.toHaveBeenCalled();
  });
  it('fails closed on unavailable rate-limit storage and suppresses address-specific limits', async () => {
    deps.rateLimit.mockRejectedValueOnce(new Error('database failure'));
    expect((await handleAuthEmail(request(signup), deps)).status).toBe(503);
    expect(deps.findUser).not.toHaveBeenCalled();
    deps.rateLimit.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    expect(await (await handleAuthEmail(request(signup), deps)).json()).toEqual({ accepted: true });
    expect(deps.findUser).not.toHaveBeenCalled();
  });
  it('rejects weak passwords, oversized metadata and foreign action links', async () => {
    for (const body of [{ ...signup, password: 'short' }, { ...signup, registration: { ...registration, fullName: 'A'.repeat(121) } }, { ...signup, email: 'invalid' }]) {
      expect((await handleAuthEmail(request(body), deps)).status).toBe(400);
    }
    expect(deps.createUser).not.toHaveBeenCalled();
    deps.generateLink.mockResolvedValueOnce({ data: { properties: { action_link: 'https://evil.test/verify?token=secret' } }, error: null });
    await handleAuthEmail(request(signup), deps);
    expect(deps.sendMail).not.toHaveBeenCalled();
  });
  it.each([
    { ...linkProperties(), hashed_token: '' },
    { ...linkProperties(), hashed_token: 'short' },
    { ...linkProperties(), hashed_token: 'x'.repeat(513) },
    { ...linkProperties(), hashed_token: 'https://evil.test/token' },
    { ...linkProperties(), verification_type: 'recovery' },
    { ...linkProperties(), verification_type: 'invite' },
  ])('fails closed on incomplete or mismatched generated tokens', async properties => {
    deps.generateLink.mockResolvedValueOnce({ data: { properties }, error: null });
    const response = await handleAuthEmail(request(signup), deps);
    expect(await response.json()).toEqual({ accepted: true });
    expect(deps.sendMail).not.toHaveBeenCalled();
    expect(deps.reportFailure).toHaveBeenCalledWith('generate-link');
  });
});

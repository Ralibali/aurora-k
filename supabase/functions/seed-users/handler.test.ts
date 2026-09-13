import { afterEach, describe, expect, it, vi } from 'vitest';
import { retiredSeedUsers } from './handler';

afterEach(() => vi.unstubAllGlobals());

describe('retired seed-users endpoint', () => {
  it.each([undefined, 'Bearer an-admin-session'])('rejects provisioning with authorization %s without reading the body or calling a service', async authorization => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const request = new Request('https://example.test/seed-users', {
      method: 'POST',
      headers: authorization ? { authorization } : {},
      body: '{"users":[{"email":"synthetic@example.test","role":"admin"}]}',
    });
    const body = vi.spyOn(request, 'json');
    const response = retiredSeedUsers(request);
    expect(response.status).toBe(410);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ error: 'This provisioning endpoint has been retired.' });
    expect(body).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['GET', 'PUT', 'PATCH', 'DELETE'])('keeps %s retired too', method => {
    expect(retiredSeedUsers(new Request('https://example.test/seed-users', { method })).status).toBe(410);
  });

  it('allows an empty preflight without activating provisioning', async () => {
    const response = retiredSeedUsers(new Request('https://example.test/seed-users', { method: 'OPTIONS' }));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });
});

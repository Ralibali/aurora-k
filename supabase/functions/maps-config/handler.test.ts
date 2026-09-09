import { describe, expect, it } from 'vitest';
import { handleMapsConfig } from './handler.ts';

const request = (auth?: string) => new Request('https://example.test/maps-config', { method: 'POST', headers: auth ? { Authorization: auth } : {} });

const client = (user: { id: string } | null, rows: Array<{ company_id: string | null }> | null, roleError: unknown = null) => ({
  auth: { getUser: async () => ({ data: { user }, error: user ? null : new Error('invalid') }) },
  from: () => ({
    select: () => ({
      eq: () => ({ eq: () => ({ not: () => ({ limit: async () => ({ data: rows, error: roleError }) }) }) }),
    }),
  }),
});

const env = (name: string) => (name === 'GOOGLE_MAPS_BROWSER_KEY' ? 'test-key-value' : undefined);

describe('maps-config', () => {
  it('rejects anonymous callers', async () => {
    const response = await handleMapsConfig(request(), client(null, null) as never, env);
    expect(response.status).toBe(401);
  });

  it('rejects authenticated users without an admin role bound to a company', async () => {
    const response = await handleMapsConfig(request('Bearer t'), client({ id: 'u1' }, []) as never, env);
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('test-key-value');
  });

  it('returns the browser key to a company admin with no-store caching', async () => {
    const response = await handleMapsConfig(request('Bearer t'), client({ id: 'u1' }, [{ company_id: 'c1' }]) as never, env);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ configured: true, key: 'test-key-value' });
  });

  it('reports unconfigured instead of failing when no key is stored', async () => {
    const response = await handleMapsConfig(request('Bearer t'), client({ id: 'u1' }, [{ company_id: 'c1' }]) as never, () => undefined);
    expect(await response.json()).toEqual({ configured: false });
  });

  it('fails closed when the role lookup errors', async () => {
    const response = await handleMapsConfig(request('Bearer t'), client({ id: 'u1' }, null, new Error('rls')) as never, env);
    expect(response.status).toBe(500);
  });
});

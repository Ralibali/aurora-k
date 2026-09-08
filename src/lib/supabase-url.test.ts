import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchSupabaseFunction, supabaseFunctionUrl } from './supabase-url';
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('public Supabase endpoint configuration', () => {
  it('uses hosted, custom-domain and local URLs without a project ID', () => {
    expect(supabaseFunctionUrl('customer-portal', { token: 'a+b&c' }, 'https://custom.example/')).toBe('https://custom.example/functions/v1/customer-portal?token=a%2Bb%26c');
    expect(supabaseFunctionUrl('track-assignment', {}, 'http://127.0.0.1:54321')).toBe('http://127.0.0.1:54321/functions/v1/track-assignment');
    expect(supabaseFunctionUrl('track-assignment', {}, 'https://project.supabase.co')).toBe('https://project.supabase.co/functions/v1/track-assignment');
  });
  it.each(['', 'undefined', 'javascript:alert(1)', 'https://user:secret@example.com', 'https://example.com?token=old'])('rejects invalid base %s', base => {
    expect(() => supabaseFunctionUrl('customer-portal', {}, base)).toThrow();
  });
  it('reports HTTP errors and invalid responses rather than claiming success', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.com');
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Länken har löpt ut' }), { status: 401 })).mockResolvedValueOnce(new Response('not json', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    await expect(fetchSupabaseFunction('customer-portal')).rejects.toThrow('Länken har löpt ut');
    await expect(fetchSupabaseFunction('customer-portal')).rejects.toThrow('ogiltigt svar');
  });
  it('aborts a stalled request and returns an actionable timeout', async () => {
    vi.useFakeTimers(); vi.stubEnv('VITE_SUPABASE_URL', 'https://example.com');
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))));
    const request = expect(fetchSupabaseFunction('track-assignment', {}, {}, 50)).rejects.toThrow('tog för lång tid');
    await vi.advanceTimersByTimeAsync(50);
    await request;
  });
});

/** Supports hosted, custom-domain and local Supabase URLs without guessing a project ID. */
export function supabaseFunctionUrl(name: string, query: Record<string, string> = {}, base = import.meta.env.VITE_SUPABASE_URL): string {
  if (!base || !/^[a-z0-9-]+$/.test(name)) throw new Error('Tjänstens adress är inte konfigurerad.');
  let url: URL;
  try { url = new URL(base); } catch { throw new Error('Tjänstens adress är inte korrekt konfigurerad.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Tjänstens adress är inte korrekt konfigurerad.');
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/functions/v1/${name}`;
  Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

export async function fetchSupabaseFunction<T>(name: string, query: Record<string, string> = {}, init: RequestInit = {}, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (init.signal?.aborted) cancel();
  init.signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(cancel, timeoutMs);
  try {
    const response = await fetch(supabaseFunctionUrl(name, query), { cache: 'no-store', ...init, signal: controller.signal });
    const payload = await response.json().catch(() => null) as (T & { error?: string }) | null;
    if (!response.ok) throw new Error(payload?.error || 'Tjänsten kunde inte slutföra anropet. Försök igen.');
    if (payload == null) throw new Error('Tjänsten gav ett ogiltigt svar. Försök igen.');
    return payload;
  } catch (error) {
    if (controller.signal.aborted && !init.signal?.aborted) throw new Error('Anropet tog för lång tid. Försök igen.');
    if (error instanceof TypeError) throw new Error('Kunde inte nå tjänsten. Kontrollera anslutningen och försök igen.');
    throw error;
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener('abort', cancel);
  }
}

export type ResendConfig = { apiKey?: string; gatewayKey?: string; mode?: string; from?: string };
export type Mail = { to: string | string[]; subject: string; html: string; reply_to?: string };

export function resendConfig(): ResendConfig {
  return { apiKey: Deno.env.get('RESEND_API_KEY'), gatewayKey: Deno.env.get('LOVABLE_API_KEY'), mode: Deno.env.get('RESEND_API_MODE'), from: Deno.env.get('RESEND_FROM_EMAIL') };
}

// Lovable connector credentials cannot authenticate against api.resend.com.
// Direct Resend credentials are supported only through an explicit mode.
export function resendRequest(path: string, init: RequestInit = {}, config = resendConfig()) {
  if (!config.apiKey) throw new Error('Resend is not configured');
  if (config.mode && !['direct', 'gateway'].includes(config.mode)) throw new Error('Invalid Resend mode');
  const direct = config.mode === 'direct';
  if (!direct && !config.gatewayKey) throw new Error('Resend gateway is not configured');
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${direct ? config.apiKey : config.gatewayKey}`);
  if (!direct) headers.set('X-Connection-Api-Key', config.apiKey);
  else headers.delete('X-Connection-Api-Key');
  return { url: `${direct ? 'https://api.resend.com' : 'https://connector-gateway.lovable.dev/resend'}${path}`, init: { ...init, headers } };
}

export async function requestResend(path: string, init: RequestInit = {}, config = resendConfig(), fetcher: typeof fetch = fetch) {
  const request = resendRequest(path, init, config);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (init.signal?.aborted) cancel();
  init.signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(cancel, 20_000);
  try {
    const response = await fetcher(request.url, { ...request.init, signal: controller.signal });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Resend ${response.status}: ${result?.message ?? result?.name ?? 'request failed'}`);
    return result;
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener('abort', cancel);
  }
}

export async function sendResendMail(mail: Mail, idempotencyKey: string, config = resendConfig(), fetcher: typeof fetch = fetch) {
  if (!idempotencyKey.trim() || idempotencyKey.length > 256) throw new Error('Email requires an idempotency key of at most 256 characters');
  const result = await requestResend('/emails', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ ...mail, from: config.from || 'Aurora Transport <noreply@auroratransport.se>', to: Array.isArray(mail.to) ? mail.to : [mail.to] }),
  }, config, fetcher);
  if (!result || typeof result.id !== 'string' || !result.id.trim()) throw new Error('Resend did not confirm an email ID');
  return result;
}

export function escapeEmail(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

export function safeTemplateData<T extends Record<string, unknown>>(input: T): { [K in keyof T]: string } {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => {
    if (/url$/i.test(key)) {
      try { const url = new URL(String(value)); if (url.protocol !== 'https:') return [key, '']; }
      catch { return [key, '']; }
    }
    return [key, escapeEmail(value)];
  })) as { [K in keyof T]: string };
}

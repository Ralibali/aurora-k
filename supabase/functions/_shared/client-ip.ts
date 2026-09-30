// Only the final, gateway-added XFF value is trusted. Other headers are caller-controlled.
export function clientIp(request: Request): string {
  const value = request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ?? '';
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) && value.split('.').every(part => Number(part) <= 255)) return value;
  if (!value.includes(':') || !/^[0-9a-f.:]{3,64}$/i.test(value)) return 'unknown';
  try { new URL(`http://[${value}]/`); return value.toLowerCase(); } catch { return 'unknown'; }
}
export async function ipHash(request: Request): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(clientIp(request)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

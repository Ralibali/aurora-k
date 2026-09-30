import { ipHash } from '../_shared/client-ip.ts';
export async function allowDemo(request: Request, consume: (key: string, limit: number, seconds: number) => Promise<boolean>) {
  return consume(`demo-login:ip:${await ipHash(request)}`, 20, 3600);
}
export const demoError = 'Demot kunde inte öppnas. Försök igen senare.';

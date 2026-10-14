export type ExpiryStatus = 'expired' | 'warning' | 'ok' | 'none';

const WARNING_DAYS = 30;

// Parsar 'YYYY-MM-DD' som LOKALT datum (inte UTC, som new Date(sträng) gör)
// så att jämförelsen mot dagens datum blir rätt i alla tidszoner.
function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function localToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// Räknar ut status för ett utgångsdatum: utgånget / går ut inom 30 dagar / ok.
// Ren funktion utan beroenden så att den är enkel att testa.
export function expiryStatus(expiresAt: string | null): ExpiryStatus {
  if (!expiresAt) return 'none';
  const today = localToday();
  const expiry = parseLocalDate(expiresAt);
  if (expiry < today) return 'expired';
  const warningLimit = new Date(today);
  warningLimit.setDate(warningLimit.getDate() + WARNING_DAYS);
  if (expiry <= warningLimit) return 'warning';
  return 'ok';
}

export function daysUntil(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.round((parseLocalDate(expiresAt).getTime() - localToday().getTime()) / 86_400_000);
}

export function validateDriverDocumentFile(file: Pick<File, 'size' | 'type'>): string {
  const extensions: Record<string, string> = {
    'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  };
  const ext = extensions[file.type];
  if (!ext) throw new Error('Endast PDF, JPG, PNG eller WebP stöds.');
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) throw new Error('Filen måste vara mellan 1 byte och 10 MB.');
  return ext;
}

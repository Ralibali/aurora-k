// Provperiodens affärslogik — ren funktion så den är enkel att testa.
// Returnerar antal dagar kvar (0 eller negativt = provperioden har löpt ut).
export const TRIAL_DAYS = 14;

export function trialDaysLeft(trialEndsAt: string | null, now: Date = new Date()): number {
  if (!trialEndsAt) return 0;
  return Math.ceil((new Date(trialEndsAt).getTime() - now.getTime()) / 86_400_000);
}

export function isTrialActive(trialEndsAt: string | null, now: Date = new Date()): boolean {
  return trialDaysLeft(trialEndsAt, now) > 0;
}

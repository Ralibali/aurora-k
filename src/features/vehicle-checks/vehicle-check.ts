export const checkItems = [
  { key: 'tires', label: 'Däck' },
  { key: 'lights', label: 'Belysning' },
  { key: 'damage', label: 'Skador' },
] as const;
export type CheckAnswer = 'no_issue' | 'issue' | 'not_checked';
export type CheckAnswers = Record<typeof checkItems[number]['key'], CheckAnswer>;
export type CheckInput = CheckAnswers & { safetyCritical: boolean; note: string };
export type VehicleCheck = CheckAnswers & {
  id: string; company_id: string; assignment_id: string; vehicle_id: string;
  reported_by: string; safety_critical: boolean; note: string;
  status: 'recorded' | 'open' | 'resolved'; created_at: string;
  resolution: string | null; resolved_at: string | null; resolved_by: string | null;
};
export const answerLabels: Record<CheckAnswer, string> = {
  no_issue: 'Ingen avvikelse observerad', issue: 'Avvikelse', not_checked: 'Ej kontrollerad',
};
export function validateCheck(input: CheckInput): string | null {
  const values = checkItems.map(item => input[item.key]);
  if (values.some(value => !['no_issue', 'issue', 'not_checked'].includes(value))) return 'Kontrollera svaren.';
  if (input.note.trim().length > 3000) return 'Beskrivningen får vara högst 3000 tecken.';
  if ((input.safetyCritical || values.includes('issue')) && !input.note.trim()) return 'Beskriv avvikelsen.';
  if (!input.safetyCritical && values.includes('not_checked')) return 'Kontrollera alla punkter eller rapportera en säkerhetskritisk avvikelse.';
  return null;
}
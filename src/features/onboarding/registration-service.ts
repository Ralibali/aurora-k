import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type RegistrationDraft = { companyName: string; orgNr: string; fullName: string; phone: string };

export function getRegistrationDraft(metadata: Record<string, unknown> | undefined): RegistrationDraft | null {
  const candidate = metadata?.company_registration;
  if (!candidate || typeof candidate !== 'object') return null;
  const draft = candidate as Record<string, unknown>;
  if (typeof draft.companyName !== 'string' || !draft.companyName.trim() || typeof draft.fullName !== 'string' || !draft.fullName.trim()) return null;
  return {
    companyName: draft.companyName.trim(), fullName: draft.fullName.trim(),
    orgNr: typeof draft.orgNr === 'string' ? draft.orgNr.trim() : '',
    phone: typeof draft.phone === 'string' ? draft.phone.trim() : '',
  };
}

/** Safe to retry after email confirmation or a network failure. Identity and idempotency belong to the server. */
export async function completeCompanyRegistration(session: Session, draft?: RegistrationDraft) {
  const registration = draft ?? getRegistrationDraft(session.user.user_metadata);
  if (!registration) throw new Error('Fyll i företagsuppgifterna för att slutföra registreringen.');
  const { data, error } = await supabase.functions.invoke('register-company', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: registration,
  });
  if (error || !data?.companyId) throw new Error('Företaget kunde inte kopplas till kontot. Dina kontouppgifter finns kvar; försök igen.');
  return data.companyId as string;
}

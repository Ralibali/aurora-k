import { supabase } from '@/integrations/supabase/client';
import type { RegistrationDraft } from '@/features/onboarding/registration-service';

type AuthEmailRequest = { type: 'signup'; email: string; password: string; registration: RegistrationDraft } | { type: 'resend' | 'recovery'; email: string };

export async function requestAuthEmail(input: AuthEmailRequest) {
  const { data, error } = await supabase.functions.invoke('auth-email', { body: { ...input, email: input.email.trim().toLowerCase() } });
  if (error || data?.accepted !== true) throw new Error('Mejlet kunde inte begäras. Vänta en stund och försök igen.');
}

import { supabase } from '@/integrations/supabase/client';
export const FORTNOX_STATE_KEY = 'aurora-fortnox-state';
export type FortnoxStatus = {
  configured: boolean;
  organizationValid: boolean;
  company: { name: string; organizationNumber: string | null };
  connection: null | { status: string; fortnox_company_name: string; fortnox_organization_number: string; connected_at: string; last_error: string | null };
};
export async function fortnox<T>(action: string, values: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('fortnox', { body: { ...values, action } });
  if (error) {
    const detail = await error.context?.json?.().catch(() => null);
    throw new Error(detail?.error || 'Fortnox kunde inte nås. Försök igen.');
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

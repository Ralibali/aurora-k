import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { validateCheck, type CheckInput, type VehicleCheck } from './vehicle-check';

// Keep the new schema boundary local; managed generated files are not edited manually.
const client = supabase as unknown as {
  from(name: 'vehicle_checks'): { select(columns: string): {
    eq(column: string, value: string): { order(column: string, options: { ascending: boolean }): Promise<{ data: VehicleCheck[] | null; error: Error | null }> };
  } };
  rpc(name: 'report_vehicle_check' | 'resolve_vehicle_check', args: Record<string, unknown>): Promise<{ data: VehicleCheck | null; error: Error | null }>;
};
export function useVehicleChecks() {
  const { companyId, user } = useAuth();
  return useQuery({
    queryKey: ['vehicle-checks', companyId, user?.id], enabled: !!companyId && !!user,
    queryFn: async () => {
      if (!companyId) throw new Error('Logga in igen.');
      const { data, error } = await client.from('vehicle_checks').select('*').eq('company_id', companyId).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    }, refetchInterval: 30_000, refetchOnWindowFocus: true,
  });
}
export function useChangeVehicleCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: 'report'; assignmentId: string; operationId: string; answers: CheckInput } | { type: 'resolve'; id: string; resolution: string }) => {
      if (input.type === 'report') {
        const error = validateCheck(input.answers);
        if (error) throw new Error(error);
      }
      const { data, error } = input.type === 'report'
        ? await client.rpc('report_vehicle_check', { p_operation_id: input.operationId, p_assignment_id: input.assignmentId, p_tires: input.answers.tires, p_lights: input.answers.lights, p_damage: input.answers.damage, p_safety_critical: input.answers.safetyCritical, p_note: input.answers.note.trim() })
        : await client.rpc('resolve_vehicle_check', { p_check_id: input.id, p_resolution: input.resolution.trim() });
      if (error) throw error;
      if (!data) throw new Error('Sparningen kunde inte bekräftas. Försök igen.');
      return data;
    },
    onSuccess: (_data, input) => {
      void qc.invalidateQueries({ queryKey: ['vehicle-checks'] });
      toast.success(input.type === 'report' ? 'Fordonskontrollen är sparad och synlig för admin.' : 'Avvikelsen är avslutad.');
    },
    onError: (error: Error) => toast.error(error.message),
  });
}
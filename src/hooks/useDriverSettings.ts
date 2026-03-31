import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DriverSettings {
  id: string;
  require_signature: boolean;
  require_photo: boolean;
  show_time_report: boolean;
  show_availability_toggle: boolean;
  updated_at: string;
}

export function useDriverSettings() {
  return useQuery({
    queryKey: ['driver_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_settings' as any)
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as DriverSettings | null;
    },
  });
}

export function useUpdateDriverSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DriverSettings> & { id: string }) => {
      const { data, error } = await supabase
        .from('driver_settings' as any)
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DriverSettings;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver_settings'] });
      toast.success('Förarinställningar sparade!');
    },
    onError: (e: Error) => toast.error('Kunde inte spara: ' + e.message),
  });
}

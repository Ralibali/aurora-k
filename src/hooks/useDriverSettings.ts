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

export interface DriverSettingsOverride {
  id: string;
  driver_id: string;
  require_signature: boolean | null;
  require_photo: boolean | null;
  show_time_report: boolean | null;
  show_availability_toggle: boolean | null;
  updated_at: string;
}

// Global defaults
export function useDriverSettings() {
  return useQuery({
    queryKey: ['driver_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as DriverSettings | null;
    },
  });
}

// Per-driver override for a specific driver
export function useDriverSettingsOverride(driverId: string | undefined) {
  return useQuery({
    queryKey: ['driver_settings_overrides', driverId],
    queryFn: async () => {
      if (!driverId) return null;
      const { data, error } = await supabase
        .from('driver_settings_overrides')
        .select('*')
        .eq('driver_id', driverId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as DriverSettingsOverride | null;
    },
    enabled: !!driverId,
  });
}

// All overrides (for admin page)
export function useAllDriverSettingsOverrides() {
  return useQuery({
    queryKey: ['driver_settings_overrides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_settings_overrides')
        .select('*');
      if (error) throw error;
      return (data ?? []) as unknown as DriverSettingsOverride[];
    },
  });
}

// Merged settings for a specific driver (global + override)
export function useEffectiveDriverSettings(driverId: string | undefined) {
  const { data: global } = useDriverSettings();
  const { data: override } = useDriverSettingsOverride(driverId);

  if (!global) return { data: null };

  const effective: DriverSettings = {
    ...global,
    require_signature: override?.require_signature ?? global.require_signature,
    require_photo: override?.require_photo ?? global.require_photo,
    show_time_report: override?.show_time_report ?? global.show_time_report,
    show_availability_toggle: override?.show_availability_toggle ?? global.show_availability_toggle,
  };

  return { data: effective };
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
      toast.success('Globala förarinställningar sparade!');
    },
    onError: (e: Error) => toast.error('Kunde inte spara: ' + e.message),
  });
}

export function useUpsertDriverSettingsOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ driver_id, ...updates }: Partial<DriverSettingsOverride> & { driver_id: string }) => {
      const { data, error } = await supabase
        .from('driver_settings_overrides')
        .upsert(
          { driver_id, ...updates, updated_at: new Date().toISOString() },
          { onConflict: 'driver_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data as unknown as DriverSettingsOverride;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver_settings_overrides'] });
      toast.success('Förarinställningar sparade!');
    },
    onError: (e: Error) => toast.error('Kunde inte spara: ' + e.message),
  });
}

export function useDeleteDriverSettingsOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (driverId: string) => {
      const { error } = await supabase
        .from('driver_settings_overrides')
        .delete()
        .eq('driver_id', driverId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['driver_settings_overrides'] });
      toast.success('Förarens override borttagen – använder globala inställningar');
    },
    onError: (e: Error) => toast.error('Kunde inte ta bort: ' + e.message),
  });
}

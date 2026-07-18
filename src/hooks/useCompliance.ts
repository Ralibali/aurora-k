import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type DriverDocument = Tables<'driver_documents'>;
export type VehicleMaintenance = Tables<'vehicle_maintenance'>;

export const DRIVER_DOC_TYPES = [
  { value: 'korkort', label: 'Körkort' },
  { value: 'adr', label: 'ADR-intyg' },
  { value: 'forarbevis', label: 'Förarbevis' },
  { value: 'ykb', label: 'YKB' },
  { value: 'ovrigt', label: 'Övrigt' },
] as const;

export const MAINTENANCE_TYPES = [
  { value: 'besiktning', label: 'Besiktning' },
  { value: 'service', label: 'Service' },
  { value: 'dackbyte', label: 'Däckbyte' },
  { value: 'ovrigt', label: 'Övrigt' },
] as const;

export { expiryStatus, daysUntil } from '@/lib/compliance';
export type { ExpiryStatus } from '@/lib/compliance';

/* ── Förardokument ── */

export function useDriverDocuments() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ['driver_documents', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_documents')
        .select('*, driver:profiles(full_name)')
        .order('expires_at', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateDriverDocument() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (doc: Omit<TablesInsert<'driver_documents'>, 'company_id'>) => {
      const { error } = await supabase.from('driver_documents').insert({ ...doc, company_id: companyId ?? '' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver_documents'] });
      toast.success('Dokument tillagt');
    },
    onError: (error) => toast.error('Kunde inte spara: ' + error.message),
  });
}

export function useUpdateDriverDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & TablesUpdate<'driver_documents'>) => {
      const { error } = await supabase
        .from('driver_documents')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver_documents'] });
      toast.success('Dokument uppdaterat');
    },
    onError: (error) => toast.error('Kunde inte uppdatera: ' + error.message),
  });
}

export function useDeleteDriverDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('driver_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver_documents'] });
      toast.success('Dokument borttaget');
    },
    onError: (error) => toast.error('Kunde inte ta bort: ' + error.message),
  });
}

/* ── Fordonsunderhåll ── */

export function useVehicleMaintenance() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ['vehicle_maintenance', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_maintenance')
        .select('*, vehicle:vehicles(name, registration_number)')
        .order('due_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateVehicleMaintenance() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<TablesInsert<'vehicle_maintenance'>, 'company_id'>) => {
      const { error } = await supabase.from('vehicle_maintenance').insert({ ...item, company_id: companyId ?? '' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_maintenance'] });
      toast.success('Underhåll tillagt');
    },
    onError: (error) => toast.error('Kunde inte spara: ' + error.message),
  });
}

export function useUpdateVehicleMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & TablesUpdate<'vehicle_maintenance'>) => {
      const { error } = await supabase
        .from('vehicle_maintenance')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_maintenance'] });
      toast.success('Underhåll uppdaterat');
    },
    onError: (error) => toast.error('Kunde inte uppdatera: ' + error.message),
  });
}

export function useDeleteVehicleMaintenance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_maintenance').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_maintenance'] });
      toast.success('Underhåll borttaget');
    },
    onError: (error) => toast.error('Kunde inte ta bort: ' + error.message),
  });
}

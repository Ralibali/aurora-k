import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { validateDriverDocumentFile } from '@/lib/compliance';

export type DriverDocument = Tables<'driver_documents'>;
export type ReviewedDriverDocument = DriverDocument & {
  storage_path: string | null;
  file_name: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  driver: { full_name: string } | null;
};
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
      return data as unknown as ReviewedDriverDocument[] | null;
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

/* ── Förarkollen: private file attachments + internal review ── */

const DOCUMENT_BUCKET = 'driver-compliance';

export function useUploadDriverDocumentAttachment() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ document, file }: { document: ReviewedDriverDocument; file: File }) => {
      if (!companyId || document.company_id !== companyId || document.storage_path)
        throw new Error('Bilagan kan inte laddas upp till detta dokument.');
      const extension = validateDriverDocumentFile(file);
      const path = companyId + '/' + document.driver_id + '/' + document.id + '/' + crypto.randomUUID() + '.' + extension;
      const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const updates = {
        storage_path: path, file_name: file.name.slice(0, 180), review_status: 'pending',
        reviewed_by: null, reviewed_at: null, review_notes: null,
      };
      const { data, error } = await supabase.from('driver_documents')
        .update(updates as unknown as TablesUpdate<'driver_documents'>)
        .eq('id', document.id).eq('company_id', companyId).is('storage_path', null)
        .select('id').maybeSingle();
      if (error || !data) {
        const { error: cleanupError } = await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
        if (cleanupError) console.error('Bilagan kunde inte städas bort:', cleanupError);
        throw error ?? new Error('Dokumentet ändrades av någon annan. Försök igen.');
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['driver_documents'] }); toast.success('Bilagan är sparad för granskning'); },
    onError: (error) => toast.error('Uppladdning misslyckades: ' + error.message),
  });
}

export function useRemoveDriverDocumentAttachment() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (document: ReviewedDriverDocument) => {
      if (!companyId || document.company_id !== companyId || !document.storage_path) throw new Error('Bilaga saknas');
      const path = document.storage_path;
      const { error: fileError } = await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
      if (fileError) throw fileError;
      const { data, error } = await supabase.from('driver_documents')
        .update({ storage_path: null, file_name: null, review_status: 'pending',
          reviewed_at: null, reviewed_by: null, review_notes: null } as unknown as TablesUpdate<'driver_documents'>)
        .eq('id', document.id).eq('company_id', companyId).filter('storage_path', 'eq', path)
        .select('id').maybeSingle();
      if (error || !data) throw error ?? new Error('Bilagan är borttagen men dokumentet kunde inte uppdateras');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['driver_documents'] }); toast.success('Bilagan borttagen'); },
    onError: (error) => toast.error('Kunde inte ta bort bilagan: ' + error.message),
  });
}

export async function openDriverDocumentAttachment(path: string) {
  const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw error ?? new Error('Kunde inte öppna filen');
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

export function useReviewDriverDocument() {
  const { user, companyId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ document, decision }: {
      document: ReviewedDriverDocument; decision: 'approved' | 'rejected';
    }) => {
      if (!user || !companyId || companyId !== document.company_id || !document.storage_path)
        throw new Error('Bilaga eller behörighet saknas');
      const { data, error } = await supabase.from('driver_documents')
        .update({ review_status: decision, reviewed_at: new Date().toISOString(),
          reviewed_by: user.id } as unknown as TablesUpdate<'driver_documents'>)
        .eq('id', document.id).eq('company_id', companyId).filter('storage_path', 'eq', document.storage_path)
        .select('id').maybeSingle();
      if (error || !data) throw error ?? new Error('Dokumentet ändrades, ladda om sidan.');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['driver_documents'] }); toast.success('Intern granskning sparad'); },
    onError: (error) => toast.error('Kunde inte granska: ' + error.message),
  });
}

export function useComplianceEmailReminders() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ['driver_document_reminders', companyId],
    queryFn: async () => {
      const { data, error } = await supabase.from('companies')
        .select('id, driver_document_reminders_enabled').eq('id', companyId!).maybeSingle();
      if (error) throw error;
      return Boolean((data as unknown as { driver_document_reminders_enabled?: boolean } | null)?.driver_document_reminders_enabled);
    },
    enabled: !!companyId,
  });
}

export function useToggleComplianceEmailReminders() {
  const { companyId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!companyId) throw new Error('Företag saknas');
      const { data, error } = await supabase.from('companies')
        .update({ driver_document_reminders_enabled: enabled } as unknown as TablesUpdate<'companies'>)
        .eq('id', companyId).select('id').maybeSingle();
      if (error || !data) throw error ?? new Error('Du saknar behörighet att ändra inställningen');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['driver_document_reminders'] }); toast.success('E-postpåminnelser uppdaterade'); },
    onError: (error) => toast.error('Kunde inte spara inställningen: ' + error.message),
  });
}

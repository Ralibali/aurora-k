import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// ─── DRIVER ABSENCES ─────────────────────────────────────
export function useDriverAbsences(driverId?: string) {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ['driver_absences', driverId, companyId],
    queryFn: async () => {
      let q = supabase.from('driver_absences').select('*, driver:profiles(*)').order('start_date', { ascending: false });
      if (companyId) q = q.eq('company_id', companyId);
      if (driverId) q = q.eq('driver_id', driverId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateAbsence() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  return useMutation({
    mutationFn: async (a: { driver_id: string; type: string; start_date: string; end_date: string; note?: string }) => {
      const { error } = await supabase.from('driver_absences').insert({ ...a, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver_absences'] }); toast.success('Frånvaro registrerad!'); },
    onError: () => toast.error('Kunde inte registrera frånvaro'),
  });
}

export function useUpdateAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: { id: string; [k: string]: any }) => {
      const { error } = await supabase.from('driver_absences').update(u).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver_absences'] }); toast.success('Frånvaro uppdaterad!'); },
  });
}

export function useDeleteAbsence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('driver_absences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['driver_absences'] }); toast.success('Frånvaro borttagen!'); },
  });
}

// ─── PROTOCOLS ───────────────────────────────────────────
export function useProtocols(assignmentId?: string) {
  return useQuery({
    queryKey: ['protocols', assignmentId],
    enabled: !!assignmentId,
    queryFn: async () => {
      const { data, error } = await supabase.from('assignment_protocols').select('*').eq('assignment_id', assignmentId!).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProtocol() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  return useMutation({
    mutationFn: async (p: { assignment_id: string; title: string; content?: string; protocol_type?: string; created_by: string }) => {
      const { error } = await supabase.from('assignment_protocols').insert({ ...p, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['protocols'] }); toast.success('Protokoll skapat!'); },
    onError: () => toast.error('Kunde inte skapa protokoll'),
  });
}

// ─── CUSTOMER SATISFACTION ───────────────────────────────
export function useCustomerSatisfaction(customerId?: string) {
  return useQuery({
    queryKey: ['satisfaction', customerId],
    queryFn: async () => {
      let q = supabase.from('customer_satisfaction').select('*, customer:customers(name)').order('created_at', { ascending: false });
      if (customerId) q = q.eq('customer_id', customerId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

// ─── APPROVALS (ATTESTERING) ─────────────────────────────
export function useApprovals() {
  return useQuery({
    queryKey: ['approvals'],
    queryFn: async () => {
      const { data, error } = await supabase.from('assignment_approvals').select('*, assignment:assignments(*, customer:customers(name), driver:profiles!assignments_assigned_driver_id_fkey(full_name))').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateApproval() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  return useMutation({
    mutationFn: async (a: { assignment_id: string }) => {
      const { error } = await supabase.from('assignment_approvals').insert({ ...a, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approvals'] }); toast.success('Skickad för attestering!'); },
  });
}

export function useUpdateApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: { id: string; status: string; approved_by?: string; comment?: string }) => {
      const { error } = await supabase.from('assignment_approvals').update({ ...u, approved_at: u.status === 'approved' ? new Date().toISOString() : null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['approvals'] }); toast.success('Attestering uppdaterad!'); },
  });
}

// ─── INVOICE TEMPLATES ───────────────────────────────────
export function useInvoiceTemplates() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ['invoice_templates', companyId],
    queryFn: async () => {
      const q = supabase.from('invoice_templates').select('*').order('name');
      if (companyId) q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateInvoiceTemplate() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  return useMutation({
    mutationFn: async (t: { name: string; header_html?: string; footer_html?: string; primary_color?: string }) => {
      const { error } = await supabase.from('invoice_templates').insert({ ...t, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice_templates'] }); toast.success('Fakturamall skapad!'); },
  });
}

export function useUpdateInvoiceTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: { id: string; [k: string]: any }) => {
      const { error } = await supabase.from('invoice_templates').update(u).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice_templates'] }); toast.success('Fakturamall uppdaterad!'); },
  });
}

export function useDeleteInvoiceTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoice_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice_templates'] }); toast.success('Fakturamall borttagen!'); },
  });
}

// ─── BOOKING REQUESTS ────────────────────────────────────
export function useBookingRequests() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ['booking_requests', companyId],
    queryFn: async () => {
      const q = supabase.from('booking_requests').select('*').order('created_at', { ascending: false });
      if (companyId) q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useUpdateBookingRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: { id: string; status?: string; admin_note?: string }) => {
      const { error } = await supabase.from('booking_requests').update(u).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['booking_requests'] }); toast.success('Förfrågan uppdaterad!'); },
  });
}

// ─── EXTERNAL RESOURCES ──────────────────────────────────
export function useExternalResources() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ['external_resources', companyId],
    queryFn: async () => {
      const q = supabase.from('external_resources').select('*').order('name');
      if (companyId) q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateExternalResource() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  return useMutation({
    mutationFn: async (r: { name: string; company?: string; email?: string; phone?: string; specialty?: string; hourly_rate?: number; notes?: string }) => {
      const { error } = await supabase.from('external_resources').insert({ ...r, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['external_resources'] }); toast.success('Resurs skapad!'); },
  });
}

export function useUpdateExternalResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...u }: { id: string; [k: string]: any }) => {
      const { error } = await supabase.from('external_resources').update(u).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['external_resources'] }); toast.success('Resurs uppdaterad!'); },
  });
}

export function useDeleteExternalResource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('external_resources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['external_resources'] }); toast.success('Resurs borttagen!'); },
  });
}

// ─── NOTIFICATIONS ───────────────────────────────────────
export function useNotifications() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ['notifications', companyId],
    queryFn: async () => {
      const q = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
      if (companyId) q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateNotification() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  return useMutation({
    mutationFn: async (n: { title: string; message: string; type?: string; target_role?: string; target_user_id?: string; created_by: string }) => {
      const { error } = await supabase.from('notifications').insert({ ...n, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('Notis skickad!'); },
  });
}

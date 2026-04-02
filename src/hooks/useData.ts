import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

// ─── CUSTOMERS ───────────────────────────────────────────
export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID');
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customer: {
      name: string;
      org_number?: string | null;
      invoice_address?: string | null;
      visit_address?: string | null;
      contact_person?: string | null;
      email?: string | null;
      phone?: string | null;
      price_per_delivery?: number | null;
      price_per_hour?: number | null;
      pricing_type?: string;
      payment_terms_days?: number;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase.from('customers').insert(customer).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Kund skapad!');
    },
    onError: (e: Error) => toast.error('Kunde inte skapa kund: ' + e.message),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('customers').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customers', data.id] });
      toast.success('Kund sparad!');
    },
    onError: (e: Error) => toast.error('Kunde inte spara: ' + e.message),
  });
}

// ─── PROFILES (drivers) ─────────────────────────────────
export function useDrivers() {
  return useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'driver')
        .order('full_name');
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProfile(id: string | undefined) {
  return useQuery({
    queryKey: ['profiles', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID');
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// ─── ASSIGNMENTS (with realtime) ────────────────────────
export function useAssignments() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('assignments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => {
        qc.invalidateQueries({ queryKey: ['assignments'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('*, customer:customers(*), driver:profiles!assignments_assigned_driver_id_fkey(*)')
        .order('scheduled_start', { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000,
  });
}

export function useAssignment(id: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`assignment-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments', filter: `id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ['assignments', id] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, qc]);

  return useQuery({
    queryKey: ['assignments', id],
    queryFn: async () => {
      if (!id) throw new Error('No ID');
      const { data, error } = await supabase
        .from('assignments')
        .select('*, customer:customers(*), driver:profiles!assignments_assigned_driver_id_fkey(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useDriverAssignments(driverId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!driverId) return;
    const channel = supabase
      .channel(`driver-assignments-${driverId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments', filter: `assigned_driver_id=eq.${driverId}` }, () => {
        qc.invalidateQueries({ queryKey: ['assignments', 'driver', driverId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [driverId, qc]);

  return useQuery({
    queryKey: ['assignments', 'driver', driverId],
    queryFn: async () => {
      if (!driverId) throw new Error('No driver ID');
      const { data, error } = await supabase
        .from('assignments')
        .select('*, customer:customers(*), driver:profiles!assignments_assigned_driver_id_fkey(*)')
        .eq('assigned_driver_id', driverId)
        .order('scheduled_start', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!driverId,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignment: {
      title: string;
      customer_id: string;
      address: string;
      instructions?: string | null;
      scheduled_start: string;
      scheduled_end?: string | null;
      assigned_driver_id: string;
      priority?: string;
      admin_comment?: string | null;
    }) => {
      const { data, error } = await supabase.from('assignments').insert(assignment).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Uppdrag skapat!');
    },
    onError: (e: Error) => toast.error('Kunde inte skapa uppdrag: ' + e.message),
  });
}

export function useUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('assignments').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['assignments', data.id] });
      toast.success('Uppdrag uppdaterat');
    },
    onError: (e: Error) => toast.error('Kunde inte uppdatera: ' + e.message),
  });
}

// Driver-specific update that only allows permitted fields via secure RPC
export function useDriverUpdateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      status?: string;
      actual_start?: string | null;
      actual_stop?: string | null;
      driver_comment?: string | null;
      consignment_photo_url?: string | null;
      signature_url?: string | null;
    }) => {
      const { id, ...fields } = params;
      const { error } = await supabase.rpc('driver_update_assignment', {
        _id: id,
        _status: fields.status ?? null,
        _actual_start: fields.actual_start ?? null,
        _actual_stop: fields.actual_stop ?? null,
        _driver_comment: fields.driver_comment ?? null,
        _consignment_photo_url: fields.consignment_photo_url ?? null,
        _signature_url: fields.signature_url ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Uppdrag uppdaterat');
    },
    onError: (e: Error) => toast.error('Kunde inte uppdatera: ' + e.message),
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      toast.success('Uppdraget borttaget');
    },
    onError: (e: Error) => toast.error('Kunde inte ta bort: ' + e.message),
  });
}

export function useBulkAssignDriver() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentIds, driverId }: { assignmentIds: string[]; driverId: string }) => {
      const { error } = await supabase
        .from('assignments')
        .update({ assigned_driver_id: driverId })
        .in('id', assignmentIds);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}

// ─── ASSIGNMENT LOGS ────────────────────────────────────
export function useAssignmentLogs(assignmentId: string | undefined) {
  return useQuery({
    queryKey: ['assignment_logs', assignmentId],
    queryFn: async () => {
      if (!assignmentId) throw new Error('No ID');
      const { data, error } = await supabase
        .from('assignment_logs')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!assignmentId,
  });
}

export function useCreateAssignmentLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: {
      assignment_id: string;
      user_id: string;
      action: string;
      old_value?: string | null;
      new_value?: string | null;
    }) => {
      const { error } = await supabase.from('assignment_logs').insert(log);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['assignment_logs', variables.assignment_id] });
    },
  });
}

// ─── INVOICES ────────────────────────────────────────────
export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, customer:customers(*)')
        .order('invoice_number', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useNextInvoiceNumber() {
  return useQuery({
    queryKey: ['next_invoice_number'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('next_invoice_number');
      if (error) throw error;
      return data as number;
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: {
      invoice_number: number;
      customer_id: string;
      assignment_ids: string[];
      status?: string;
      invoice_date?: string;
      due_date: string;
      total_ex_vat: number;
      vat_amount: number;
      total_inc_vat: number;
      reference?: string | null;
      message?: string | null;
    }) => {
      const { data, error } = await supabase.from('invoices').insert(invoice).select().single();
      if (error) throw error;
      await supabase.from('assignments').update({ invoiced: true }).in('id', invoice.assignment_ids);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['next_invoice_number'] });
      toast.success('Faktura skapad!');
    },
    onError: (e: Error) => toast.error('Kunde inte skapa faktura: ' + e.message),
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Fakturastatus uppdaterad');
    },
    onError: (e: Error) => toast.error('Kunde inte uppdatera: ' + e.message),
  });
}

// ─── SETTINGS ────────────────────────────────────────────
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; [key: string]: any }) => {
      const { id, ...rest } = updates;
      const { data, error } = await supabase.from('settings').update(rest).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Inställningar sparade!');
    },
    onError: (e: Error) => toast.error('Kunde inte spara: ' + e.message),
  });
}

export function useCreateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: { company_name: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('settings').insert(settings).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

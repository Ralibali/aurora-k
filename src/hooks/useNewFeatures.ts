import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// ─── ARTICLES ────────────────────────────────────────────
export function useArticles() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ['articles', companyId],
    queryFn: async () => {
      const q = supabase.from('articles').select('*').order('name');
      if (companyId) q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateArticle() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  return useMutation({
    mutationFn: async (article: { name: string; description?: string | null; unit?: string; default_price?: number; article_number?: string | null; vat_rate?: number }) => {
      const { data, error } = await supabase.from('articles').insert({ ...article, company_id: companyId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['articles'] }); toast.success('Artikel skapad!'); },
    onError: () => toast.error('Kunde inte skapa artikel'),
  });
}

export function useUpdateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('articles').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['articles'] }); toast.success('Artikel uppdaterad!'); },
    onError: () => toast.error('Kunde inte uppdatera artikel'),
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['articles'] }); toast.success('Artikel borttagen!'); },
    onError: () => toast.error('Kunde inte ta bort artikel'),
  });
}

// ─── VEHICLES ────────────────────────────────────────────
export function useVehicles() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ['vehicles', companyId],
    queryFn: async () => {
      const q = supabase.from('vehicles').select('*').order('name');
      if (companyId) q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  return useMutation({
    mutationFn: async (vehicle: { name: string; registration_number?: string | null; type?: string; make?: string | null; model?: string | null; year?: number | null; notes?: string | null }) => {
      const { data, error } = await supabase.from('vehicles').insert({ ...vehicle, company_id: companyId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Fordon skapat!'); },
    onError: () => toast.error('Kunde inte skapa fordon'),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('vehicles').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Fordon uppdaterat!'); },
    onError: () => toast.error('Kunde inte uppdatera fordon'),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicles'] }); toast.success('Fordon borttaget!'); },
    onError: () => toast.error('Kunde inte ta bort fordon'),
  });
}

// ─── ORDERS ──────────────────────────────────────────────
export function useOrders() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ['orders', companyId],
    queryFn: async () => {
      const q = supabase.from('orders').select('*, customer:customers(*)').order('created_at', { ascending: false });
      if (companyId) q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  return useMutation({
    mutationFn: async (order: { title: string; customer_id: string; description?: string | null }) => {
      const { data, error } = await supabase.from('orders').insert({ ...order, company_id: companyId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Beställning skapad!'); },
    onError: () => toast.error('Kunde inte skapa beställning'),
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from('orders').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['orders'] }); toast.success('Beställning uppdaterad!'); },
    onError: () => toast.error('Kunde inte uppdatera beställning'),
  });
}

// ─── CUSTOMER PRICE LISTS ────────────────────────────────
export function useCustomerPriceList(customerId: string | undefined) {
  return useQuery({
    queryKey: ['customer_price_list', customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase.from('customer_price_lists').select('*, article:articles(*)').eq('customer_id', customerId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useUpsertCustomerPrice() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  return useMutation({
    mutationFn: async (item: { customer_id: string; article_id: string; price: number }) => {
      const { error } = await supabase.from('customer_price_lists').upsert({ ...item, company_id: companyId }, { onConflict: 'customer_id,article_id' });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer_price_list'] }); toast.success('Pris sparat!'); },
    onError: () => toast.error('Kunde inte spara pris'),
  });
}

export function useDeleteCustomerPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customer_price_lists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer_price_list'] }); },
  });
}

// ─── ORDER TEMPLATES ─────────────────────────────────────
export function useOrderTemplates() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ['order_templates', companyId],
    queryFn: async () => {
      const q = supabase.from('order_templates').select('*').order('name');
      if (companyId) q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });
}

export function useCreateOrderTemplate() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  return useMutation({
    mutationFn: async (template: { name: string; description?: string | null; template_data?: any }) => {
      const { data, error } = await supabase.from('order_templates').insert({ ...template, company_id: companyId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['order_templates'] }); toast.success('Mall skapad!'); },
    onError: () => toast.error('Kunde inte skapa mall'),
  });
}

export function useDeleteOrderTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('order_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['order_templates'] }); toast.success('Mall borttagen!'); },
  });
}

// ─── ASSIGNMENT ARTICLES ─────────────────────────────────
export function useAssignmentArticles(assignmentId: string | undefined) {
  return useQuery({
    queryKey: ['assignment_articles', assignmentId],
    enabled: !!assignmentId,
    queryFn: async () => {
      const { data, error } = await supabase.from('assignment_articles').select('*, article:articles(*)').eq('assignment_id', assignmentId!);
      if (error) throw error;
      return data;
    },
  });
}

export function useAddAssignmentArticle() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  return useMutation({
    mutationFn: async (item: { assignment_id: string; article_id?: string | null; name: string; unit?: string; quantity?: number; unit_price?: number; vat_rate?: number }) => {
      const { error } = await supabase.from('assignment_articles').insert({ ...item, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignment_articles'] }); toast.success('Artikel tillagd!'); },
    onError: () => toast.error('Kunde inte lägga till artikel'),
  });
}

export function useDeleteAssignmentArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assignment_articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignment_articles'] }); },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { Json, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

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
    mutationFn: async ({ id, ...updates }: { id: string } & TablesUpdate<'articles'>) => {
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
    mutationFn: async ({ id, ...updates }: { id: string } & TablesUpdate<'vehicles'>) => {
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
    mutationFn: async ({ id, ...updates }: { id: string } & TablesUpdate<'orders'>) => {
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
    mutationFn: async (template: { name: string; description?: string | null; template_data?: Json }) => {
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

// ─── OB RATES ────────────────────────────────────────────
export interface ObRate {
  id: string;
  name: string;
  type: string;
  rate_per_hour: number;
  start_time: string;
  end_time: string;
  applies_to_weekdays: boolean;
  applies_to_saturdays: boolean;
  applies_to_sundays: boolean;
  active: boolean;
}

export function useObRates() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ['ob_rates', companyId],
    queryFn: async () => {
      const q = supabase.from('ob_rates').select('*').order('name');
      if (companyId) q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ObRate[];
    },
    enabled: !!companyId,
  });
}

export function useCreateObRate() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  return useMutation({
    mutationFn: async (rate: Omit<TablesInsert<'ob_rates'>, 'company_id'>) => {
      const { data, error } = await supabase.from('ob_rates').insert({ ...rate, company_id: companyId ?? '' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ob_rates'] }); toast.success('OB-tillägg skapat!'); },
    onError: () => toast.error('Kunde inte skapa OB-tillägg'),
  });
}

export function useUpdateObRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & TablesUpdate<'ob_rates'>) => {
      const { error } = await supabase.from('ob_rates').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ob_rates'] }); toast.success('OB-tillägg uppdaterat!'); },
    onError: () => toast.error('Kunde inte uppdatera'),
  });
}

export function useDeleteObRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ob_rates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ob_rates'] }); toast.success('OB-tillägg borttaget!'); },
    onError: () => toast.error('Kunde inte ta bort'),
  });
}

// ─── PER DIEM RATES ──────────────────────────────────────
export interface PerDiemRate {
  id: string;
  name: string;
  type: string;
  amount: number;
  min_hours: number;
  active: boolean;
}

export function usePerDiemRates() {
  const { companyId } = useAuth();
  return useQuery({
    queryKey: ['per_diem_rates', companyId],
    queryFn: async () => {
      const q = supabase.from('per_diem_rates').select('*').order('name');
      if (companyId) q.eq('company_id', companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PerDiemRate[];
    },
    enabled: !!companyId,
  });
}

export function useCreatePerDiemRate() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  return useMutation({
    mutationFn: async (rate: Omit<TablesInsert<'per_diem_rates'>, 'company_id'>) => {
      const { data, error } = await supabase.from('per_diem_rates').insert({ ...rate, company_id: companyId ?? '' }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['per_diem_rates'] }); toast.success('Traktamente skapat!'); },
    onError: () => toast.error('Kunde inte skapa traktamente'),
  });
}

export function useUpdatePerDiemRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & TablesUpdate<'per_diem_rates'>) => {
      const { error } = await supabase.from('per_diem_rates').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['per_diem_rates'] }); toast.success('Traktamente uppdaterat!'); },
    onError: () => toast.error('Kunde inte uppdatera'),
  });
}

export function useDeletePerDiemRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('per_diem_rates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['per_diem_rates'] }); toast.success('Traktamente borttaget!'); },
    onError: () => toast.error('Kunde inte ta bort'),
  });
}

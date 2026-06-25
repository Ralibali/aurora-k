import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { PersistedInvoiceLine } from '@/lib/invoice-lines';

export type ReliableInvoiceInput = {
  invoice_number: number;
  customer_id: string;
  assignment_ids: string[];
  status: string;
  invoice_date: string;
  due_date: string;
  total_ex_vat: number;
  vat_amount: number;
  total_inc_vat: number;
  reference?: string | null;
  message?: string | null;
  lines: PersistedInvoiceLine[];
};

export function useCreateReliableInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoice: ReliableInvoiceInput) => {
      const client = supabase as unknown as {
        rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>;
      };
      const { data, error } = await client.rpc('create_invoice_with_lines', {
        p_invoice_number: invoice.invoice_number,
        p_customer_id: invoice.customer_id,
        p_assignment_ids: invoice.assignment_ids,
        p_status: invoice.status,
        p_invoice_date: invoice.invoice_date,
        p_due_date: invoice.due_date,
        p_total_ex_vat: invoice.total_ex_vat,
        p_vat_amount: invoice.vat_amount,
        p_total_inc_vat: invoice.total_inc_vat,
        p_reference: invoice.reference ?? null,
        p_message: invoice.message ?? null,
        p_lines: invoice.lines,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['next_invoice_number'] });
      toast.success('Fakturan skapades och uppdragen markerades som fakturerade.');
    },
    onError: (error: Error) => toast.error(`Kunde inte skapa fakturan: ${error.message}`),
  });
}

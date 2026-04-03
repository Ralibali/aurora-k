import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { useInvoices, useAssignments, useSettings } from '@/hooks/useData';
import { generateInvoicePdf } from '@/lib/invoice-pdf';
import { calculateDecimalHours } from '@/lib/format';
import { FileText, Download } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function DriverInvoices() {
  const { data: invoices, isLoading } = useInvoices();
  const { data: allAssignments } = useAssignments();
  const { data: settings } = useSettings();

  const now = new Date().toISOString().split('T')[0];
  const processed = (invoices ?? []).map(i => ({
    ...i,
    status: i.status === 'sent' && i.due_date < now ? 'overdue' : i.status,
  }));

  const handleDownload = (inv: typeof processed[0]) => {
    const customer = inv.customer;
    if (!customer || !settings) {
      toast.error('Kan inte generera PDF just nu');
      return;
    }

    const invoiceAssignments = (allAssignments ?? []).filter(a =>
      inv.assignment_ids.includes(a.id)
    );

    const lines = invoiceAssignments.map(a => {
      const hours = a.actual_start && a.actual_stop ? calculateDecimalHours(a.actual_start, a.actual_stop) : 0;
      const unitPrice = customer.pricing_type === 'per_delivery' ? (customer.price_per_delivery || 0) : (customer.price_per_hour || 0);
      const amount = customer.pricing_type === 'per_delivery' ? unitPrice : hours * unitPrice;
      return { date: a.actual_start, description: a.title, driver: a.driver?.full_name || '', hours, unitPrice, amount };
    });

    const vatRate = inv.total_ex_vat > 0 ? Math.round((inv.vat_amount / inv.total_ex_vat) * 100) : 0;

    const doc = generateInvoicePdf({
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date,
      dueDate: inv.due_date,
      reference: inv.reference,
      message: inv.message,
      customer: { name: customer.name, org_number: customer.org_number, invoice_address: customer.invoice_address },
      company: {
        company_name: settings.company_name, org_number: settings.org_number,
        address: settings.address, zip_city: settings.zip_city,
        email: settings.email, phone: settings.phone,
        bankgiro: settings.bankgiro, plusgiro: settings.plusgiro, vat_number: settings.vat_number,
      },
      lines,
      totalExVat: inv.total_ex_vat,
      vatAmount: inv.vat_amount,
      totalIncVat: inv.total_inc_vat,
      vatRate,
    });

    doc.save(`Faktura-${inv.invoice_number}.pdf`);
    toast.success('PDF nedladdad');
  };

  return (
    <>
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">Mina fakturor</h2>

        {isLoading && [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}

        {!isLoading && processed.length === 0 && (
          <div className="text-center py-16">
            <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Inga fakturor ännu</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Fakturor kopplade till dina uppdrag visas här</p>
          </div>
        )}

        {processed.map((inv, i) => (
          <motion.div
            key={inv.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
          >
            <Card>
              <CardContent className="py-4 px-4">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="font-semibold text-[15px] font-mono">Faktura #{inv.invoice_number}</p>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
                <p className="text-sm text-muted-foreground">{inv.customer?.name}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Förfaller: {inv.due_date}</span>
                    <span className="font-medium ml-3">{inv.total_inc_vat.toFixed(0)} kr</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(inv)} title="Ladda ner PDF">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </>
  );
}

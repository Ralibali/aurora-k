import { DriverLayout } from '@/components/DriverLayout';
import { Card, CardContent } from '@/components/ui/card';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { useInvoices } from '@/hooks/useData';
import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

export default function DriverInvoices() {
  const { data: invoices, isLoading } = useInvoices();

  const now = new Date().toISOString().split('T')[0];
  const processed = (invoices ?? []).map(i => ({
    ...i,
    status: i.status === 'sent' && i.due_date < now ? 'overdue' : i.status,
  }));

  return (
    <DriverLayout>
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
                  <p className="font-semibold text-[15px]">Faktura #{inv.invoice_number}</p>
                  <InvoiceStatusBadge status={inv.status} />
                </div>
                <p className="text-sm text-muted-foreground">{inv.customer?.name}</p>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-muted-foreground">Förfaller: {inv.due_date}</span>
                  <span className="font-medium">{inv.total_inc_vat.toFixed(0)} kr</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </DriverLayout>
  );
}

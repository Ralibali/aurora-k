import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { InvoiceDocumentLine } from '@/features/invoicing/invoice-document';

type Props = {
  invoice: Record<string, any> | null;
  lines: InvoiceDocumentLine[];
  settings: Record<string, any> | null | undefined;
  onClose: () => void;
  onDownload: () => void;
};

export function InvoicePreviewDialog({ invoice, lines, settings, onClose, onDownload }: Props) {
  return (
    <Dialog open={Boolean(invoice)} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Faktura #{invoice?.invoice_number}</DialogTitle></DialogHeader>
        {invoice && <div className="space-y-6 rounded-lg border p-5">
          <div className="flex justify-between gap-6">
            <div><p className="text-lg font-bold">{settings?.company_name}</p><p className="text-sm text-muted-foreground">{settings?.address} {settings?.zip_city}</p></div>
            <div className="text-right"><p className="text-2xl font-bold text-primary">FAKTURA</p><p>Nr {invoice.invoice_number}</p><p>{invoice.invoice_date}</p><p>Förfaller {invoice.due_date}</p></div>
          </div>
          <div><p className="text-xs uppercase text-muted-foreground">Faktureras till</p><p className="font-semibold">{invoice.customer?.name}</p><p className="text-sm text-muted-foreground">{invoice.customer?.invoice_address}</p></div>
          <Table>
            <TableHeader><TableRow><TableHead>Beskrivning</TableHead><TableHead>Chaufför</TableHead><TableHead className="text-right">Antal</TableHead><TableHead className="text-right">À-pris</TableHead><TableHead className="text-right">Moms</TableHead><TableHead className="text-right">Belopp</TableHead></TableRow></TableHeader>
            <TableBody>{lines.map(line => <TableRow key={line.id}><TableCell>{line.description}</TableCell><TableCell>{line.driver}</TableCell><TableCell className="text-right">{line.quantity} {line.unit}</TableCell><TableCell className="text-right">{line.unitPrice.toLocaleString('sv-SE')} kr</TableCell><TableCell className="text-right">{line.vatRate}%</TableCell><TableCell className="text-right font-mono">{line.amount.toLocaleString('sv-SE')} kr</TableCell></TableRow>)}</TableBody>
          </Table>
          <div className="border-t pt-3 text-right"><p>Netto: {Number(invoice.total_ex_vat).toLocaleString('sv-SE')} kr</p><p>Moms: {Number(invoice.vat_amount).toLocaleString('sv-SE')} kr</p><p className="text-lg font-bold">Att betala: {Number(invoice.total_inc_vat).toLocaleString('sv-SE')} kr</p></div>
          {invoice.message && <div className="border-t pt-3"><p className="text-xs uppercase text-muted-foreground">Meddelande</p><p>{invoice.message}</p></div>}
        </div>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onDownload}><Download className="mr-1 h-4 w-4" /> Ladda ner PDF</Button><Button variant="ghost" onClick={onClose}>Stäng</Button></div>
      </DialogContent>
    </Dialog>
  );
}

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateInvoicePdf } from '@/lib/invoice-pdf';
import { buildInvoicePdfData } from '@/features/invoicing/invoice-document';

type Props = {
  invoice: Record<string, any>;
  assignments: Record<string, any>[];
  settings: Record<string, any> | null | undefined;
};

export function PortalInvoiceDownloadButton({ invoice, assignments, settings }: Props) {
  const handleDownload = () => {
    if (!settings) return;
    generateInvoicePdf(buildInvoicePdfData(invoice as any, assignments as any, settings as any)).save(`Faktura-${invoice.invoice_number}.pdf`);
  };

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleDownload} disabled={!settings}>
      <Download className="mr-1 h-4 w-4" /> PDF
    </Button>
  );
}

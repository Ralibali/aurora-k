import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatSwedishDate, calculateDecimalHours } from '@/lib/format';

interface InvoicePdfData {
  invoiceNumber: number;
  invoiceDate: string;
  dueDate: string;
  reference: string | null;
  message: string | null;
  customer: {
    name: string;
    org_number: string | null;
    invoice_address: string | null;
  };
  company: {
    company_name: string;
    org_number: string | null;
    address: string | null;
    zip_city: string | null;
    email: string | null;
    phone: string | null;
    bankgiro: string | null;
    plusgiro: string | null;
    vat_number: string | null;
  };
  lines: {
    date: string | null;
    description: string;
    driver: string;
    hours: number;
    unitPrice: number;
    amount: number;
  }[];
  totalExVat: number;
  vatAmount: number;
  totalIncVat: number;
}

export function generateInvoicePdf(data: InvoicePdfData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(data.company.company_name, margin, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const companyLines = [
    data.company.address,
    data.company.zip_city,
    data.company.email,
    data.company.phone,
    data.company.org_number ? `Org.nr: ${data.company.org_number}` : null,
  ].filter(Boolean) as string[];
  companyLines.forEach((line, i) => doc.text(line, margin, 32 + i * 4.5));

  // Invoice title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('FAKTURA', pageWidth - margin, 25, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const invoiceInfo = [
    `Fakturanr: ${data.invoiceNumber}`,
    `Fakturadatum: ${data.invoiceDate}`,
    `Förfallodatum: ${data.dueDate}`,
    data.reference ? `Er referens: ${data.reference}` : null,
  ].filter(Boolean) as string[];
  invoiceInfo.forEach((line, i) => doc.text(line, pageWidth - margin, 32 + i * 4.5, { align: 'right' }));

  // Customer
  let y = 60;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(data.customer.name, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (data.customer.org_number) {
    y += 5;
    doc.text(`Org.nr: ${data.customer.org_number}`, margin, y);
  }
  if (data.customer.invoice_address) {
    y += 5;
    doc.text(data.customer.invoice_address, margin, y);
  }

  // Table
  y += 12;
  autoTable(doc, {
    startY: y,
    head: [['Datum', 'Beskrivning', 'Chaufför', 'Timmar', 'À-pris', 'Belopp']],
    body: data.lines.map(l => [
      l.date ? formatSwedishDate(l.date) : '–',
      l.description,
      l.driver,
      l.hours.toString(),
      `${l.unitPrice.toFixed(0)} kr`,
      `${l.amount.toFixed(0)} kr`,
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [35, 56, 82], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: margin, right: margin },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const totalsX = pageWidth - margin;
  doc.setFontSize(10);
  doc.text(`Netto ex. moms:`, totalsX - 50, finalY);
  doc.text(`${data.totalExVat.toFixed(0)} kr`, totalsX, finalY, { align: 'right' });
  doc.text(`Moms 25%:`, totalsX - 50, finalY + 5);
  doc.text(`${data.vatAmount.toFixed(0)} kr`, totalsX, finalY + 5, { align: 'right' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Att betala:`, totalsX - 50, finalY + 12);
  doc.text(`${data.totalIncVat.toFixed(0)} kr`, totalsX, finalY + 12, { align: 'right' });

  // Message
  if (data.message) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(data.message, margin, finalY + 22);
  }

  // Payment info footer
  const footerY = finalY + (data.message ? 32 : 22);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(200);
  doc.line(margin, footerY, pageWidth - margin, footerY);
  const paymentParts = [
    data.company.bankgiro ? `Bankgiro: ${data.company.bankgiro}` : null,
    data.company.plusgiro ? `Plusgiro: ${data.company.plusgiro}` : null,
    data.company.vat_number ? `Moms.nr: ${data.company.vat_number}` : null,
  ].filter(Boolean) as string[];
  doc.text(paymentParts.join('   ·   '), margin, footerY + 5);

  return doc;
}

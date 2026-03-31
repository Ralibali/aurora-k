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
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const rightCol = pageWidth - margin;

  // ─── Brand color bar at top ──────────────────────────
  doc.setFillColor(30, 58, 95); // primary dark blue
  doc.rect(0, 0, pageWidth, 4, 'F');

  // ─── Company name ────────────────────────────────────
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text(data.company.company_name, margin, 20);

  // Company details (left column)
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const companyLines = [
    data.company.address,
    data.company.zip_city,
    data.company.email,
    data.company.phone,
    data.company.org_number ? `Org.nr: ${data.company.org_number}` : null,
    data.company.vat_number ? `Moms.nr: ${data.company.vat_number}` : null,
  ].filter(Boolean) as string[];
  companyLines.forEach((line, i) => doc.text(line, margin, 27 + i * 4));

  // ─── FAKTURA title (right) ───────────────────────────
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('FAKTURA', rightCol, 20, { align: 'right' });

  // Invoice meta (right column)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);

  const metaItems = [
    { label: 'Fakturanr', value: String(data.invoiceNumber) },
    { label: 'Fakturadatum', value: data.invoiceDate },
    { label: 'Förfallodatum', value: data.dueDate },
    ...(data.reference ? [{ label: 'Er referens', value: data.reference }] : []),
  ];

  metaItems.forEach((item, i) => {
    const y = 27 + i * 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(item.label, rightCol - 40, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(item.value, rightCol, y, { align: 'right' });
  });

  // ─── Separator ───────────────────────────────────────
  const sepY = 52;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(margin, sepY, rightCol, sepY);

  // ─── Customer box ────────────────────────────────────
  let y = 58;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130, 130, 130);
  doc.text('FAKTURERAS TILL', margin, y);

  y += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(data.customer.name, margin, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  if (data.customer.org_number) {
    y += 5;
    doc.text(`Org.nr: ${data.customer.org_number}`, margin, y);
  }
  if (data.customer.invoice_address) {
    const addressLines = data.customer.invoice_address.split('\n');
    addressLines.forEach(line => {
      y += 4.5;
      doc.text(line.trim(), margin, y);
    });
  }

  // ─── Table ───────────────────────────────────────────
  y += 12;
  autoTable(doc, {
    startY: y,
    head: [['Datum', 'Beskrivning', 'Chaufför', 'Antal', 'À-pris', 'Belopp']],
    body: data.lines.map(l => [
      l.date ? formatSwedishDate(l.date) : '–',
      l.description,
      l.driver,
      l.hours.toFixed(1),
      `${l.unitPrice.toLocaleString('sv-SE')} kr`,
      `${l.amount.toLocaleString('sv-SE')} kr`,
    ]),
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
      lineWidth: 0,
      textColor: [50, 50, 50],
    },
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 24 },
      3: { halign: 'right', cellWidth: 18 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 26 },
    },
    margin: { left: margin, right: margin },
  });

  // ─── Totals section ──────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 6;
  const totalsWidth = 75;
  const totalsX = rightCol - totalsWidth;

  // Background for totals
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(totalsX - 4, finalY - 2, totalsWidth + 4, 30, 2, 2, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  doc.text('Netto ex. moms', totalsX, finalY + 4);
  doc.setTextColor(50, 50, 50);
  doc.text(`${data.totalExVat.toLocaleString('sv-SE')} kr`, rightCol, finalY + 4, { align: 'right' });

  doc.setTextColor(100, 100, 100);
  doc.text('Moms 25%', totalsX, finalY + 10);
  doc.setTextColor(50, 50, 50);
  doc.text(`${data.vatAmount.toLocaleString('sv-SE')} kr`, rightCol, finalY + 10, { align: 'right' });

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(totalsX, finalY + 14, rightCol, finalY + 14);

  // Total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Att betala', totalsX, finalY + 22);
  doc.text(`${data.totalIncVat.toLocaleString('sv-SE')} kr`, rightCol, finalY + 22, { align: 'right' });

  // ─── Message ─────────────────────────────────────────
  if (data.message) {
    const msgY = finalY + 36;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text('MEDDELANDE', margin, msgY);
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(data.message, margin, msgY + 5);
  }

  // ─── Footer ──────────────────────────────────────────
  const footerY = pageHeight - 18;

  // Footer bar
  doc.setFillColor(245, 247, 250);
  doc.rect(0, footerY - 6, pageWidth, 24, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, footerY - 6, rightCol, footerY - 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130, 130, 130);

  const footerParts: string[] = [];
  if (data.company.bankgiro) footerParts.push(`Bankgiro: ${data.company.bankgiro}`);
  if (data.company.plusgiro) footerParts.push(`Plusgiro: ${data.company.plusgiro}`);
  if (data.company.org_number) footerParts.push(`Org.nr: ${data.company.org_number}`);
  if (data.company.vat_number) footerParts.push(`Moms.nr: ${data.company.vat_number}`);

  doc.text(footerParts.join('     ·     '), pageWidth / 2, footerY, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(170, 170, 170);
  doc.text(data.company.company_name, pageWidth / 2, footerY + 5, { align: 'center' });

  return doc;
}

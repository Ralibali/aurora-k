import { CompanySettings } from './types';
import * as XLSX from 'xlsx';

interface ExportInvoice {
  invoice_number: number;
  invoice_date: string;
  due_date: string;
  total_ex_vat: number;
  vat_amount: number;
  total_inc_vat: number;
  reference: string | null;
  status: string;
  customer?: {
    name: string;
    org_number?: string | null;
  };
}

// ─── SIE FILE (Swedish Standard) ──────────────────────────
export function generateSieFile(
  invoices: ExportInvoice[],
  settings: CompanySettings,
  year: number
): string {
  const lines: string[] = [];
  lines.push('#FLAGGA 0');
  lines.push('#FORMAT PC8');
  lines.push('#SIETYP 4');
  lines.push('#PROGRAM "Aurora Transport" 1.0');
  lines.push(`#GEN ${formatSieDate(new Date())}`);
  lines.push(`#FNAMN "${settings.company_name}"`);
  if (settings.org_number) lines.push(`#ORGNR ${settings.org_number}`);
  lines.push(`#RAR 0 ${year}0101 ${year}1231`);
  lines.push('');

  // Account plan
  lines.push('#KONTO 1510 "Kundfordringar"');
  lines.push('#KONTO 2610 "Utgående moms 25%"');
  lines.push('#KONTO 3010 "Transportintäkter"');
  lines.push('');

  // Verifications
  invoices.forEach((inv, idx) => {
    const verNr = idx + 1;
    const date = inv.invoice_date.replace(/-/g, '');
    const custName = inv.customer?.name || 'Okänd kund';
    lines.push(`#VER "F" ${verNr} ${date} "Faktura ${inv.invoice_number} - ${custName}"`);
    lines.push('{');
    lines.push(`\t#TRANS 1510 {} ${inv.total_inc_vat.toFixed(2)} "" "" 0`);
    lines.push(`\t#TRANS 3010 {} -${inv.total_ex_vat.toFixed(2)} "" "" 0`);
    lines.push(`\t#TRANS 2610 {} -${inv.vat_amount.toFixed(2)} "" "" 0`);
    lines.push('}');
    lines.push('');
  });

  return lines.join('\r\n');
}

function formatSieDate(d: Date): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

// ─── FORTNOX CSV ──────────────────────────────────────────
export function generateFortnoxCsv(invoices: ExportInvoice[]): string {
  const header = [
    'DocumentNumber', 'CustomerNumber', 'CustomerName', 'InvoiceDate',
    'DueDate', 'TotalAmount', 'TotalVAT', 'TotalAmountIncVAT',
    'YourReference', 'ExternalInvoiceReference'
  ].join(';');

  const rows = invoices.map(inv => [
    inv.invoice_number,
    inv.customer?.org_number || '',
    `"${inv.customer?.name || ''}"`,
    inv.invoice_date,
    inv.due_date,
    inv.total_ex_vat.toFixed(2),
    inv.vat_amount.toFixed(2),
    inv.total_inc_vat.toFixed(2),
    `"${inv.reference || ''}"`,
    inv.invoice_number,
  ].join(';'));

  return [header, ...rows].join('\r\n');
}

// ─── VISMA CSV ────────────────────────────────────────────
export function generateVismaCsv(invoices: ExportInvoice[], settings: CompanySettings): string {
  const header = [
    'Verifikationsnummer', 'Verifikationsdatum', 'Kontonummer',
    'Kontobeskrivning', 'Debet', 'Kredit', 'Text'
  ].join(';');

  const rows: string[] = [];
  invoices.forEach((inv, idx) => {
    const verNr = idx + 1;
    const custName = inv.customer?.name || '';
    const text = `Faktura ${inv.invoice_number} - ${custName}`;

    rows.push([verNr, inv.invoice_date, '1510', 'Kundfordringar', inv.total_inc_vat.toFixed(2), '0.00', `"${text}"`].join(';'));
    rows.push([verNr, inv.invoice_date, '3010', 'Transportintäkter', '0.00', inv.total_ex_vat.toFixed(2), `"${text}"`].join(';'));
    rows.push([verNr, inv.invoice_date, '2610', 'Utgående moms 25%', '0.00', inv.vat_amount.toFixed(2), `"${text}"`].join(';'));
  });

  return [header, ...rows].join('\r\n');
}

// ─── EXCEL MED KONTERINGAR ────────────────────────────────
export function generateAccountingExcel(invoices: ExportInvoice[], settings: CompanySettings): void {
  const wb = XLSX.utils.book_new();

  // Fakturor sheet
  const invoiceData = invoices.map(inv => ({
    'Fakturanr': inv.invoice_number,
    'Datum': inv.invoice_date,
    'Förfallodatum': inv.due_date,
    'Kund': inv.customer?.name || '',
    'Org.nr': inv.customer?.org_number || '',
    'Referens': inv.reference || '',
    'Belopp ex moms': inv.total_ex_vat,
    'Moms 25%': inv.vat_amount,
    'Belopp inkl moms': inv.total_inc_vat,
    'Status': inv.status,
  }));
  const ws1 = XLSX.utils.json_to_sheet(invoiceData);
  ws1['!cols'] = [
    { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 15 },
    { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Fakturor');

  // Konteringar sheet
  const rows: Record<string, string | number>[] = [];
  invoices.forEach((inv, idx) => {
    const text = `Faktura ${inv.invoice_number} - ${inv.customer?.name || ''}`;
    rows.push({ 'Ver.nr': idx + 1, 'Datum': inv.invoice_date, 'Konto': 1510, 'Kontobeskrivning': 'Kundfordringar', 'Debet': inv.total_inc_vat, 'Kredit': 0, 'Text': text });
    rows.push({ 'Ver.nr': idx + 1, 'Datum': inv.invoice_date, 'Konto': 3010, 'Kontobeskrivning': 'Transportintäkter', 'Debet': 0, 'Kredit': inv.total_ex_vat, 'Text': text });
    rows.push({ 'Ver.nr': idx + 1, 'Datum': inv.invoice_date, 'Konto': 2610, 'Kontobeskrivning': 'Utgående moms 25%', 'Debet': 0, 'Kredit': inv.vat_amount, 'Text': text });
  });
  const ws2 = XLSX.utils.json_to_sheet(rows);
  ws2['!cols'] = [
    { wch: 8 }, { wch: 12 }, { wch: 8 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Konteringar');

  // Företagsinfo
  const companyData = [
    { 'Fält': 'Företag', 'Värde': settings.company_name },
    { 'Fält': 'Org.nr', 'Värde': settings.org_number || '' },
    { 'Fält': 'Adress', 'Värde': settings.address || '' },
    { 'Fält': 'Ort', 'Värde': settings.zip_city || '' },
    { 'Fält': 'Momsreg.nr', 'Värde': settings.vat_number || '' },
    { 'Fält': 'Bankgiro', 'Värde': settings.bankgiro || '' },
  ];
  const ws3 = XLSX.utils.json_to_sheet(companyData);
  XLSX.utils.book_append_sheet(wb, ws3, 'Företagsinfo');

  XLSX.writeFile(wb, `Bokföring-${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ─── DOWNLOAD HELPER ─────────────────────────────────────
export function downloadTextFile(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

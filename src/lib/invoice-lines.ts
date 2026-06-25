export type PersistedInvoiceLine = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  amount: number;
  date?: string | null;
  driver?: string | null;
  assignmentId?: string | null;
  articleId?: string | null;
  source: 'assignment' | 'article' | 'manual';
};

export function normalizeInvoiceLines(value: unknown): PersistedInvoiceLine[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((line, index) => {
      const item = line as Record<string, unknown>;
      const quantity = Number(item.quantity ?? 0);
      const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
      const vatRate = Number(item.vatRate ?? item.vat_rate ?? 0);
      const description = String(item.description ?? item.name ?? '').trim();

      if (!description || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return null;

      return {
        id: String(item.id ?? `line-${index + 1}`),
        description,
        quantity,
        unit: String(item.unit ?? 'st'),
        unitPrice,
        vatRate: Number.isFinite(vatRate) ? vatRate : 0,
        amount: Number(item.amount ?? quantity * unitPrice),
        date: item.date ? String(item.date) : null,
        driver: item.driver ? String(item.driver) : null,
        assignmentId: item.assignmentId ? String(item.assignmentId) : null,
        articleId: item.articleId ? String(item.articleId) : null,
        source: item.source === 'article' || item.source === 'manual' ? item.source : 'assignment',
      } satisfies PersistedInvoiceLine;
    })
    .filter((line): line is PersistedInvoiceLine => Boolean(line));
}

export function invoiceLineTotals(lines: PersistedInvoiceLine[]) {
  const totalExVat = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const vatAmount = lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice * (line.vatRate / 100),
    0,
  );

  return {
    totalExVat,
    vatAmount,
    totalIncVat: totalExVat + vatAmount,
  };
}

export function toInvoicePdfLines(lines: PersistedInvoiceLine[]) {
  return lines.map((line) => ({
    date: line.date ?? null,
    description: `${line.description}${line.unit ? ` (${line.quantity} ${line.unit})` : ''}`,
    driver: line.driver ?? '',
    hours: line.quantity,
    unitPrice: line.unitPrice,
    amount: line.quantity * line.unitPrice,
  }));
}

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { invoiceLineTotals, type PersistedInvoiceLine } from '@/lib/invoice-lines';

const VAT_RATES = [0, 6, 12, 25];
let sequence = 0;
const nextId = () => `invoice-line-${Date.now()}-${++sequence}`;

type Article = {
  id: string;
  name: string;
  unit: string;
  default_price: number;
  vat_rate: number;
};

type Props = {
  lines: PersistedInvoiceLine[];
  onChange: (lines: PersistedInvoiceLine[]) => void;
  articles: Article[];
  articlePrices: Map<string, number>;
};

export function InvoiceLineEditor({ lines, onChange, articles, articlePrices }: Props) {
  const totals = invoiceLineTotals(lines);

  const updateLine = (id: string, patch: Partial<PersistedInvoiceLine>) => {
    onChange(lines.map(line => {
      if (line.id !== id) return line;
      const next = { ...line, ...patch };
      return { ...next, amount: next.quantity * next.unitPrice };
    }));
  };

  const addArticle = (articleId: string) => {
    const article = articles.find(item => item.id === articleId);
    if (!article) return;
    const unitPrice = articlePrices.get(article.id) ?? Number(article.default_price);
    onChange([...lines, {
      id: nextId(),
      description: article.name,
      quantity: 1,
      unit: article.unit,
      unitPrice,
      vatRate: Number(article.vat_rate),
      amount: unitPrice,
      articleId: article.id,
      source: 'article',
    }]);
  };

  const addManual = () => onChange([...lines, {
    id: nextId(),
    description: '',
    quantity: 1,
    unit: 'st',
    unitPrice: 0,
    vatRate: 25,
    amount: 0,
    source: 'manual',
  }]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Fakturarader</p>
        <div className="flex gap-2">
          <Select onValueChange={addArticle}>
            <SelectTrigger className="w-[210px]"><SelectValue placeholder="Lägg till artikel" /></SelectTrigger>
            <SelectContent>{articles.map(article => <SelectItem key={article.id} value={article.id}>{article.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={addManual}><Plus className="mr-1 h-4 w-4" /> Fri rad</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>Beskrivning</TableHead><TableHead className="w-24">Antal</TableHead><TableHead className="w-20">Enhet</TableHead><TableHead className="w-28">À-pris</TableHead><TableHead className="w-24">Moms</TableHead><TableHead className="w-28 text-right">Summa</TableHead><TableHead className="w-12" /></TableRow></TableHeader>
          <TableBody>
            {lines.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Inga fakturarader ännu.</TableCell></TableRow>}
            {lines.map(line => (
              <TableRow key={line.id}>
                <TableCell><Input value={line.description} onChange={event => updateLine(line.id, { description: event.target.value })} /></TableCell>
                <TableCell><Input type="number" min="0.01" step="0.01" value={line.quantity} onChange={event => updateLine(line.id, { quantity: Number(event.target.value) })} /></TableCell>
                <TableCell><Input value={line.unit} onChange={event => updateLine(line.id, { unit: event.target.value })} /></TableCell>
                <TableCell><Input type="number" min="0" step="0.01" value={line.unitPrice} onChange={event => updateLine(line.id, { unitPrice: Number(event.target.value) })} /></TableCell>
                <TableCell>
                  <Select value={String(line.vatRate)} onValueChange={value => updateLine(line.id, { vatRate: Number(value) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{VAT_RATES.map(rate => <SelectItem key={rate} value={String(rate)}>{rate}%</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right font-mono">{line.amount.toLocaleString('sv-SE')} kr</TableCell>
                <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => onChange(lines.filter(item => item.id !== line.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="ml-auto max-w-sm space-y-1 text-right text-sm">
        <p>Netto: <span className="font-mono">{totals.totalExVat.toLocaleString('sv-SE')} kr</span></p>
        <p>Moms: <span className="font-mono">{totals.vatAmount.toLocaleString('sv-SE')} kr</span></p>
        <p className="text-lg font-bold">Totalt: <span className="font-mono">{totals.totalIncVat.toLocaleString('sv-SE')} kr</span></p>
      </div>
    </div>
  );
}

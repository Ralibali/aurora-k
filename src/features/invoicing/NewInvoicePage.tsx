import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, FileText, Zap } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCustomers, useAssignments, useNextInvoiceNumber, useSettings } from '@/hooks/useData';
import { useArticles, useCustomerPriceList } from '@/hooks/useNewFeatures';
import { useCreateReliableInvoice } from '@/hooks/useInvoiceTransactions';
import { InvoiceLineEditor } from '@/features/invoicing/InvoiceLineEditor';
import { invoiceLineTotals, type PersistedInvoiceLine } from '@/lib/invoice-lines';
import { calculateDecimalHours, formatSwedishDate } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';

let sequence = 0;
const nextLineId = () => `invoice-line-${Date.now()}-${++sequence}`;

type NavigationState = {
  customerId?: string;
  assignmentIds?: string[];
};

export default function NewInvoicePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initial = (location.state as NavigationState | null) ?? {};
  const initialAssignments = Array.isArray(initial.assignmentIds) ? initial.assignmentIds : [];

  const [step, setStep] = useState(initial.customerId && initialAssignments.length ? 2 : 1);
  const [customerId, setCustomerId] = useState(initial.customerId ?? '');
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>(initialAssignments);
  const [lines, setLines] = useState<PersistedInvoiceLine[]>([]);
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState(initialAssignments.length ? 'Faktura skapad från slutfört uppdrag.' : '');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDateOverride, setDueDateOverride] = useState('');
  const [invoiceNumberOverride, setInvoiceNumberOverride] = useState<number | null>(null);
  const [didBuildInitialLines, setDidBuildInitialLines] = useState(false);

  const { data: customers } = useCustomers();
  const { data: assignments } = useAssignments();
  const { data: nextInvoiceNumber } = useNextInvoiceNumber();
  const { data: settings } = useSettings();
  const { data: articles } = useArticles();
  const { data: customerPrices } = useCustomerPriceList(customerId || undefined);
  const createInvoice = useCreateReliableInvoice();

  const customer = (customers ?? []).find(item => item.id === customerId);
  const uninvoicedAssignments = (assignments ?? []).filter(item =>
    item.customer_id === customerId && item.status === 'completed' && !item.invoiced,
  );

  const articlePrices = useMemo(() => {
    const prices = new Map<string, number>();
    (articles ?? []).forEach(article => prices.set(article.id, Number(article.default_price)));
    (customerPrices ?? []).forEach(price => prices.set(price.article_id, Number(price.price)));
    return prices;
  }, [articles, customerPrices]);

  const buildLines = useCallback(async () => {
    const built: PersistedInvoiceLine[] = [];

    for (const assignmentId of selectedAssignments) {
      const assignment = (assignments ?? []).find(item => item.id === assignmentId);
      if (!assignment) continue;

      const { data: assignmentArticles, error } = await supabase
        .from('assignment_articles')
        .select('*')
        .eq('assignment_id', assignmentId);
      if (error) throw error;

      if (assignmentArticles?.length) {
        assignmentArticles.forEach(article => {
          const quantity = Number(article.quantity);
          const unitPrice = articlePrices.get(article.article_id ?? '') ?? Number(article.unit_price);
          built.push({
            id: nextLineId(),
            description: article.name,
            quantity,
            unit: article.unit,
            unitPrice,
            vatRate: Number(article.vat_rate),
            amount: quantity * unitPrice,
            date: assignment.actual_start,
            driver: assignment.driver?.full_name ?? '',
            assignmentId,
            articleId: article.article_id,
            source: 'article',
          });
        });
        continue;
      }

      const hours = assignment.actual_start && assignment.actual_stop
        ? calculateDecimalHours(assignment.actual_start, assignment.actual_stop)
        : 0;
      const record = assignment as typeof assignment & { pickup_address?: string; delivery_address?: string };
      const route = record.pickup_address && record.delivery_address
        ? ` (${record.pickup_address} → ${record.delivery_address})`
        : '';

      let quantity = 1;
      let unit = 'st';
      let unitPrice = Number(assignment.cost ?? 0);
      let suffix = '';

      if (!unitPrice && customer?.pricing_type === 'per_delivery') {
        unitPrice = Number(customer.price_per_delivery ?? 0);
        suffix = ' — leverans';
      } else if (!unitPrice && customer?.pricing_type === 'per_hour') {
        quantity = hours || 1;
        unit = 'h';
        unitPrice = Number(customer.price_per_hour ?? 0);
      }

      built.push({
        id: nextLineId(),
        description: `${assignment.title}${route}${suffix}`,
        quantity,
        unit,
        unitPrice,
        vatRate: 25,
        amount: quantity * unitPrice,
        date: assignment.actual_start,
        driver: assignment.driver?.full_name ?? '',
        assignmentId,
        source: 'assignment',
      });
    }

    setLines(built);
  }, [articlePrices, assignments, customer, selectedAssignments]);

  useEffect(() => {
    if (!didBuildInitialLines && customerId && selectedAssignments.length && (assignments?.length ?? 0) > 0) {
      setDidBuildInitialLines(true);
      void buildLines().catch(error => toast.error(error instanceof Error ? error.message : 'Kunde inte skapa fakturarader'));
    }
  }, [assignments?.length, buildLines, customerId, didBuildInitialLines, selectedAssignments.length]);

  const totals = invoiceLineTotals(lines);
  const invoiceNumber = invoiceNumberOverride ?? nextInvoiceNumber ?? 1001;
  const defaultDueDate = customer
    ? new Date(new Date(invoiceDate).getTime() + Number(customer.payment_terms_days ?? 30) * 86400000).toISOString().slice(0, 10)
    : invoiceDate;
  const dueDate = dueDateOverride || defaultDueDate;
  const invoiceMode = settings?.invoice_mode || 'invoice';
  const isBasis = invoiceMode === 'basis';

  const toggleAssignment = (id: string) => {
    setSelectedAssignments(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    setDidBuildInitialLines(false);
  };

  const submit = (status: 'draft' | 'sent') => {
    if (!customerId) return toast.error('Välj kund.');
    if (!lines.length) return toast.error('Fakturan måste innehålla minst en rad.');
    if (lines.some(line => !line.description.trim() || line.quantity <= 0 || line.unitPrice < 0)) {
      return toast.error('Kontrollera beskrivning, antal och pris på samtliga rader.');
    }

    createInvoice.mutate({
      invoice_number: invoiceNumber,
      customer_id: customerId,
      assignment_ids: selectedAssignments,
      status,
      invoice_date: invoiceDate,
      due_date: dueDate,
      total_ex_vat: totals.totalExVat,
      vat_amount: totals.vatAmount,
      total_inc_vat: totals.totalIncVat,
      reference: reference || null,
      message: message || null,
      lines,
    }, { onSuccess: () => navigate('/admin/invoices') });
  };

  return (
    <AdminLayout title={isBasis ? 'Skapa fakturaunderlag' : 'Skapa faktura'}>
      <div className="max-w-5xl space-y-4">
        {initialAssignments.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
            <div className="flex gap-3"><Zap className="mt-0.5 h-5 w-5" /><div><p className="font-semibold">Snabbfakturering från uppdrag</p><p className="text-sm text-emerald-800">Kontrollera de frysta fakturaraderna innan du sparar.</p></div></div>
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {step > 1 ? 'Föregående steg' : 'Tillbaka'}
        </Button>
        <div className="flex gap-2">{[1, 2, 3].map(item => <div key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? 'bg-primary' : 'bg-muted'}`} />)}</div>

        {step === 1 && (
          <Card><CardHeader><CardTitle>1. Kund och uppdrag</CardTitle></CardHeader><CardContent className="space-y-5">
            <Select value={customerId} onValueChange={value => { setCustomerId(value); setSelectedAssignments([]); setLines([]); setDidBuildInitialLines(false); }}>
              <SelectTrigger><SelectValue placeholder="Välj kund" /></SelectTrigger>
              <SelectContent>{(customers ?? []).map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>

            {customerId && (
              uninvoicedAssignments.length === 0 ? <p className="py-4 text-muted-foreground">Inga slutförda och ofakturerade uppdrag.</p> : (
                <Table><TableHeader><TableRow><TableHead className="w-10" /><TableHead>Datum</TableHead><TableHead>Uppdrag</TableHead><TableHead>Chaufför</TableHead><TableHead>Tid</TableHead></TableRow></TableHeader>
                  <TableBody>{uninvoicedAssignments.map(item => {
                    const hours = item.actual_start && item.actual_stop ? calculateDecimalHours(item.actual_start, item.actual_stop) : 0;
                    return <TableRow key={item.id}><TableCell><Checkbox checked={selectedAssignments.includes(item.id)} onCheckedChange={() => toggleAssignment(item.id)} /></TableCell><TableCell>{item.actual_start ? formatSwedishDate(item.actual_start) : '–'}</TableCell><TableCell className="font-medium">{item.title}</TableCell><TableCell>{item.driver?.full_name}</TableCell><TableCell>{hours.toFixed(1)} h</TableCell></TableRow>;
                  })}</TableBody>
                </Table>
              )
            )}
            <Button disabled={!customerId || !selectedAssignments.length} onClick={async () => { await buildLines(); setStep(2); }}>Skapa fakturarader</Button>
          </CardContent></Card>
        )}

        {step === 2 && (
          <Card><CardHeader><CardTitle>2. Fakturarader och villkor</CardTitle></CardHeader><CardContent className="space-y-6">
            <InvoiceLineEditor lines={lines} onChange={setLines} articles={articles ?? []} articlePrices={articlePrices} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Fakturanummer</Label><Input type="number" value={invoiceNumber} onChange={event => setInvoiceNumberOverride(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Fakturadatum</Label><Input type="date" value={invoiceDate} onChange={event => setInvoiceDate(event.target.value)} /></div>
              <div className="space-y-2"><Label>Förfallodatum</Label><Input type="date" value={dueDate} onChange={event => setDueDateOverride(event.target.value)} /></div>
              <div className="space-y-2"><Label>Er referens</Label><Input value={reference} onChange={event => setReference(event.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Meddelande</Label><Textarea value={message} onChange={event => setMessage(event.target.value)} /></div>
            <Button disabled={!lines.length} onClick={() => setStep(3)}>Förhandsgranska</Button>
          </CardContent></Card>
        )}

        {step === 3 && (
          <Card><CardHeader><CardTitle>3. Förhandsgranska</CardTitle></CardHeader><CardContent className="space-y-5">
            <div className="rounded-lg border p-6">
              <div className="flex justify-between gap-6"><div><p className="text-lg font-bold">{settings?.company_name}</p><p className="text-sm text-muted-foreground">{settings?.address} {settings?.zip_city}</p></div><div className="text-right"><p className="text-2xl font-bold text-primary">{isBasis ? 'FAKTURAUNDERLAG' : 'FAKTURA'}</p><p>Nr {invoiceNumber}</p><p>{invoiceDate} · förfaller {dueDate}</p></div></div>
              <div className="my-6"><p className="font-semibold">{customer?.name}</p><p className="text-sm text-muted-foreground">{customer?.invoice_address}</p></div>
              <Table><TableHeader><TableRow><TableHead>Beskrivning</TableHead><TableHead className="text-right">Antal</TableHead><TableHead className="text-right">À-pris</TableHead><TableHead className="text-right">Moms</TableHead><TableHead className="text-right">Belopp</TableHead></TableRow></TableHeader><TableBody>{lines.map(line => <TableRow key={line.id}><TableCell>{line.description}</TableCell><TableCell className="text-right">{line.quantity} {line.unit}</TableCell><TableCell className="text-right">{line.unitPrice.toLocaleString('sv-SE')} kr</TableCell><TableCell className="text-right">{line.vatRate}%</TableCell><TableCell className="text-right font-mono">{line.amount.toLocaleString('sv-SE')} kr</TableCell></TableRow>)}</TableBody></Table>
              <div className="mt-4 border-t pt-4 text-right"><p>Netto: {totals.totalExVat.toLocaleString('sv-SE')} kr</p><p>Moms: {totals.vatAmount.toLocaleString('sv-SE')} kr</p><p className="text-lg font-bold">Att betala: {totals.totalIncVat.toLocaleString('sv-SE')} kr</p></div>
            </div>
            <div className="flex flex-wrap gap-2"><Button onClick={() => submit('draft')} disabled={createInvoice.isPending}><FileText className="mr-1 h-4 w-4" /> Spara utkast</Button>{!isBasis && <Button variant="outline" onClick={() => submit('sent')} disabled={createInvoice.isPending}>Markera som skickad</Button>}</div>
          </CardContent></Card>
        )}
      </div>
    </AdminLayout>
  );
}

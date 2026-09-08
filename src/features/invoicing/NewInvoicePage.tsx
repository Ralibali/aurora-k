import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { assignmentInvoiceLines, invoiceLinesError, invoiceSelection, missingInvoiceSources, type InvoiceSelection } from './invoice-preparation';
import { getStockholmDateKey } from '@/features/dispatch/dispatch-utils';

export default function NewInvoicePage() {
  const location = useLocation();
  return <InvoiceForm key={location.key} initial={invoiceSelection(location.search, location.state)} />;
}

function InvoiceForm({ initial }: { initial: InvoiceSelection }) {
  const navigate = useNavigate();
  const initialAssignments = initial.assignmentIds;
  const [step, setStep] = useState(initial.customerId && initialAssignments.length ? 2 : 1);
  const [customerId, setCustomerId] = useState(initial.customerId);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>(initialAssignments);
  const [lines, setLines] = useState<PersistedInvoiceLine[]>([]);
  const [sourceLines, setSourceLines] = useState<PersistedInvoiceLine[]>([]);
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState(initialAssignments.length ? 'Faktura skapad från slutfört uppdrag.' : '');
  const [invoiceDate, setInvoiceDate] = useState(getStockholmDateKey());
  const [dueDateOverride, setDueDateOverride] = useState('');
  const [invoiceNumberOverride, setInvoiceNumberOverride] = useState<number | null>(null);
  const [autoBuildPending, setAutoBuildPending] = useState(Boolean(initial.customerId && initialAssignments.length));
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [preparedSelection, setPreparedSelection] = useState('');
  const [zeroPricesApproved, setZeroPricesApproved] = useState(false);
  const buildRequest = useRef(0);
  useEffect(() => () => { buildRequest.current += 1; }, []);

  const customersQuery = useCustomers();
  const assignmentsQuery = useAssignments();
  const numberQuery = useNextInvoiceNumber();
  const settingsQuery = useSettings();
  const articlesQuery = useArticles();
  const pricesQuery = useCustomerPriceList(customerId || undefined);
  const { data: customers } = customersQuery;
  const { data: assignments } = assignmentsQuery;
  const { data: nextInvoiceNumber } = numberQuery;
  const { data: settings } = settingsQuery;
  const { data: articles } = articlesQuery;
  const { data: customerPrices } = pricesQuery;
  const createInvoice = useCreateReliableInvoice();
  const requiredQueries = [customersQuery, assignmentsQuery, numberQuery, settingsQuery, articlesQuery, ...(customerId ? [pricesQuery] : [])];
  const dataReady = requiredQueries.every(query => query.isSuccess);
  const dataError = requiredQueries.some(query => query.isError);
  const retryData = () => { void Promise.allSettled(requiredQueries.filter(query => !query.isSuccess || query.isError).map(query => query.refetch())); };

  const customer = (customers ?? []).find(item => item.id === customerId);
  const uninvoicedAssignments = (assignments ?? []).filter(item =>
    item.customer_id === customerId && item.status === 'completed' && !item.invoiced,
  );
  const invalidSelection = dataReady && customerId && (!customer || selectedAssignments.some(id => !uninvoicedAssignments.some(item => item.id === id)));
  const selectionKey = JSON.stringify([customerId, [...selectedAssignments].sort()]);
  const isPrepared = preparedSelection === selectionKey;
  const missingSources = missingInvoiceSources(lines, sourceLines);
  const hasZeroPrices = lines.some(line => line.unitPrice === 0);

  const articlePrices = useMemo(() => {
    const prices = new Map<string, number>();
    (articles ?? []).forEach(article => prices.set(article.id, Number(article.default_price)));
    (customerPrices ?? []).forEach(price => prices.set(price.article_id, Number(price.price)));
    return prices;
  }, [articles, customerPrices]);

  const buildLines = useCallback(async () => {
    if (!dataReady || !customer || !selectedAssignments.length || invalidSelection) return;
    if (isPrepared) { setStep(2); return; }
    const request = ++buildRequest.current;
    setIsBuilding(true);
    setBuildError(null);
    try {
      const sources: PersistedInvoiceLine[] = [];
      const added: PersistedInvoiceLine[] = [];
      for (const assignmentId of selectedAssignments) {
        const existing = sourceLines.filter(line => line.assignmentId === assignmentId);
        if (existing.length) { sources.push(...existing); continue; }
        const assignment = (assignments ?? []).find(item => item.id === assignmentId);
        if (!assignment || assignment.customer_id !== customer.id || assignment.status !== 'completed' || assignment.invoiced) {
          throw new Error('Ett valt uppdrag kan inte faktureras. Kontrollera urvalet i steg 1.');
        }
        const { data: assignmentArticles, error } = await supabase.from('assignment_articles').select('*').eq('assignment_id', assignmentId);
        if (error) throw error;
        if (request !== buildRequest.current) return;
        const built = assignmentInvoiceLines(assignment, customer, assignmentArticles ?? [], articlePrices);
        sources.push(...built);
        added.push(...built);
      }
      if (request !== buildRequest.current) return;
      // Freeze new source rows once. Returning to selection keeps edits and free
      // rows; removing an assignment removes only that assignment's source rows.
      setLines([...lines.filter(line => !line.assignmentId || selectedAssignments.includes(line.assignmentId)), ...added]);
      setSourceLines(sources);
      setPreparedSelection(selectionKey);
      setZeroPricesApproved(false);
      setStep(2);
    } catch (error) {
      if (request === buildRequest.current) setBuildError(error instanceof Error ? error.message : 'Kunde inte hämta uppdragens artiklar. Försök igen.');
    } finally {
      if (request === buildRequest.current) setIsBuilding(false);
    }
  }, [dataReady, customer, selectedAssignments, invalidSelection, isPrepared, sourceLines, assignments, articlePrices, lines, selectionKey]);

  useEffect(() => {
    if (!autoBuildPending || !dataReady || invalidSelection) return;
    let cancelled = false;
    // Deferring the initial request also makes StrictMode's effect replay safe.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setAutoBuildPending(false);
      void buildLines();
    });
    return () => { cancelled = true; };
  }, [autoBuildPending, dataReady, invalidSelection, buildLines]);

  const cancelBuild = () => {
    buildRequest.current += 1;
    setIsBuilding(false);
    setBuildError(null);
    setAutoBuildPending(false);
  };
  const changeCustomer = (value: string) => {
    cancelBuild();
    setCustomerId(value);
    setSelectedAssignments([]);
    setLines([]);
    setSourceLines([]);
    setPreparedSelection('');
    setZeroPricesApproved(false);
  };
  const toggleAssignment = (id: string) => {
    cancelBuild();
    setSelectedAssignments(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
    setZeroPricesApproved(false);
  };
  const updateLines = (next: PersistedInvoiceLine[]) => { setLines(next); setZeroPricesApproved(false); };
  const totals = invoiceLineTotals(lines);
  const invoiceNumber = invoiceNumberOverride ?? nextInvoiceNumber ?? '';
  const invoiceDateMs = Date.parse(invoiceDate);
  const dueDateMs = invoiceDateMs + Number(customer?.payment_terms_days ?? 30) * 86400000;
  const defaultDueDate = Number.isFinite(dueDateMs) && Number.isFinite(new Date(dueDateMs).getTime())
    ? new Date(dueDateMs).toISOString().slice(0, 10) : '';
  const dueDate = dueDateOverride || defaultDueDate;
  const isBasis = settings?.invoice_mode === 'basis';
  const canReview = dataReady && isPrepared && !isBuilding && !invalidSelection;

  const validateLines = (status: 'draft' | 'sent' = 'draft') => {
    if (!canReview || !customer) return 'Kontrollera kunden och uppdragsvalet i steg 1.';
    return invoiceLinesError(lines, sourceLines, selectedAssignments, zeroPricesApproved, status);
  };
  const preview = () => {
    const error = validateLines();
    if (error) return toast.error(error);
    setStep(3);
  };
  const submit = (status: 'draft' | 'sent') => {
    const error = validateLines(status);
    if (error) return toast.error(error);
    if (!Number.isInteger(invoiceNumber) || Number(invoiceNumber) <= 0) return toast.error('Ange ett giltigt fakturanummer.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate) || !Number.isFinite(invoiceDateMs) || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(Date.parse(dueDate)) || dueDate < invoiceDate) {
      return toast.error('Ange giltiga datum. Förfallodatum får inte vara före fakturadatum.');
    }
    createInvoice.mutate({
      invoice_number: Number(invoiceNumber), customer_id: customerId, assignment_ids: selectedAssignments, status,
      invoice_date: invoiceDate, due_date: dueDate, total_ex_vat: totals.totalExVat,
      vat_amount: totals.vatAmount, total_inc_vat: totals.totalIncVat,
      reference: reference || null, message: message || null,
      lines: lines.map(line => ({ ...line, amount: line.quantity * line.unitPrice })),
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

        <Button variant="ghost" size="sm" onClick={() => { cancelBuild(); if (step > 1) setStep(step - 1); else navigate(-1); }}>
          <ArrowLeft className="mr-1 h-4 w-4" /> {step > 1 ? 'Föregående steg' : 'Tillbaka'}
        </Button>
        <div className="flex gap-2">{[1, 2, 3].map(item => <div key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? 'bg-primary' : 'bg-muted'}`} />)}</div>

        {dataError ? (
          <div role="alert" className="rounded-lg border border-destructive/30 p-4"><p>Kunde inte läsa kund-, artikel- eller fakturauppgifter.</p><Button variant="outline" className="mt-2" onClick={retryData}>Försök läsa uppgifterna igen</Button></div>
        ) : !dataReady && <p role="status">Hämtar kund, artiklar och aktuella priser…</p>}
        {invalidSelection && <div role="alert" className="rounded-lg border border-destructive/30 p-4"><p>Kunden eller ett valt uppdrag är inte tillgängligt för fakturering. Uppdraget kan redan vara fakturerat eller tillhöra en annan kund.</p><Button variant="outline" className="mt-2" onClick={() => { cancelBuild(); setSelectedAssignments([]); setPreparedSelection(''); setStep(1); }}>Välj uppdrag på nytt</Button></div>}
        {isBuilding && <p role="status">Hämtar uppdragens artiklar och skapar fakturarader…</p>}
        {buildError && <div role="alert" className="rounded-lg border border-destructive/30 p-4"><p>{buildError}</p><Button variant="outline" className="mt-2" onClick={() => void buildLines()} disabled={!dataReady || isBuilding || Boolean(invalidSelection)}>Försök skapa rader igen</Button></div>}

        {step === 1 && (
          <Card><CardHeader><CardTitle>1. Kund och uppdrag</CardTitle></CardHeader><CardContent className="space-y-5">
            <Select value={customerId} onValueChange={changeCustomer}>
              <SelectTrigger aria-label="Kund" disabled={!customersQuery.isSuccess}><SelectValue placeholder="Välj kund" /></SelectTrigger>
              <SelectContent>{(customers ?? []).map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>

            {customerId && assignmentsQuery.isSuccess && (
              uninvoicedAssignments.length === 0 ? <p className="py-4 text-muted-foreground">Inga slutförda och ofakturerade uppdrag.</p> : (
                <Table><TableHeader><TableRow><TableHead className="w-10" /><TableHead>Datum</TableHead><TableHead>Uppdrag</TableHead><TableHead>Chaufför</TableHead><TableHead>Tid</TableHead></TableRow></TableHeader>
                  <TableBody>{uninvoicedAssignments.map(item => {
                    const hours = item.actual_start && item.actual_stop ? calculateDecimalHours(item.actual_start, item.actual_stop) : 0;
                    return <TableRow key={item.id}><TableCell><Checkbox aria-label={`Välj ${item.title}`} checked={selectedAssignments.includes(item.id)} onCheckedChange={() => toggleAssignment(item.id)} /></TableCell><TableCell>{item.actual_start ? formatSwedishDate(item.actual_start) : '–'}</TableCell><TableCell className="font-medium">{item.title}</TableCell><TableCell>{item.driver?.full_name}</TableCell><TableCell>{hours.toFixed(1)} h</TableCell></TableRow>;
                  })}</TableBody>
                </Table>
              )
            )}
            <Button disabled={!dataReady || !customer || !selectedAssignments.length || isBuilding || Boolean(invalidSelection)} onClick={() => void buildLines()}>{isPrepared ? 'Fortsätt till fakturarader' : 'Skapa fakturarader'}</Button>
          </CardContent></Card>
        )}

        {step === 2 && canReview && (
          <Card><CardHeader><CardTitle>2. Fakturarader och villkor</CardTitle></CardHeader><CardContent className="space-y-6">
            <InvoiceLineEditor lines={lines} onChange={updateLines} articles={articles ?? []} articlePrices={articlePrices} />
            {missingSources.length > 0 && <div role="alert" className="rounded-lg border border-destructive/30 p-4"><p>{missingSources.length} uppdragsrad saknas. Alla artikelrader måste följa med när uppdraget faktureras. Ta bort hela uppdraget i steg 1 om det ska faktureras senare.</p><Button variant="outline" className="mt-2" onClick={() => updateLines([...lines, ...missingSources])}>Återställ borttagna uppdragsrader</Button></div>}
            {hasZeroPrices && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-950"><p className="mb-3 text-sm">En eller flera rader har 0 kr. Ett pris kan saknas. Fyll i rätt pris eller godkänn uttryckligen att dessa rader är kostnadsfria. En skickad faktura måste totalt överstiga 0 kr.</p><label className="flex items-center gap-2 text-sm"><Checkbox checked={zeroPricesApproved} onCheckedChange={checked => setZeroPricesApproved(checked === true)} />Jag har kontrollerat och godkänner samtliga rader med 0 kr</label></div>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Fakturanummer</Label><Input type="number" value={invoiceNumber} onChange={event => setInvoiceNumberOverride(Number(event.target.value))} /></div>
              <div className="space-y-2"><Label>Fakturadatum</Label><Input type="date" value={invoiceDate} onChange={event => setInvoiceDate(event.target.value)} /></div>
              <div className="space-y-2"><Label>Förfallodatum</Label><Input type="date" value={dueDate} onChange={event => setDueDateOverride(event.target.value)} /></div>
              <div className="space-y-2"><Label>Er referens</Label><Input value={reference} onChange={event => setReference(event.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Meddelande</Label><Textarea value={message} onChange={event => setMessage(event.target.value)} /></div>
            <Button disabled={!lines.length || missingSources.length > 0 || (hasZeroPrices && !zeroPricesApproved)} onClick={preview}>Förhandsgranska</Button>
          </CardContent></Card>
        )}

        {step === 3 && canReview && (
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

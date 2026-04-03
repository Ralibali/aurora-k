import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCustomers, useAssignments, useNextInvoiceNumber, useCreateInvoice, useSettings } from '@/hooks/useData';
import { useArticles, useCustomerPriceList } from '@/hooks/useNewFeatures';
import { formatSwedishDate, calculateDecimalHours } from '@/lib/format';
import { ArrowLeft, FileText, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const VAT_OPTIONS = [
  { value: '0', label: '0% (momsfritt)' },
  { value: '6', label: '6%' },
  { value: '12', label: '12%' },
  { value: '25', label: '25%' },
];

interface InvoiceLine {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  article_id?: string;
  source: 'assignment' | 'article' | 'manual';
  assignment_id?: string;
}

let lineCounter = 0;
function newLineId() { return `line-${++lineCounter}`; }

export default function AdminNewInvoice() {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState<string>('');
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [vatRate, setVatRate] = useState('0');
  const [lines, setLines] = useState<InvoiceLine[]>([]);

  const { data: customers } = useCustomers();
  const { data: allAssignments } = useAssignments();
  const { data: nextNumber } = useNextInvoiceNumber();
  const { data: settings } = useSettings();
  const { data: articles } = useArticles();
  const { data: customerPrices } = useCustomerPriceList(customerId || undefined);
  const createInvoice = useCreateInvoice();
  const [invoiceNumber, setInvoiceNumber] = useState<number | null>(null);

  const customer = (customers ?? []).find(c => c.id === customerId);
  const uninvoiced = (allAssignments ?? []).filter(a =>
    a.customer_id === customerId && a.status === 'completed' && !a.invoiced
  );

  // Build a price lookup: article_id -> customer price or default
  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    (articles ?? []).forEach(a => map.set(a.id, a.default_price));
    (customerPrices ?? []).forEach((cp: any) => {
      if (cp.article_id) map.set(cp.article_id, cp.price);
    });
    return map;
  }, [articles, customerPrices]);

  const toggleAssignment = (id: string) => {
    setSelectedAssignments(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // When moving to step 3, auto-build lines from assignments + their articles
  const buildLines = async () => {
    const newLines: InvoiceLine[] = [];

    for (const aId of selectedAssignments) {
      const a = uninvoiced.find(x => x.id === aId);
      if (!a) continue;

      // Fetch assignment_articles for this assignment
      const { data: assignmentArticles } = await supabase
        .from('assignment_articles')
        .select('*, article:articles(*)')
        .eq('assignment_id', aId);

      if (assignmentArticles && assignmentArticles.length > 0) {
        // Use the articles attached to the assignment
        for (const aa of assignmentArticles) {
          const customerPrice = priceMap.get(aa.article_id ?? '');
          newLines.push({
            id: newLineId(),
            name: aa.name,
            quantity: Number(aa.quantity),
            unit: aa.unit,
            unit_price: customerPrice ?? Number(aa.unit_price),
            vat_rate: Number(aa.vat_rate),
            article_id: aa.article_id ?? undefined,
            source: 'article',
            assignment_id: aId,
          });
        }
      } else {
        // Fallback: use customer pricing model
        const hours = a.actual_start && a.actual_stop ? calculateDecimalHours(a.actual_start, a.actual_stop) : 0;
        if (customer?.pricing_type === 'per_delivery') {
          newLines.push({
            id: newLineId(),
            name: `${a.title} — leverans`,
            quantity: 1,
            unit: 'st',
            unit_price: customer.price_per_delivery || 0,
            vat_rate: 0,
            source: 'assignment',
            assignment_id: aId,
          });
        } else if (customer?.pricing_type === 'per_hour') {
          newLines.push({
            id: newLineId(),
            name: `${a.title} — ${a.driver?.full_name ?? ''}`,
            quantity: hours,
            unit: 'h',
            unit_price: customer.price_per_hour || 0,
            vat_rate: 0,
            source: 'assignment',
            assignment_id: aId,
          });
        } else {
          newLines.push({
            id: newLineId(),
            name: a.title,
            quantity: 1,
            unit: 'st',
            unit_price: 0,
            vat_rate: 0,
            source: 'assignment',
            assignment_id: aId,
          });
        }
      }
    }

    setLines(newLines);
  };

  const addArticleLine = (articleId: string) => {
    const article = (articles ?? []).find(a => a.id === articleId);
    if (!article) return;
    const price = priceMap.get(articleId) ?? article.default_price;
    setLines(prev => [...prev, {
      id: newLineId(),
      name: article.name,
      quantity: 1,
      unit: article.unit,
      unit_price: price,
      vat_rate: article.vat_rate,
      article_id: article.id,
      source: 'article',
    }]);
  };

  const addManualLine = () => {
    setLines(prev => [...prev, {
      id: newLineId(),
      name: '',
      quantity: 1,
      unit: 'st',
      unit_price: 0,
      vat_rate: 0,
      source: 'manual',
    }]);
  };

  const updateLine = (id: string, field: keyof InvoiceLine, value: any) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeLine = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const vatDecimal = parseFloat(vatRate) / 100;
  const totalExVat = lines.reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
  // Per-line VAT or global
  const totalLineVat = lines.reduce((sum, l) => sum + l.quantity * l.unit_price * (l.vat_rate / 100), 0);
  const useLineVat = totalLineVat > 0;
  const vatAmount = useLineVat ? totalLineVat : totalExVat * vatDecimal;
  const totalIncVat = totalExVat + vatAmount;

  const today = new Date().toISOString().split('T')[0];
  const dueDate = customer
    ? new Date(Date.now() + customer.payment_terms_days * 86400000).toISOString().split('T')[0]
    : today;
  const [dueDateState, setDueDateState] = useState('');
  const finalDueDate = dueDateState || dueDate;
  const finalInvoiceNumber = invoiceNumber ?? nextNumber ?? 1001;

  const handleCreate = (status: string = 'draft') => {
    createInvoice.mutate({
      invoice_number: finalInvoiceNumber,
      customer_id: customerId,
      assignment_ids: selectedAssignments,
      status,
      invoice_date: invoiceDate,
      due_date: finalDueDate,
      total_ex_vat: totalExVat,
      vat_amount: vatAmount,
      total_inc_vat: totalIncVat,
      reference: reference || null,
      message: message || null,
    }, {
      onSuccess: () => navigate('/admin/invoices'),
    });
  };

  return (
    <AdminLayout title="Skapa faktura">
      <div className="max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> {step > 1 ? 'Föregående steg' : 'Tillbaka'}
        </Button>

        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardHeader><CardTitle>Steg 1: Välj kund</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setSelectedAssignments([]); setLines([]); }}>
                <SelectTrigger><SelectValue placeholder="Välj kund" /></SelectTrigger>
                <SelectContent>
                  {(customers ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {customer && (
                <div className="text-sm text-muted-foreground">
                  <p>Prissättning: {customer.pricing_type === 'per_delivery' ? `${customer.price_per_delivery} kr/leverans` : customer.pricing_type === 'per_hour' ? `${customer.price_per_hour} kr/h` : 'Manuellt'}</p>
                  <p>Betalningsvillkor: {customer.payment_terms_days} dagar</p>
                  <p className="mt-2 font-medium text-foreground">{uninvoiced.length} ofakturerade uppdrag</p>
                </div>
              )}
              <Button disabled={!customerId} onClick={() => setStep(2)}>Nästa</Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader><CardTitle>Steg 2: Välj uppdrag</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {uninvoiced.length === 0 ? (
                <p className="text-muted-foreground py-4">Inga ofakturerade uppdrag för denna kund</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Uppdrag</TableHead>
                      <TableHead>Chaufför</TableHead>
                      <TableHead>Tid</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uninvoiced.map(a => {
                      const hours = a.actual_start && a.actual_stop ? calculateDecimalHours(a.actual_start, a.actual_stop) : 0;
                      return (
                        <TableRow key={a.id}>
                          <TableCell>
                            <Checkbox checked={selectedAssignments.includes(a.id)} onCheckedChange={() => toggleAssignment(a.id)} />
                          </TableCell>
                          <TableCell>{a.actual_start ? formatSwedishDate(a.actual_start) : '–'}</TableCell>
                          <TableCell className="font-medium">{a.title}</TableCell>
                          <TableCell>{a.driver?.full_name}</TableCell>
                          <TableCell>{hours}h</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <Button disabled={selectedAssignments.length === 0} onClick={async () => { await buildLines(); setStep(3); }}>Nästa</Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Steg 3: Fakturarader & inställningar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Invoice lines table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold">Fakturarader</Label>
                  <div className="flex gap-2">
                    <Select onValueChange={addArticleLine}>
                      <SelectTrigger className="h-8 w-[180px] text-xs">
                        <SelectValue placeholder="+ Lägg till artikel" />
                      </SelectTrigger>
                      <SelectContent>
                        {(articles ?? []).map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name} — {priceMap.get(a.id) ?? a.default_price} kr
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={addManualLine}>
                      <Plus className="h-3 w-3 mr-1" /> Fri rad
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Beskrivning</TableHead>
                        <TableHead className="w-20">Antal</TableHead>
                        <TableHead className="w-16">Enhet</TableHead>
                        <TableHead className="w-24 text-right">À-pris</TableHead>
                        <TableHead className="w-20 text-right">Moms</TableHead>
                        <TableHead className="w-24 text-right">Summa</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                            Inga rader ännu — artiklar från uppdragen läggs till automatiskt
                          </TableCell>
                        </TableRow>
                      )}
                      {lines.map(line => (
                        <TableRow key={line.id}>
                          <TableCell>
                            <Input
                              className="h-8 text-xs border-0 p-0 bg-transparent shadow-none focus-visible:ring-0"
                              value={line.name}
                              onChange={e => updateLine(line.id, 'name', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="h-8 text-xs border-0 p-0 bg-transparent shadow-none focus-visible:ring-0 text-right"
                              value={line.quantity}
                              onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs border-0 p-0 bg-transparent shadow-none focus-visible:ring-0"
                              value={line.unit}
                              onChange={e => updateLine(line.id, 'unit', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="h-8 text-xs border-0 p-0 bg-transparent shadow-none focus-visible:ring-0 text-right"
                              value={line.unit_price}
                              onChange={e => updateLine(line.id, 'unit_price', parseFloat(e.target.value) || 0)}
                            />
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {line.vat_rate}%
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium font-mono">
                            {(line.quantity * line.unit_price).toFixed(0)} kr
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeLine(line.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="text-right space-y-1 mt-3 text-sm">
                  <div className="flex justify-end gap-8"><span className="text-muted-foreground">Netto ex. moms</span><span className="font-mono">{totalExVat.toFixed(0)} kr</span></div>
                  <div className="flex justify-end gap-8"><span className="text-muted-foreground">Moms</span><span className="font-mono">{vatAmount.toFixed(0)} kr</span></div>
                  <div className="flex justify-end gap-8 text-base font-semibold"><span>Totalt</span><span className="font-mono">{totalIncVat.toFixed(0)} kr</span></div>
                </div>
              </div>

              {/* Settings */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fakturanummer</Label>
                    <Input type="number" value={finalInvoiceNumber} onChange={e => setInvoiceNumber(parseInt(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fakturadatum</Label>
                    <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Förfallodatum</Label>
                    <Input type="date" value={finalDueDate} onChange={e => setDueDateState(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Global momssats (om ej per rad)</Label>
                    <Select value={vatRate} onValueChange={setVatRate}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VAT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Er referens</Label>
                    <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Referensperson" />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label>Meddelande på faktura</Label>
                  <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Valfritt meddelande..." />
                </div>
              </div>

              <Button onClick={() => setStep(4)}>Förhandsgranska</Button>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader><CardTitle>Steg 4: Förhandsgranska</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-6 bg-card space-y-6">
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold text-lg">{settings?.company_name || 'Aurora Medias Transport AB'}</p>
                    <p className="text-sm text-muted-foreground">{settings?.address}, {settings?.zip_city}</p>
                    <p className="text-sm text-muted-foreground">Org.nr: {settings?.org_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">FAKTURA</p>
                    <p className="text-sm">Nr: {finalInvoiceNumber}</p>
                    <p className="text-sm">Datum: {invoiceDate}</p>
                    <p className="text-sm">Förfaller: {finalDueDate}</p>
                  </div>
                </div>

                <div>
                  <p className="font-medium">{customer?.name}</p>
                  <p className="text-sm text-muted-foreground">{customer?.org_number}</p>
                  <p className="text-sm text-muted-foreground">{customer?.invoice_address}</p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Beskrivning</TableHead>
                      <TableHead className="text-right">Antal</TableHead>
                      <TableHead>Enhet</TableHead>
                      <TableHead className="text-right">À-pris</TableHead>
                      <TableHead className="text-right">Moms</TableHead>
                      <TableHead className="text-right">Belopp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map(line => (
                      <TableRow key={line.id}>
                        <TableCell>{line.name}</TableCell>
                        <TableCell className="text-right font-mono">{line.quantity}</TableCell>
                        <TableCell>{line.unit}</TableCell>
                        <TableCell className="text-right font-mono">{line.unit_price.toFixed(0)} kr</TableCell>
                        <TableCell className="text-right font-mono">{line.vat_rate}%</TableCell>
                        <TableCell className="text-right font-mono">{(line.quantity * line.unit_price).toFixed(0)} kr</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="text-right space-y-1 border-t pt-3">
                  <p>Netto ex. moms: <span className="font-medium">{totalExVat.toFixed(0)} kr</span></p>
                  {vatAmount > 0 && (
                    <p>Moms: <span className="font-medium">{vatAmount.toFixed(0)} kr</span></p>
                  )}
                  {vatAmount === 0 && (
                    <p className="text-muted-foreground text-sm">Momsfri faktura</p>
                  )}
                  <p className="text-lg font-bold">Att betala: {totalIncVat.toFixed(0)} kr</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleCreate('draft')} disabled={createInvoice.isPending}>
                  <FileText className="h-4 w-4 mr-1" /> {createInvoice.isPending ? 'Skapar...' : 'Spara faktura'}
                </Button>
                <Button variant="outline" onClick={() => handleCreate('sent')}>
                  Markera som skickad
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

import { useState } from 'react';
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
import { formatSwedishDate, calculateDecimalHours } from '@/lib/format';
import { ArrowLeft, FileText } from 'lucide-react';

export default function AdminNewInvoice() {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState<string>('');
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [step, setStep] = useState(1);
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: customers } = useCustomers();
  const { data: allAssignments } = useAssignments();
  const { data: nextNumber } = useNextInvoiceNumber();
  const { data: settings } = useSettings();
  const createInvoice = useCreateInvoice();
  const [invoiceNumber, setInvoiceNumber] = useState<number | null>(null);

  const customer = (customers ?? []).find(c => c.id === customerId);
  const uninvoiced = (allAssignments ?? []).filter(a =>
    a.customer_id === customerId && a.status === 'completed' && !a.invoiced
  );

  const toggleAssignment = (id: string) => {
    setSelectedAssignments(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectedItems = uninvoiced.filter(a => selectedAssignments.includes(a.id));
  const calculateAmount = (a: typeof uninvoiced[0]) => {
    if (!customer) return 0;
    if (customer.pricing_type === 'per_delivery') return customer.price_per_delivery || 0;
    if (customer.pricing_type === 'per_hour' && a.actual_start && a.actual_stop) {
      return calculateDecimalHours(a.actual_start, a.actual_stop) * (customer.price_per_hour || 0);
    }
    return 0;
  };

  const totalExVat = selectedItems.reduce((sum, a) => sum + calculateAmount(a), 0);
  const vatAmount = totalExVat * 0.25;
  const totalIncVat = totalExVat + vatAmount;

  const today = new Date().toISOString().split('T')[0];
  const dueDate = customer
    ? new Date(Date.now() + customer.payment_terms_days * 86400000).toISOString().split('T')[0]
    : today;
  const [dueDateState, setDueDateState] = useState('');
  const finalDueDate = dueDateState || dueDate;
  const finalInvoiceNumber = invoiceNumber ?? nextNumber ?? 1001;

  const handleCreate = () => {
    createInvoice.mutate({
      invoice_number: finalInvoiceNumber,
      customer_id: customerId,
      assignment_ids: selectedAssignments,
      status: 'draft',
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
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setSelectedAssignments([]); }}>
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
                      <TableHead className="text-right">Belopp</TableHead>
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
                          <TableCell className="text-right">{calculateAmount(a).toFixed(0)} kr</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <div className="border-t pt-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Netto ex. moms</span><span>{totalExVat.toFixed(0)} kr</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Moms 25%</span><span>{vatAmount.toFixed(0)} kr</span></div>
                <div className="flex justify-between font-semibold text-base"><span>Totalt inkl. moms</span><span>{totalIncVat.toFixed(0)} kr</span></div>
              </div>
              <Button disabled={selectedAssignments.length === 0} onClick={() => setStep(3)}>Nästa</Button>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader><CardTitle>Steg 3: Fakturainställningar</CardTitle></CardHeader>
            <CardContent className="space-y-4">
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
                  <Label>Er referens</Label>
                  <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Referensperson" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Meddelande på faktura</Label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Valfritt meddelande..." />
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
                      <TableHead>Datum</TableHead>
                      <TableHead>Beskrivning</TableHead>
                      <TableHead>Chaufför</TableHead>
                      <TableHead>Timmar</TableHead>
                      <TableHead className="text-right">À-pris</TableHead>
                      <TableHead className="text-right">Belopp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItems.map(a => {
                      const hours = a.actual_start && a.actual_stop ? calculateDecimalHours(a.actual_start, a.actual_stop) : 0;
                      const amount = calculateAmount(a);
                      const unitPrice = customer?.pricing_type === 'per_delivery' ? (customer.price_per_delivery || 0) : (customer?.price_per_hour || 0);
                      return (
                        <TableRow key={a.id}>
                          <TableCell>{a.actual_start ? formatSwedishDate(a.actual_start) : '–'}</TableCell>
                          <TableCell>{a.title}</TableCell>
                          <TableCell>{a.driver?.full_name}</TableCell>
                          <TableCell>{hours}</TableCell>
                          <TableCell className="text-right">{unitPrice.toFixed(0)} kr</TableCell>
                          <TableCell className="text-right">{amount.toFixed(0)} kr</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="text-right space-y-1 border-t pt-3">
                  <p>Netto ex. moms: <span className="font-medium">{totalExVat.toFixed(0)} kr</span></p>
                  <p>Moms 25%: <span className="font-medium">{vatAmount.toFixed(0)} kr</span></p>
                  <p className="text-lg font-bold">Att betala: {totalIncVat.toFixed(0)} kr</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={createInvoice.isPending}>
                  <FileText className="h-4 w-4 mr-1" /> {createInvoice.isPending ? 'Skapar...' : 'Spara faktura'}
                </Button>
                <Button variant="outline" onClick={() => {
                  createInvoice.mutate({
                    invoice_number: finalInvoiceNumber,
                    customer_id: customerId,
                    assignment_ids: selectedAssignments,
                    status: 'sent',
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
                }}>
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

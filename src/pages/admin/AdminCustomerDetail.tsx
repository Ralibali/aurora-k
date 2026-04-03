import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { useCustomer, useUpdateCustomer, useAssignments, useInvoices } from '@/hooks/useData';
import { useCustomerPriceList, useUpsertCustomerPrice, useDeleteCustomerPrice, useArticles } from '@/hooks/useNewFeatures';
import { pricingTypeLabels } from '@/lib/types';
import { formatSwedishDate, calculateDecimalHours } from '@/lib/format';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: allAssignments } = useAssignments();
  const { data: allInvoices } = useInvoices();
  const updateCustomer = useUpdateCustomer();

  const [form, setForm] = useState<Record<string, any> | null>(null);

  if (isLoading) {
    return <AdminLayout title="Kund"><div className="max-w-4xl space-y-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-96 w-full" /></div></AdminLayout>;
  }

  if (!customer) {
    return <AdminLayout title="Kund"><div className="text-center py-12 text-muted-foreground">Kunden hittades inte</div></AdminLayout>;
  }

  const f = form || customer;
  const setField = (key: string, value: any) => setForm(prev => ({ ...(prev || customer), [key]: value }));

  const customerAssignments = (allAssignments ?? []).filter(a => a.customer_id === id && a.status === 'completed');
  const customerInvoices = (allInvoices ?? []).filter(i => i.customer_id === id);

  const handleSave = () => {
    if (!form) return;
    updateCustomer.mutate({ id: customer.id, ...form });
  };

  return (
    <AdminLayout title={customer.name}>
      <div className="space-y-4 max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
        </Button>

        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">Uppgifter</TabsTrigger>
            <TabsTrigger value="deliveries">Leveranser</TabsTrigger>
            <TabsTrigger value="invoices">Fakturor</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Företagsnamn</Label>
                    <Input value={f.name} onChange={e => setField('name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Organisationsnummer</Label>
                    <Input value={f.org_number || ''} onChange={e => setField('org_number', e.target.value || null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fakturaadress</Label>
                    <Input value={f.invoice_address || ''} onChange={e => setField('invoice_address', e.target.value || null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Besöksadress</Label>
                    <Input value={f.visit_address || ''} onChange={e => setField('visit_address', e.target.value || null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Kontaktperson</Label>
                    <Input value={f.contact_person || ''} onChange={e => setField('contact_person', e.target.value || null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-post</Label>
                    <Input value={f.email || ''} onChange={e => setField('email', e.target.value || null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input value={f.phone || ''} onChange={e => setField('phone', e.target.value || null)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Betalningsvillkor (dagar)</Label>
                    <Input type="number" value={f.payment_terms_days} onChange={e => setField('payment_terms_days', parseInt(e.target.value) || 30)} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold mb-3 block">Prissättning</Label>
                  <div className="flex gap-3 mb-3">
                    {(['per_delivery', 'per_hour', 'manual'] as const).map(t => (
                      <label key={t} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${f.pricing_type === t ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <input type="radio" name="pricing" checked={f.pricing_type === t} onChange={() => setField('pricing_type', t)} className="accent-primary" />
                        <span className="text-sm">{pricingTypeLabels[t]}</span>
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pris per leverans (kr)</Label>
                      <Input type="number" value={f.price_per_delivery ?? ''} onChange={e => setField('price_per_delivery', e.target.value ? parseFloat(e.target.value) : null)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Timpris (kr)</Label>
                      <Input type="number" value={f.price_per_hour ?? ''} onChange={e => setField('price_per_hour', e.target.value ? parseFloat(e.target.value) : null)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Anteckningar</Label>
                  <Textarea value={f.notes || ''} onChange={e => setField('notes', e.target.value || null)} />
                </div>

                <Button onClick={handleSave} disabled={updateCustomer.isPending}>
                  <Save className="h-4 w-4 mr-1" /> {updateCustomer.isPending ? 'Sparar...' : 'Spara'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliveries" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Uppdrag</TableHead>
                      <TableHead>Chaufför</TableHead>
                      <TableHead>Tid</TableHead>
                      <TableHead className="text-right">Belopp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerAssignments.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Inga leveranser</TableCell></TableRow>
                    )}
                    {customerAssignments.map(a => {
                      const hours = a.actual_start && a.actual_stop ? calculateDecimalHours(a.actual_start, a.actual_stop) : 0;
                      const amount = customer.pricing_type === 'per_delivery' ? (customer.price_per_delivery || 0) :
                        customer.pricing_type === 'per_hour' ? hours * (customer.price_per_hour || 0) : 0;
                      return (
                        <TableRow key={a.id}>
                          <TableCell>{a.actual_start ? formatSwedishDate(a.actual_start) : '–'}</TableCell>
                          <TableCell className="font-medium">{a.title}</TableCell>
                          <TableCell>{a.driver?.full_name}</TableCell>
                          <TableCell>{hours}h</TableCell>
                          <TableCell className="text-right">{amount > 0 ? `${amount.toFixed(0)} kr` : '–'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fakturanr</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Förfallodatum</TableHead>
                      <TableHead className="text-right">Belopp</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerInvoices.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Inga fakturor</TableCell></TableRow>
                    )}
                    {customerInvoices.map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">#{inv.invoice_number}</TableCell>
                        <TableCell>{inv.invoice_date}</TableCell>
                        <TableCell>{inv.due_date}</TableCell>
                        <TableCell className="text-right">{inv.total_inc_vat.toFixed(0)} kr</TableCell>
                        <TableCell><InvoiceStatusBadge status={inv.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

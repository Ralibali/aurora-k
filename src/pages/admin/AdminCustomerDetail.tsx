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
import { StatusBadge } from '@/components/StatusBadge';
import { InvoiceStatusBadge } from '@/components/InvoiceStatusBadge';
import { mockCustomers, mockAssignments, mockInvoices } from '@/lib/mock-data';
import { pricingTypeLabels } from '@/lib/types';
import { formatSwedishDate, formatSwedishTime, calculateDecimalHours } from '@/lib/format';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const customer = mockCustomers.find(c => c.id === id);

  if (!customer) {
    return <AdminLayout title="Kund"><div className="text-center py-12 text-muted-foreground">Kunden hittades inte</div></AdminLayout>;
  }

  const customerAssignments = mockAssignments.filter(a => a.customer_id === id && a.status === 'completed');
  const customerInvoices = mockInvoices.filter(i => i.customer_id === id);

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
                    <Input defaultValue={customer.name} />
                  </div>
                  <div className="space-y-2">
                    <Label>Organisationsnummer</Label>
                    <Input defaultValue={customer.org_number || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fakturaadress</Label>
                    <Input defaultValue={customer.invoice_address || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>Besöksadress</Label>
                    <Input defaultValue={customer.visit_address || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>Kontaktperson</Label>
                    <Input defaultValue={customer.contact_person || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-post</Label>
                    <Input defaultValue={customer.email || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefon</Label>
                    <Input defaultValue={customer.phone || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label>Betalningsvillkor (dagar)</Label>
                    <Input type="number" defaultValue={customer.payment_terms_days} />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <Label className="text-base font-semibold mb-3 block">Prissättning</Label>
                  <div className="flex gap-3 mb-3">
                    {(['per_delivery', 'per_hour', 'manual'] as const).map(t => (
                      <label key={t} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${customer.pricing_type === t ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <input type="radio" name="pricing" defaultChecked={customer.pricing_type === t} className="accent-primary" />
                        <span className="text-sm">{pricingTypeLabels[t]}</span>
                      </label>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pris per leverans (kr)</Label>
                      <Input type="number" defaultValue={customer.price_per_delivery || ''} />
                    </div>
                    <div className="space-y-2">
                      <Label>Timpris (kr)</Label>
                      <Input type="number" defaultValue={customer.price_per_hour || ''} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Anteckningar</Label>
                  <Textarea defaultValue={customer.notes || ''} />
                </div>

                <Button onClick={() => toast.success('Kund sparad!')}><Save className="h-4 w-4 mr-1" /> Spara</Button>
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

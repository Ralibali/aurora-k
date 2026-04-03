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
import { ArrowLeft, Save, Plus, Trash2, Link2, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminCustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: allAssignments } = useAssignments();
  const { data: allInvoices } = useInvoices();
  const { data: priceList } = useCustomerPriceList(id);
  const { data: articles } = useArticles();
  const updateCustomer = useUpdateCustomer();
  const upsertPrice = useUpsertCustomerPrice();
  const deletePrice = useDeleteCustomerPrice();

  const [form, setForm] = useState<Record<string, any> | null>(null);
  const [newPriceArticle, setNewPriceArticle] = useState('');
  const [newPriceValue, setNewPriceValue] = useState('');

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
            <TabsTrigger value="portal" className="gap-1.5"><Link2 className="h-3.5 w-3.5" /> Portal</TabsTrigger>
            <TabsTrigger value="prices">Prislistor</TabsTrigger>
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

          <TabsContent value="portal" className="mt-4">
            <CustomerPortalSection customerId={id!} />
          </TabsContent>

          <TabsContent value="prices" className="mt-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">Ange kundspecifika priser för artiklar. Dessa priser används istället för standardpriset vid fakturering.</p>
                <div className="flex gap-2 items-end">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Artikel</Label>
                    <Select value={newPriceArticle} onValueChange={setNewPriceArticle}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Välj artikel" /></SelectTrigger>
                      <SelectContent>
                        {(articles ?? []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 w-32">
                    <Label className="text-xs">Pris (kr)</Label>
                    <Input type="number" step="0.01" value={newPriceValue} onChange={e => setNewPriceValue(e.target.value)} className="h-9" />
                  </div>
                  <Button size="sm" className="h-9" onClick={() => {
                    if (newPriceArticle && newPriceValue && id) {
                      upsertPrice.mutate({ customer_id: id, article_id: newPriceArticle, price: parseFloat(newPriceValue) });
                      setNewPriceArticle(''); setNewPriceValue('');
                    }
                  }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {priceList && priceList.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Artikel</TableHead>
                        <TableHead className="text-right">Standardpris</TableHead>
                        <TableHead className="text-right">Kundpris</TableHead>
                        <TableHead className="w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {priceList.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.article?.name}</TableCell>
                          <TableCell className="text-right text-muted-foreground font-mono">{p.article?.default_price} kr</TableCell>
                          <TableCell className="text-right font-medium font-mono">{p.price} kr</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => deletePrice.mutate(p.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
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
                         <TableCell className="font-mono text-sm">{a.actual_start ? formatSwedishDate(a.actual_start) : '–'}</TableCell>
                          <TableCell className="font-medium">{a.title}</TableCell>
                          <TableCell>{a.driver?.full_name}</TableCell>
                          <TableCell className="font-mono text-sm">{hours}h</TableCell>
                          <TableCell className="text-right font-mono">{amount > 0 ? `${amount.toFixed(0)} kr` : '–'}</TableCell>
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
                        <TableCell className="font-mono text-sm">#{inv.invoice_number}</TableCell>
                        <TableCell className="font-mono text-sm">{inv.invoice_date}</TableCell>
                        <TableCell className="font-mono text-sm">{inv.due_date}</TableCell>
                        <TableCell className="text-right font-mono">{inv.total_inc_vat.toFixed(0)} kr</TableCell>
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

function CustomerPortalSection({ customerId }: { customerId: string }) {
  const [tokens, setTokens] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState(false);

  const loadTokens = async () => {
    const { data } = await supabase
      .from('customer_access_tokens')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    setTokens(data ?? []);
    setLoaded(true);
  };

  if (!loaded) {
    loadTokens();
  }

  const generateToken = async () => {
    setGenerating(true);
    const { data, error } = await supabase
      .from('customer_access_tokens')
      .insert({ customer_id: customerId })
      .select()
      .single();
    if (error) {
      toast.error('Kunde inte generera länk');
      setGenerating(false);
      return;
    }
    setTokens(prev => [data, ...prev]);
    setGenerating(false);
    toast.success('Portallänk skapad!');
  };

  const getPortalUrl = (token: string) => {
    const base = window.location.origin;
    return `${base}/portal?token=${token}`;
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getPortalUrl(token));
    toast.success('Länk kopierad!');
  };

  const deleteToken = async (id: string) => {
    await supabase.from('customer_access_tokens').delete().eq('id', id);
    setTokens(prev => prev.filter(t => t.id !== id));
    toast.success('Länk borttagen');
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Kundportal</p>
            <p className="text-xs text-muted-foreground mt-0.5">Generera en unik länk som kunden kan använda för att se sina uppdrag, beställningar och fakturor.</p>
          </div>
          <Button size="sm" onClick={generateToken} disabled={generating}>
            {generating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Ny länk
          </Button>
        </div>

        {tokens.length === 0 && loaded && (
          <div className="border-2 border-dashed rounded-lg py-8 text-center">
            <Link2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Inga portallänkar ännu</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Skapa en länk som du kan dela med kunden</p>
          </div>
        )}

        {tokens.length > 0 && (
          <div className="space-y-2">
            {tokens.map(t => {
              const expired = t.expires_at && new Date(t.expires_at) < new Date();
              return (
                <div key={t.id} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] font-mono text-muted-foreground truncate block max-w-[300px]">
                        {getPortalUrl(t.token)}
                      </code>
                      {expired && <span className="text-[10px] text-destructive font-medium">Utgången</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Skapad {new Date(t.created_at).toLocaleDateString('sv-SE')}
                      {t.expires_at && ` · Giltig t.o.m. ${new Date(t.expires_at).toLocaleDateString('sv-SE')}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => copyLink(t.token)} title="Kopiera länk">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <a href={getPortalUrl(t.token)} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" title="Öppna portal">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-destructive" onClick={() => deleteToken(t.id)} title="Ta bort">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

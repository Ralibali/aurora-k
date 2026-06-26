import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Inbox, Mail, Sparkles, Upload, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomers } from '@/hooks/useData';
import { parseTransportCsv, parseTransportOrder, type ParsedTransportOrder } from '@/lib/order-parser';

const example = `Uppdrag: Expressleverans till byggarbetsplats
Kund: Byggpartner AB
Hämtning: Industrigatan 12, Linköping
Leverans: Storgatan 4, Norrköping
Datum: 2026-07-02 09:30
Tjänst: Budbil
Kontakt: Anna Andersson
Telefon: 070-123 45 67
Gods: 4 pallar. Ring 30 minuter före ankomst.`;

function emptyOrder(): ParsedTransportOrder {
  return {
    title: '', customerName: '', pickupAddress: '', deliveryAddress: '', scheduledStart: '',
    instructions: '', serviceType: '', contactName: '', contactPhone: '', confidence: 0,
  };
}

function OrderReview({ order, onChange }: { order: ParsedTransportOrder; onChange: (next: ParsedTransportOrder) => void }) {
  const update = (field: keyof ParsedTransportOrder, value: string) => onChange({ ...order, [field]: value });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><p className="font-semibold">Granska tolkningen</p><p className="text-xs text-muted-foreground">Alla fält kan ändras innan uppdraget skapas.</p></div>
        <Badge variant={order.confidence >= 80 ? 'default' : order.confidence >= 50 ? 'secondary' : 'outline'}>{order.confidence}% säkerhet</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2"><Label>Titel</Label><Input value={order.title} onChange={event => update('title', event.target.value)} /></div>
        <div className="space-y-2"><Label>Kundnamn</Label><Input value={order.customerName} onChange={event => update('customerName', event.target.value)} /></div>
        <div className="space-y-2"><Label>Tjänst</Label><Select value={order.serviceType || 'none'} onValueChange={value => update('serviceType', value === 'none' ? '' : value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Ej angivet</SelectItem>{['Kranbil','Budbil','Tippbil','Krokbil','TMA-skydd','Byggsäck','Maskintransport','Annat'].map(value => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Hämtningsadress</Label><Input value={order.pickupAddress} onChange={event => update('pickupAddress', event.target.value)} /></div>
        <div className="space-y-2"><Label>Leveransadress</Label><Input value={order.deliveryAddress} onChange={event => update('deliveryAddress', event.target.value)} /></div>
        <div className="space-y-2"><Label>Datum och tid</Label><Input type="datetime-local" value={order.scheduledStart} onChange={event => update('scheduledStart', event.target.value)} /></div>
        <div className="space-y-2"><Label>Kontakt</Label><Input value={order.contactName} onChange={event => update('contactName', event.target.value)} placeholder="Namn" /></div>
        <div className="space-y-2"><Label>Telefon</Label><Input value={order.contactPhone} onChange={event => update('contactPhone', event.target.value)} /></div>
        <div className="space-y-2 sm:col-span-2"><Label>Instruktioner och gods</Label><Textarea rows={5} value={order.instructions} onChange={event => update('instructions', event.target.value)} /></div>
      </div>
    </div>
  );
}

export default function OrderInboxPage() {
  const navigate = useNavigate();
  const { data: customers } = useCustomers();
  const fileInput = useRef<HTMLInputElement>(null);
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState<ParsedTransportOrder | null>(null);
  const [batch, setBatch] = useState<ParsedTransportOrder[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const current = batch.length ? batch[selectedIndex] : parsed;
  const matchedCustomerId = useMemo(() => {
    if (!current?.customerName) return '';
    const normalized = current.customerName.toLowerCase().replace(/\s+/g, ' ').trim();
    return (customers ?? []).find(customer => customer.name.toLowerCase().replace(/\s+/g, ' ').trim() === normalized)?.id ?? '';
  }, [current?.customerName, customers]);

  const parseText = () => {
    if (!rawText.trim()) return toast.error('Klistra in en order eller ett mejl först');
    const result = parseTransportOrder(rawText);
    setBatch([]);
    setParsed(result);
    toast.success('Ordern är tolkad och redo att granskas');
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    if (/\.csv$/i.test(file.name)) {
      const orders = parseTransportCsv(text);
      if (!orders.length) return toast.error('CSV-filen innehöll inga läsbara orderrader');
      setBatch(orders);
      setSelectedIndex(0);
      setParsed(null);
      toast.success(`${orders.length} order${orders.length === 1 ? '' : 'r'} importerades`);
      return;
    }
    setRawText(text);
    setParsed(parseTransportOrder(text));
    setBatch([]);
  };

  const updateCurrent = (next: ParsedTransportOrder) => {
    if (batch.length) setBatch(rows => rows.map((row, index) => index === selectedIndex ? next : row));
    else setParsed(next);
  };

  const openAssignment = () => {
    if (!current) return;
    if (!current.title.trim() || !current.pickupAddress.trim()) return toast.error('Titel och hämtningsadress måste finnas');
    const contact = [current.contactName, current.contactPhone].filter(Boolean).join(' · ');
    const instructions = [current.instructions, contact ? `Kontakt: ${contact}` : ''].filter(Boolean).join('\n\n');
    navigate('/admin/assignments/new', {
      state: {
        copy: {
          title: current.title,
          customer_id: matchedCustomerId,
          service_type: current.serviceType,
          pickup_address: current.pickupAddress,
          delivery_address: current.deliveryAddress,
          instructions,
          require_photo: true,
          require_signature: true,
        },
        importedScheduledStart: current.scheduledStart,
        source: 'order-inbox',
      },
    });
  };

  return (
    <AdminLayout title="Orderinkorg" description="Gör mejl, text och CSV till färdiga transportuppdrag">
      <div className="mx-auto max-w-5xl space-y-5">
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card">
          <CardContent className="grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div><div className="mb-2 flex items-center gap-2"><WandSparkles className="h-5 w-5 text-primary" /><h2 className="text-lg font-bold">Från ordermejl till uppdrag på under en minut</h2></div><p className="max-w-2xl text-sm text-muted-foreground">Aurora hittar kund, adresser, datum, telefon, tjänst och instruktioner. Du granskar och skickar vidare till chauffören.</p></div>
            <Badge className="w-fit" variant="secondary"><Sparkles className="mr-1 h-3 w-3" /> Smart import</Badge>
          </CardContent>
        </Card>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Mail className="h-4 w-4" /> Klistra in order eller mejl</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Textarea rows={15} value={rawText} onChange={event => setRawText(event.target.value)} placeholder={example} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={parseText}><Sparkles className="mr-2 h-4 w-4" /> Tolka order</Button>
                <Button variant="outline" onClick={() => fileInput.current?.click()}><Upload className="mr-2 h-4 w-4" /> Ladda upp CSV eller text</Button>
                <Button variant="ghost" onClick={() => setRawText(example)}>Fyll med exempel</Button>
                <input ref={fileInput} hidden type="file" accept=".csv,.txt,text/csv,text/plain" onChange={event => void importFile(event.target.files?.[0])} />
              </div>
              <div className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground"><FileSpreadsheet className="mb-2 h-5 w-5" />CSV kan innehålla rubriker som uppdrag, kund, hämtning, leverans, datum, telefon och gods.</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Inbox className="h-4 w-4" /> Importerade order</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!current && <div className="py-16 text-center text-sm text-muted-foreground"><Inbox className="mx-auto mb-3 h-9 w-9 opacity-30" />Tolkade order visas här.</div>}
              {batch.length > 1 && <div className="flex gap-2 overflow-x-auto pb-1">{batch.map((order, index) => <Button key={`${order.title}-${index}`} size="sm" variant={selectedIndex === index ? 'default' : 'outline'} onClick={() => setSelectedIndex(index)}>#{index + 1}</Button>)}</div>}
              {current && <><OrderReview order={current} onChange={updateCurrent} />{current.customerName && <div className={`rounded-lg border p-3 text-sm ${matchedCustomerId ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{matchedCustomerId ? `Kunden “${current.customerName}” matchades automatiskt.` : `Kunden “${current.customerName}” finns inte exakt i registret. Välj eller skapa kunden i nästa steg.`}</div>}<Button className="h-12 w-full" onClick={openAssignment}>Öppna färdigifyllt uppdrag</Button></>}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

import { useMemo, useRef, useState } from 'react';
import { Sparkles, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCustomers } from '@/hooks/useData';
import { parseTransportCsv, parseTransportOrder, type ParsedTransportOrder } from '@/lib/order-parser';

export function SmartOrderImportDialog() {
  const navigate = useNavigate();
  const { data: customers } = useCustomers();
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [order, setOrder] = useState<ParsedTransportOrder | null>(null);

  const customerId = useMemo(() => {
    if (!order?.customerName) return '';
    const wanted = order.customerName.toLowerCase().trim();
    return (customers ?? []).find(customer => customer.name.toLowerCase().trim() === wanted)?.id ?? '';
  }, [customers, order?.customerName]);

  const parse = (source = text) => {
    if (!source.trim()) return toast.error('Klistra in en order först');
    setOrder(parseTransportOrder(source));
  };

  const loadFile = async (file?: File) => {
    if (!file) return;
    const source = await file.text();
    setText(source);
    const first = /\.csv$/i.test(file.name) ? parseTransportCsv(source)[0] : parseTransportOrder(source);
    if (!first) return toast.error('Filen innehöll ingen läsbar order');
    setOrder(first);
  };

  const update = (field: keyof ParsedTransportOrder, value: string) => {
    if (order) setOrder({ ...order, [field]: value });
  };

  const continueToAssignment = () => {
    if (!order?.title || !order.pickupAddress) return toast.error('Titel och hämtningsadress krävs');
    const contact = [order.contactName, order.contactPhone].filter(Boolean).join(' · ');
    navigate('/admin/assignments/new', { state: { copy: {
      title: order.title,
      customer_id: customerId,
      service_type: order.serviceType,
      pickup_address: order.pickupAddress,
      delivery_address: order.deliveryAddress,
      instructions: [order.instructions, contact ? `Kontakt: ${contact}` : ''].filter(Boolean).join('\n\n'),
      require_photo: true,
      require_signature: true,
    }, importedScheduledStart: order.scheduledStart } });
  };

  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline"><Sparkles className="mr-2 h-4 w-4" /> Smart orderimport</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>Gör ordermejl till uppdrag</DialogTitle></DialogHeader>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <Textarea rows={14} value={text} onChange={event => setText(event.target.value)} placeholder="Klistra in order, mejl eller transportinstruktion..." />
            <div className="flex gap-2"><Button onClick={() => parse()}><Sparkles className="mr-2 h-4 w-4" /> Tolka</Button><Button variant="outline" onClick={() => fileInput.current?.click()}><Upload className="mr-2 h-4 w-4" /> Fil</Button></div>
            <input ref={fileInput} hidden type="file" accept=".csv,.txt,text/csv,text/plain" onChange={event => void loadFile(event.target.files?.[0])} />
          </div>
          <div className="space-y-3 rounded-xl border p-4">
            {!order && <p className="py-16 text-center text-sm text-muted-foreground">Tolkningen visas här.</p>}
            {order && <>
              <div className="flex justify-between"><p className="font-semibold">Granska</p><Badge>{order.confidence}%</Badge></div>
              <div className="space-y-1"><Label>Titel</Label><Input value={order.title} onChange={event => update('title', event.target.value)} /></div>
              <div className="space-y-1"><Label>Kund</Label><Input value={order.customerName} onChange={event => update('customerName', event.target.value)} /></div>
              <div className="space-y-1"><Label>Hämtning</Label><Input value={order.pickupAddress} onChange={event => update('pickupAddress', event.target.value)} /></div>
              <div className="space-y-1"><Label>Leverans</Label><Input value={order.deliveryAddress} onChange={event => update('deliveryAddress', event.target.value)} /></div>
              <div className="space-y-1"><Label>Datum</Label><Input type="datetime-local" value={order.scheduledStart} onChange={event => update('scheduledStart', event.target.value)} /></div>
              <Button className="h-11 w-full" onClick={continueToAssignment}>Fortsätt till uppdrag</Button>
            </>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

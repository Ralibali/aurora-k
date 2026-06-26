import { useMemo, useRef, useState } from 'react';
import { FileText, Loader2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCustomers } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import type { ParsedTransportOrder } from '@/lib/order-parser';

function normalize(value: Record<string, unknown>): ParsedTransportOrder {
  return {
    title: String(value.title ?? ''), customerName: String(value.customerName ?? ''),
    pickupAddress: String(value.pickupAddress ?? ''), deliveryAddress: String(value.deliveryAddress ?? ''),
    scheduledStart: String(value.scheduledStart ?? ''), instructions: String(value.instructions ?? ''),
    serviceType: String(value.serviceType ?? ''), contactName: String(value.contactName ?? ''),
    contactPhone: String(value.contactPhone ?? ''), confidence: Number(value.confidence ?? 0),
  };
}

export function PdfOrderImportDialog() {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const { data: customers } = useCustomers();
  const [order, setOrder] = useState<ParsedTransportOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const customerId = useMemo(() => {
    const wanted = order?.customerName.toLowerCase().trim();
    return wanted ? (customers ?? []).find(customer => customer.name.toLowerCase().trim() === wanted)?.id ?? '' : '';
  }, [customers, order?.customerName]);

  const readPdf = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const { data, error } = await supabase.functions.invoke('parse-order-document', { body });
      if (error) throw error;
      const parsed = (data as { parsed?: Record<string, unknown> } | null)?.parsed;
      if (!parsed) throw new Error('PDF-filen gav inget orderunderlag');
      setOrder(normalize(parsed));
      toast.success('PDF-dokumentet är tolkat');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'PDF-filen kunde inte tolkas');
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof ParsedTransportOrder, value: string) => order && setOrder({ ...order, [key]: value });
  const continueToAssignment = () => {
    if (!order?.title || !order.pickupAddress) return toast.error('Titel och hämtningsadress krävs');
    navigate('/admin/assignments/new', { state: { copy: {
      title: order.title, customer_id: customerId, service_type: order.serviceType,
      pickup_address: order.pickupAddress, delivery_address: order.deliveryAddress,
      instructions: order.instructions, require_photo: true, require_signature: true,
    }, importedScheduledStart: order.scheduledStart, source: 'smart-order-import' } });
  };

  return <Dialog>
    <DialogTrigger asChild><Button variant="outline"><FileText className="mr-2 h-4 w-4" /> Tolka PDF</Button></DialogTrigger>
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>Skapa uppdrag från PDF</DialogTitle></DialogHeader>
      {!order ? <div className="rounded-xl border border-dashed p-10 text-center"><FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-semibold">Ladda upp transportorder eller körorder</p><p className="mt-1 text-sm text-muted-foreground">Maskinläsbar PDF, högst 20 MB.</p><Button className="mt-5" disabled={loading} onClick={() => input.current?.click()}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Välj PDF</Button><input ref={input} hidden type="file" accept="application/pdf,.pdf" onChange={event => void readPdf(event.target.files?.[0])} /></div> : <div className="space-y-3">
        <div className="flex justify-between"><p className="font-semibold">Granska tolkningen</p><Badge>{order.confidence}% säkerhet</Badge></div>
        <div className="space-y-1"><Label>Titel</Label><Input value={order.title} onChange={event => update('title', event.target.value)} /></div>
        <div className="space-y-1"><Label>Kund</Label><Input value={order.customerName} onChange={event => update('customerName', event.target.value)} /></div>
        <div className="space-y-1"><Label>Hämtning</Label><Input value={order.pickupAddress} onChange={event => update('pickupAddress', event.target.value)} /></div>
        <div className="space-y-1"><Label>Leverans</Label><Input value={order.deliveryAddress} onChange={event => update('deliveryAddress', event.target.value)} /></div>
        <div className="space-y-1"><Label>Datum och tid</Label><Input type="datetime-local" value={order.scheduledStart} onChange={event => update('scheduledStart', event.target.value)} /></div>
        <Button className="h-11 w-full" onClick={continueToAssignment}>Fortsätt till uppdrag</Button>
      </div>}
    </DialogContent>
  </Dialog>;
}

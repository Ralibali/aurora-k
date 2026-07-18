import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useCustomers, useDrivers, useCreateAssignment } from '@/hooks/useData';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useVehicles, useOrders } from '@/hooks/useNewFeatures';
import { useUpdateBookingRequest } from '@/hooks/useAllFeatures';
import { priorityLabels } from '@/lib/types';
import { PUBLIC_SITE_URL } from '@/lib/constants';
import { sendDriverAssignmentPush } from '@/lib/driver-notifications';
import { ArrowLeft, MapPin, PackageCheck, Route, Sparkles, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly';

const serviceTypes = ['Kranbil', 'Budbil', 'Tippbil', 'Krokbil', 'TMA-skydd', 'Byggsäck', 'Maskintransport', 'Annat'] as const;
const MAX_RECURRING_ASSIGNMENTS = 200;

function addInterval(date: Date, freq: RecurrenceFrequency): Date {
  const d = new Date(date);
  if (freq === 'weekly') d.setDate(d.getDate() + 7);
  if (freq === 'biweekly') d.setDate(d.getDate() + 14);
  if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
  return d;
}

function buildAddress(pickup: string, delivery: string) {
  if (pickup && delivery) return `${pickup} → ${delivery}`;
  return pickup || delivery;
}

function toDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function validDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function inferDate(text: string): Date | null {
  const lower = text.toLowerCase();
  const now = new Date();

  const isoMatch = lower.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) return validDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));

  const shortDate = lower.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (shortDate) {
    const year = shortDate[3] ? Number(shortDate[3].length === 2 ? `20${shortDate[3]}` : shortDate[3]) : now.getFullYear();
    return validDate(year, Number(shortDate[2]), Number(shortDate[1]));
  }

  const date = new Date(now);
  if (lower.includes('övermorgon')) {
    date.setDate(date.getDate() + 2);
    return date;
  }
  if (lower.includes('imorgon') || lower.includes('i morgon')) {
    date.setDate(date.getDate() + 1);
    return date;
  }
  if (lower.includes('idag') || lower.includes('i dag')) return date;

  const weekdays: Record<string, number> = { söndag: 0, måndag: 1, tisdag: 2, onsdag: 3, torsdag: 4, fredag: 5, lördag: 6 };
  const dayName = Object.keys(weekdays).find(day => new RegExp(`\\b${day}\\b`, 'i').test(lower));
  if (!dayName) return null;

  const target = weekdays[dayName];
  const diff = (target - date.getDay() + 7) % 7 || 7;
  date.setDate(date.getDate() + diff);
  return date;
}

function inferScheduledStart(text: string) {
  const date = inferDate(text);
  if (!date) return '';

  const time = text.toLowerCase().match(/kl\.?\s*(\d{1,2})(?:[:.](\d{2}))?/) || text.match(/\b(\d{1,2})[:.](\d{2})\b/);
  const hour = time ? Number(time[1]) : 8;
  const minute = time?.[2] ? Number(time[2]) : 0;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return '';

  date.setHours(hour, minute, 0, 0);
  return toDateTimeLocal(date);
}

function cleanExtract(value?: string) {
  return (value || '')
    .replace(/\b(imorgon|i morgon|övermorgon|idag|i dag|kl\.?\s*\d{1,2}(?::|\.)?\d{0,2})\b/gi, '')
    .replace(/\b(?:och\s+)?(?:kör|leverera|lämna)(?:s)?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[,.]$/g, '')
    .trim();
}

function parseSmartAssignment(text: string) {
  const normalized = text.replace(/\n+/g, ' ').trim();
  const lower = normalized.toLowerCase();
  const serviceType = serviceTypes.find(type => lower.includes(type.toLowerCase())) || '';

  const pickupLocation = normalized.match(/\bhos\s+(.+?)(?=\s+(?:imorgon|i morgon|övermorgon|idag|i dag|kl\.?|och\s+(?:kör|leverera|lämna)\b)|[.!?]|$)/i)?.[1];
  const deliveryLocation = normalized.match(/\b(?:kör|leverera|lämna)(?:s)?\s+till\s+(.+?)(?=\s+(?:imorgon|i morgon|övermorgon|idag|i dag|kl\.?|ring\b|kontakt\b)|[.!?]|$)/i)?.[1];
  const routeMatch = normalized.match(/(?:från|hämta(?:s)?\s+(?:hos|på))\s+(.+?)\s+(?:och\s+)?(?:till|->|→|kör(?:s)?\s+till|leverera(?:s)?\s+till|lämna(?:s)?\s+till)\s+(.+?)(?:[.!?]|$)/i);

  const pickup = cleanExtract(pickupLocation || routeMatch?.[1]);
  const delivery = cleanExtract(deliveryLocation || routeMatch?.[2]);
  const titleBase = serviceType || normalized.split(/[.!?]/)[0]?.slice(0, 70) || 'Transportuppdrag';

  return {
    title: pickup && delivery ? `${serviceType || 'Transport'}: ${pickup} → ${delivery}` : titleBase,
    serviceType,
    pickup,
    delivery,
    scheduledStart: inferScheduledStart(normalized),
    instructions: normalized,
  };
}

export default function AdminNewAssignment() {
  const navigate = useNavigate();
  const location = useLocation();
  type AssignmentRow = Tables<'assignments'>;
  const state = (location.state as { copy?: AssignmentRow; bookingRequestId?: string; source?: string; importedScheduledStart?: string } | null) || {};
  const copyFrom = state.copy;
  const bookingRequestId = state.bookingRequestId as string | undefined;
  const importedOrder = state.source === 'smart-order-import';

  const { data: customers } = useCustomers();
  const { data: drivers } = useDrivers();
  const { data: vehicles } = useVehicles();
  const { data: orders } = useOrders();
  const createAssignment = useCreateAssignment();
  const updateBookingRequest = useUpdateBookingRequest();

  const [title, setTitle] = useState(copyFrom?.title || '');
  const [customerId, setCustomerId] = useState(copyFrom?.customer_id || '');
  const [serviceType, setServiceType] = useState(copyFrom?.service_type || '');
  const [pickupAddress, setPickupAddress] = useState(copyFrom?.pickup_address || copyFrom?.address || '');
  const [deliveryAddress, setDeliveryAddress] = useState(copyFrom?.delivery_address || '');
  const [instructions, setInstructions] = useState(copyFrom?.instructions || '');
  const [priority, setPriority] = useState(copyFrom?.priority || 'normal');
  const [scheduledStart, setScheduledStart] = useState(copyFrom?.scheduled_start || state.importedScheduledStart || '');
  const [scheduledEnd, setScheduledEnd] = useState(copyFrom?.scheduled_end || '');
  const [driverId, setDriverId] = useState(copyFrom?.assigned_driver_id || '');
  const [adminComment, setAdminComment] = useState(copyFrom?.admin_comment || '');
  const [requireSignature, setRequireSignature] = useState(copyFrom?.require_signature ?? false);
  const [requirePhoto, setRequirePhoto] = useState(copyFrom?.require_photo ?? false);
  const [trackingEnabled, setTrackingEnabled] = useState(copyFrom?.tracking_enabled ?? true);
  const [cost, setCost] = useState<string>(copyFrom?.cost != null ? String(copyFrom.cost) : '');
  const [vehicleId, setVehicleId] = useState(copyFrom?.vehicle_id || '');
  const [orderId, setOrderId] = useState(copyFrom?.order_id || '');
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('weekly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [smartInput, setSmartInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applySmartInput = () => {
    if (!smartInput.trim()) {
      toast.error('Klistra in ett mejl, sms eller en ordertext först.');
      return;
    }
    const parsed = parseSmartAssignment(smartInput);
    setTitle(parsed.title);
    if (parsed.serviceType) setServiceType(parsed.serviceType);
    if (parsed.pickup) setPickupAddress(parsed.pickup);
    if (parsed.delivery) setDeliveryAddress(parsed.delivery);
    if (parsed.scheduledStart) setScheduledStart(parsed.scheduledStart);
    setInstructions(parsed.instructions);
    toast.success(parsed.scheduledStart
      ? 'Texten tolkades och fyllde i uppdraget. Kontrollera detaljerna innan du sparar.'
      : 'Texten tolkades. Datum och tid lämnades oförändrade eftersom inget säkert datum hittades.');
  };

  const notifyDriver = (assignment: { id: string }, scheduledStartIso: string) => {
    const driver = (drivers ?? []).find(d => d.id === driverId);
    const customer = (customers ?? []).find(c => c.id === customerId);
    if (!driver) return;

    const formattedDate = new Date(scheduledStartIso).toLocaleString('sv-SE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (driver.email && customer) {
      supabase.functions.invoke('send-email', {
        body: {
          to: driver.email,
          subject: `Nytt uppdrag: ${title}`,
          templateName: 'assignment-confirmation',
          templateData: {
            driverName: driver.full_name,
            title,
            address: buildAddress(pickupAddress, deliveryAddress),
            scheduledStart: formattedDate,
            customerName: customer.name,
            priority,
            serviceType,
            instructions: instructions || null,
            adminComment: adminComment || null,
            appUrl: `${PUBLIC_SITE_URL}/driver/assignments/${assignment.id}`,
          },
        },
      }).catch(err => console.warn('[assignment-confirmation] send-email failed', err));
    }

    sendDriverAssignmentPush(driver.id, 'Nytt uppdrag', `${title} · ${formattedDate}`, assignment.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const baseStart = new Date(scheduledStart);
    if (!scheduledStart || Number.isNaN(baseStart.getTime())) {
      toast.error('Ange ett giltigt startdatum och en starttid.');
      return;
    }

    const baseEnd = scheduledEnd ? new Date(scheduledEnd) : null;
    if (baseEnd && (Number.isNaN(baseEnd.getTime()) || baseEnd <= baseStart)) {
      toast.error('Sluttiden måste ligga efter starttiden.');
      return;
    }

    setIsSubmitting(true);
    const durationMs = baseEnd ? baseEnd.getTime() - baseStart.getTime() : 0;
    const dates: { start: Date; end: Date | null }[] = [{ start: baseStart, end: baseEnd }];

    if (recurrenceEnabled && recurrenceEndDate) {
      const endLimit = new Date(recurrenceEndDate + 'T23:59:59');
      let nextStart = addInterval(baseStart, recurrenceFrequency);
      while (nextStart <= endLimit && dates.length < MAX_RECURRING_ASSIGNMENTS) {
        dates.push({ start: nextStart, end: baseEnd ? new Date(nextStart.getTime() + durationMs) : null });
        nextStart = addInterval(nextStart, recurrenceFrequency);
      }
      if (nextStart <= endLimit) {
        setIsSubmitting(false);
        toast.error(`En serie kan innehålla högst ${MAX_RECURRING_ASSIGNMENTS} uppdrag. Välj ett tidigare slutdatum.`);
        return;
      }
    }

    try {
      for (const d of dates) {
        const payload: TablesInsert<'assignments'> = {
          title,
          customer_id: customerId,
          address: buildAddress(pickupAddress, deliveryAddress),
          pickup_address: pickupAddress || null,
          delivery_address: deliveryAddress || null,
          service_type: serviceType || null,
          booking_request_id: bookingRequestId || null,
          instructions: instructions || null,
          scheduled_start: d.start.toISOString(),
          scheduled_end: d.end ? d.end.toISOString() : null,
          assigned_driver_id: driverId,
          priority,
          admin_comment: adminComment || null,
          require_signature: requireSignature,
          require_photo: requirePhoto,
          tracking_enabled: trackingEnabled,
          cost: cost ? parseFloat(cost) : null,
          vehicle_id: vehicleId || null,
          order_id: orderId || null,
        };
        const createdAssignment = await new Promise<{ id: string }>((resolve, reject) => {
          createAssignment.mutate(payload, { onSuccess: data => resolve(data), onError: err => reject(err) });
        });
        notifyDriver(createdAssignment, d.start.toISOString());
      }

      if (bookingRequestId) {
        updateBookingRequest.mutate({ id: bookingRequestId, status: 'accepted', admin_note: 'Omgjord till uppdrag' });
      }

      toast.success(dates.length > 1 ? `${dates.length} uppdrag skapades.` : 'Uppdraget skapades.');
      navigate('/admin/assignments');
    } catch (error) {
      console.error('[AdminNewAssignment] create failed', error);
      toast.error(error instanceof Error ? error.message : 'Uppdraget kunde inte skapas.');
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout title="Nytt uppdrag">
      <div className="max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4"><ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka</Button>
        <Card>
          <CardHeader><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><CardTitle>Skapa nytt uppdrag</CardTitle><div className="flex flex-wrap gap-2">{bookingRequestId && <Badge variant="outline">Skapas från bokningsförfrågan</Badge>}{importedOrder && <Badge>Smart orderimport</Badge>}</div></div></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold text-violet-950"><Sparkles className="h-4 w-4" /> Smart skapa från text</div>
                <Textarea value={smartInput} onChange={e => setSmartInput(e.target.value)} rows={4} placeholder="Klistra in t.ex. 'Hämta 2 pallar hos Byggmax Linköping imorgon kl 08:00 och kör till Motala. Ring kunden innan.'" />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-violet-900/70">Fyller i titel, uppdragstyp, adresser, tid och instruktioner som ett första förslag.</p>
                  <Button type="button" variant="secondary" onClick={applySmartInput}><Sparkles className="mr-2 h-4 w-4" /> Tolka och fyll i</Button>
                </div>
              </div>

              <div className="rounded-xl border bg-blue-50/50 p-4">
                <div className="mb-4 flex items-center gap-2 font-semibold"><Truck className="h-4 w-4" /> Transportuppdrag</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="title">Titel</Label><Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="T.ex. Kranbil till byggarbetsplats" required /></div>
                  <div className="space-y-2"><Label>Uppdragstyp</Label><Select value={serviceType || 'none'} onValueChange={v => setServiceType(v === 'none' ? '' : v)}><SelectTrigger><SelectValue placeholder="Välj typ" /></SelectTrigger><SelectContent><SelectItem value="none">Ej angivet</SelectItem>{serviceTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>Kund</Label><Select value={customerId} onValueChange={setCustomerId} required><SelectTrigger><SelectValue placeholder="Välj kund" /></SelectTrigger><SelectContent>{(customers ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                </div>
              </div>

              <div className="rounded-xl border p-4"><div className="mb-4 flex items-center gap-2 font-semibold"><Route className="h-4 w-4" /> Rutt</div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="pickup">Hämtningsadress</Label><Input id="pickup" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} placeholder="Gata, ort, platsinfo" required /></div><div className="space-y-2"><Label htmlFor="delivery">Leveransadress</Label><Input id="delivery" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Gata, ort, platsinfo" /></div></div><p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> Föraren ser rutten som: {buildAddress(pickupAddress, deliveryAddress) || '—'}</p></div>

              <div className="space-y-2"><Label htmlFor="instructions">Instruktioner</Label><Textarea id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Gods, vikt, hinder, portkod, kontaktperson, övrigt..." /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="date">Datum och starttid</Label><Input id="date" type="datetime-local" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} required /></div><div className="space-y-2"><Label htmlFor="end">Sluttid</Label><Input id="end" type="datetime-local" value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} /></div></div>
              <div className="space-y-2"><Label>Prioritet</Label><div className="flex gap-2">{(['low', 'normal', 'urgent'] as const).map(p => <label key={p} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${priority === p ? (p === 'urgent' ? 'border-destructive bg-destructive/5' : 'border-primary bg-primary/5') : 'border-border'}`}><input type="radio" name="priority" checked={priority === p} onChange={() => setPriority(p)} className="accent-primary" />{priorityLabels[p]}</label>)}</div></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-2"><Label>Tilldela chaufför</Label><Select value={driverId} onValueChange={setDriverId} required><SelectTrigger><SelectValue placeholder="Välj chaufför" /></SelectTrigger><SelectContent>{(drivers ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Fordon</Label><Select value={vehicleId || 'none'} onValueChange={v => setVehicleId(v === 'none' ? '' : v)}><SelectTrigger><SelectValue placeholder="Inget fordon" /></SelectTrigger><SelectContent><SelectItem value="none">Inget fordon</SelectItem>{(vehicles ?? []).map(v => <SelectItem key={v.id} value={v.id}>{v.name} {v.registration_number ? `(${v.registration_number})` : ''}</SelectItem>)}</SelectContent></Select></div></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="space-y-2"><Label>Beställning</Label><Select value={orderId || 'none'} onValueChange={v => setOrderId(v === 'none' ? '' : v)}><SelectTrigger><SelectValue placeholder="Ingen beställning" /></SelectTrigger><SelectContent><SelectItem value="none">Ingen beställning</SelectItem>{(orders ?? []).filter(o => o.status === 'active').map(o => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="cost">Kostnad / fakturabelopp</Label><Input id="cost" type="number" step="0.01" min="0" value={cost} onChange={e => setCost(e.target.value)} placeholder="T.ex. 1500" /></div></div>
              <div className="space-y-2"><Label htmlFor="comment">Meddelande till chauffören</Label><Textarea id="comment" value={adminComment} onChange={e => setAdminComment(e.target.value)} placeholder="Syns i förarappen..." /></div>
              <div className="border rounded-lg p-4 space-y-3"><p className="text-sm font-medium flex items-center gap-2"><PackageCheck className="h-4 w-4" /> Krav vid slutförande</p><div className="flex items-center justify-between"><Label htmlFor="req-sig" className="cursor-pointer">Kräv mottagarsignatur</Label><Switch id="req-sig" checked={requireSignature} onCheckedChange={setRequireSignature} /></div><div className="flex items-center justify-between"><Label htmlFor="req-photo" className="cursor-pointer">Kräv fraktsedelsfoto</Label><Switch id="req-photo" checked={requirePhoto} onCheckedChange={setRequirePhoto} /></div><div className="flex items-center justify-between"><Label htmlFor="tracking-enabled" className="cursor-pointer">Avisera kund automatiskt</Label><Switch id="tracking-enabled" checked={trackingEnabled} onCheckedChange={setTrackingEnabled} /></div></div>
              <div className="border rounded-lg p-4 space-y-3"><div className="flex items-center justify-between"><Label>Upprepning</Label><Switch checked={recurrenceEnabled} onCheckedChange={setRecurrenceEnabled} /></div>{recurrenceEnabled && <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label>Frekvens</Label><Select value={recurrenceFrequency} onValueChange={v => setRecurrenceFrequency(v as RecurrenceFrequency)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Varje vecka</SelectItem><SelectItem value="biweekly">Varannan vecka</SelectItem><SelectItem value="monthly">Varje månad</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="recurrence-end">Upprepa till och med</Label><Input id="recurrence-end" type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} required={recurrenceEnabled} /></div></div>}</div>
              <div className="flex gap-2 pt-2"><Button type="submit" disabled={isSubmitting || createAssignment.isPending}>{isSubmitting ? 'Skapar...' : 'Skapa uppdrag'}</Button><Button type="button" variant="outline" onClick={() => navigate(-1)}>Avbryt</Button></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

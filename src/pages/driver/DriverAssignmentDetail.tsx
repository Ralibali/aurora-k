import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAssignment, useDriverUpdateAssignment } from '@/hooks/useData';
import { useDriverLocationTracker } from '@/hooks/useDriverLocationTracker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatSwedishDateTime, calculateDuration } from '@/lib/format';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PUBLIC_SITE_URL } from '@/lib/constants';
import DriverExtraWorkCard from '@/features/driver/DriverExtraWorkCard';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  FileSignature,
  FileText,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Play,
  Route,
  Send,
  Truck,
  User,
  type LucideIcon,
} from 'lucide-react';

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  window.open(isIos ? `maps://maps.apple.com/?q=${encoded}` : `https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
}

function openRoute(pickup: string, delivery?: string) {
  if (!delivery) return openMaps(pickup);
  const origin = encodeURIComponent(pickup);
  const destination = encodeURIComponent(delivery);
  window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`, '_blank');
}

function statusLabel(status: string) {
  if (status === 'active') return 'Pågående';
  if (status === 'completed') return 'Slutförd';
  return 'Tilldelad';
}

function statusClass(status: string) {
  if (status === 'active') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (status === 'completed') return 'bg-green-100 text-green-700 border-green-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

function appendEvent(existing: string | null | undefined, label: string, details?: string) {
  const timestamp = new Date().toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
  const row = `[${timestamp}] ${label}${details ? `: ${details}` : ''}`;
  return [existing, row].filter(Boolean).join('\n');
}

type AssignmentWithRelations = NonNullable<ReturnType<typeof useAssignment>['data']>;

function orderNumberOf(a: AssignmentWithRelations) {
  const value = (a as Record<string, unknown>).order_number;
  return typeof value === 'string' ? value : undefined;
}

function shouldNotifyCustomer(a: AssignmentWithRelations) {
  return (
    a?.tracking_enabled !== false &&
    !!a?.tracking_token &&
    !!a?.customer?.email
  );
}

function sendCustomerTrackingEmail(kind: 'tracking-started' | 'delivery-completed', a: AssignmentWithRelations) {
  if (!shouldNotifyCustomer(a)) return;
  const trackingUrl = `${PUBLIC_SITE_URL}/track/${a.tracking_token}`;
  const templateData =
    kind === 'tracking-started'
      ? {
          orderNumber: orderNumberOf(a) ?? a.id?.slice(0, 8)?.toUpperCase(),
          driverName: a.driver?.full_name ?? null,
          assignmentTitle: a.title,
          trackingUrl,
        }
      : {
          orderNumber: orderNumberOf(a) ?? a.id?.slice(0, 8)?.toUpperCase(),
          assignmentTitle: a.title,
          completedAt: new Date().toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }),
          recipientName: a.customer?.name ?? null,
          trackingUrl,
        };
  supabase.functions
    .invoke('send-email', {
      body: { to: a.customer.email, templateName: kind, templateData },
    })
    .catch((err) => console.warn(`[${kind}] send-email failed`, err));
}

function InfoRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 border-b py-3 last:border-0">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}

function AddressButton({ address, label }: { address: string; label: string }) {
  return (
    <button onClick={() => openMaps(address)} className="flex w-full items-start justify-between gap-3 rounded-xl border bg-card p-3 text-left active:scale-[0.99]">
      <span><span className="block text-xs font-semibold uppercase text-muted-foreground">{label}</span><span className="mt-1 block text-sm font-medium text-foreground">{address}</span></span>
      <Navigation className="mt-4 h-4 w-4 shrink-0 text-primary" />
    </button>
  );
}

function SignaturePad({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const hasInk = useRef(Boolean(value));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const snapshot = value;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.floor(180 * dpr);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, 180);
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a';
      if (snapshot) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, 180);
        img.src = snapshot;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [value]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    hasInk.current = true;
  };

  const stop = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && hasInk.current) onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, 180);
    hasInk.current = false;
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border bg-white">
        <canvas
          ref={canvasRef}
          className="block h-[180px] w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={stop}
          onPointerCancel={stop}
          aria-label="Rita mottagarsignatur"
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{value ? 'Signatur fångad.' : 'Be mottagaren skriva sin signatur i rutan.'}</span>
        <Button type="button" size="sm" variant="ghost" onClick={clear}>Rensa</Button>
      </div>
    </div>
  );
}

export default function DriverAssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, companyId } = useAuth();
  const { data: assignment, isLoading } = useAssignment(id);
  const updateAssignment = useDriverUpdateAssignment();
  const [driverComment, setDriverComment] = useState('');
  const [deviationText, setDeviationText] = useState('');
  const [showDeviation, setShowDeviation] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const activeAssignmentId = assignment?.status === 'active' ? assignment.id : undefined;
  useDriverLocationTracker(user?.id, activeAssignmentId, companyId);

  useEffect(() => {
    if (assignment?.driver_comment) setDriverComment(assignment.driver_comment as string);
  }, [assignment?.driver_comment]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-5">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!assignment) return <div className="p-8 text-center text-muted-foreground">Uppdraget hittades inte</div>;

  const a = assignment;
  const pickupAddress = a.pickup_address || assignment.address;
  const deliveryAddress = a.delivery_address || '';
  const isPending = assignment.status === 'pending';
  const isActive = assignment.status === 'active';
  const isCompleted = assignment.status === 'completed';
  const isSignatureRequired = Boolean(a.require_signature);
  const isPhotoRequired = Boolean(a.require_photo);

  const saveDriverComment = (nextComment: string, successText: string) => {
    updateAssignment.mutate({ id: assignment.id, driver_comment: nextComment || null }, { onSuccess: () => toast.success(successText) });
  };

  const handleStart = () => {
    updateAssignment.mutate(
      { id: assignment.id, status: 'active', actual_start: new Date().toISOString(), driver_comment: appendEvent(assignment.driver_comment as string | null, 'Körning startad') },
      { onSuccess: () => sendCustomerTrackingEmail('tracking-started', a) },
    );
  };

  const handleQuickEvent = (label: string) => {
    const next = appendEvent(assignment.driver_comment as string | null, label);
    setDriverComment(next);
    saveDriverComment(next, label);
  };

  const handleDeviation = () => {
    if (!deviationText.trim()) {
      toast.error('Skriv vad som avviker först');
      return;
    }
    const next = appendEvent(assignment.driver_comment as string | null, 'AVVIKELSE', deviationText.trim());
    setDriverComment(next);
    setDeviationText('');
    setShowDeviation(false);
    saveDriverComment(next, 'Avvikelse rapporterad till admin');
  };

  const handleSaveComment = () => saveDriverComment(driverComment, 'Kommentar sparad');

  const uploadSignature = async () => {
    if (a.signature_url && !signatureDataUrl) return a.signature_url as string;
    if (!signatureDataUrl || !user?.id) return null;
    const blob = await (await fetch(signatureDataUrl)).blob();
    const path = `${user.id}/${assignment.id}/signature-${Date.now()}.png`;
    const { error } = await supabase.storage.from('consignment-notes').upload(path, blob, { contentType: 'image/png', upsert: true });
    if (error) throw error;
    const { data } = await supabase.storage.from('consignment-notes').createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl ?? null;
  };

  const completeAssignment = (photoUrl?: string | null, signatureUrl?: string | null) => {
    updateAssignment.mutate(
      {
        id: assignment.id,
        status: 'completed',
        actual_stop: new Date().toISOString(),
        consignment_photo_url: photoUrl ?? a.consignment_photo_url ?? null,
        signature_url: signatureUrl ?? a.signature_url ?? null,
        driver_comment: appendEvent(assignment.driver_comment as string | null, 'Uppdrag slutfört'),
      },
      { onSuccess: () => sendCustomerTrackingEmail('delivery-completed', a) },
    );
  };

  const finalizeCompletion = async (photoUrl?: string | null) => {
    if (isPhotoRequired && !photoUrl && !a.consignment_photo_url) {
      toast.error('Det här uppdraget kräver fraktsedelsfoto innan slutförande.');
      return;
    }
    if (isSignatureRequired && !signatureDataUrl && !a.signature_url) {
      toast.error('Det här uppdraget kräver mottagarsignatur innan slutförande.');
      return;
    }
    try {
      const signatureUrl = await uploadSignature();
      completeAssignment(photoUrl, signatureUrl);
    } catch {
      toast.error('Kunde inte ladda upp signaturen. Försök igen.');
    }
  };

  const handleTakePhotoAndComplete = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !user?.id) return finalizeCompletion(null);
      const extension = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${assignment.id}/${Date.now()}.${extension}`;
      const { error } = await supabase.storage.from('consignment-notes').upload(path, file, { upsert: true });
      if (error) {
        toast.error(isPhotoRequired ? 'Kunde inte ladda upp foto. Försök igen.' : 'Kunde inte ladda upp foto. Uppdraget slutförs utan foto.');
        if (!isPhotoRequired) return finalizeCompletion(null);
        return;
      }
      const { data } = await supabase.storage.from('consignment-notes').createSignedUrl(path, 60 * 60 * 24 * 365);
      await finalizeCompletion(data?.signedUrl ?? null);
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Tillbaka" className="flex h-11 w-11 items-center justify-center rounded-full bg-muted active:scale-95"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{assignment.title}</p>
            <p className="font-mono text-xs text-muted-foreground">#{assignment.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <Badge variant="outline" className={statusClass(assignment.status)}>{statusLabel(assignment.status)}</Badge>
        </div>
      </div>

      <main className="space-y-5 p-5">
        <Card className="overflow-hidden">
          <CardHeader className="bg-slate-950 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl"><Truck className="h-5 w-5" /> Ditt uppdrag</CardTitle>
                <p className="mt-1 text-sm text-slate-300">{formatSwedishDateTime(assignment.scheduled_start)}{assignment.scheduled_end ? ` – ${formatSwedishDateTime(assignment.scheduled_end)}` : ''}</p>
              </div>
              {a.service_type && <Badge className="bg-white/15 text-white hover:bg-white/15">{a.service_type}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-4 py-4">
            <InfoRow icon={User} label="Kund">{assignment.customer?.name || 'Ej angiven'}</InfoRow>
            <div className="space-y-2">
              <AddressButton label="Hämta" address={pickupAddress} />
              {deliveryAddress && <AddressButton label="Lämna" address={deliveryAddress} />}
              <Button type="button" variant="outline" onClick={() => openRoute(pickupAddress, deliveryAddress)} className="h-12 w-full">
                <Route className="mr-2 h-4 w-4" /> Öppna rutt i karta
              </Button>
            </div>
            {assignment.instructions && <InfoRow icon={FileText} label="Instruktioner">{assignment.instructions}</InfoRow>}
            {(a.vehicle || a.vehicle_id) && <InfoRow icon={Package} label="Fordon">{[a.vehicle?.name, a.vehicle?.registration_number].filter(Boolean).join(' · ') || a.vehicle_id}</InfoRow>}
            {assignment.actual_start && <InfoRow icon={Clock} label="Startad">{formatSwedishDateTime(assignment.actual_start)}</InfoRow>}
            {assignment.actual_start && assignment.actual_stop && <InfoRow icon={CheckCircle2} label="Varaktighet">{calculateDuration(assignment.actual_start, assignment.actual_stop)}</InfoRow>}
          </CardContent>
        </Card>

        {assignment.admin_comment && (
          <Card className="border-blue-200 bg-blue-50"><CardContent className="p-4"><p className="text-xs font-semibold uppercase text-blue-700">Meddelande från admin</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{assignment.admin_comment}</p></CardContent></Card>
        )}

        {!isCompleted && (
          <Card>
            <CardHeader><CardTitle className="text-base">Snabbstatus till admin</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => handleQuickEvent('På väg till uppdraget')} disabled={updateAssignment.isPending}>Jag är på väg</Button>
              <Button variant="outline" onClick={() => handleQuickEvent('Framme på plats')} disabled={updateAssignment.isPending}>Jag är framme</Button>
              <Button variant="outline" onClick={() => handleQuickEvent('Lastning/lossning pågår')} disabled={updateAssignment.isPending}>Påbörjat arbete</Button>
              <Button variant="outline" onClick={() => setShowDeviation(v => !v)} className="border-amber-300 text-amber-700"><AlertTriangle className="mr-2 h-4 w-4" /> Rapportera avvikelse</Button>
            </CardContent>
          </Card>
        )}

        {showDeviation && (
          <Card className="border-amber-200 bg-amber-50"><CardContent className="space-y-3 p-4"><p className="font-semibold text-amber-800">Vad har hänt?</p><Textarea value={deviationText} onChange={e => setDeviationText(e.target.value)} placeholder="T.ex. kund ej på plats, fel adress, gods saknas, skada upptäckt..." /><Button onClick={handleDeviation} disabled={updateAssignment.isPending} className="w-full">Skicka avvikelse</Button></CardContent></Card>
        )}

        {isActive && isSignatureRequired && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileSignature className="h-4 w-4" /> Mottagarsignatur krävs</CardTitle></CardHeader>
            <CardContent><SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} /></CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" /> Förarkommentar</CardTitle></CardHeader>
          <CardContent className="space-y-3"><Textarea rows={6} value={driverComment} onChange={e => setDriverComment(e.target.value)} placeholder="Skriv anteckning, status eller information till admin..." /><Button variant="outline" onClick={handleSaveComment} disabled={updateAssignment.isPending} className="w-full"><Send className="mr-2 h-4 w-4" /> Spara kommentar</Button></CardContent>
        </Card>

        <DriverExtraWorkCard assignmentId={assignment.id} companyId={companyId} readOnly={isCompleted} />

        {isCompleted && (
          <Card className="border-green-200 bg-green-50"><CardContent className="space-y-3 p-5 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-green-600" /><p className="text-lg font-bold text-green-900">Uppdraget är slutfört</p>{assignment.actual_start && assignment.actual_stop && <p className="text-sm text-green-800">Tid: {calculateDuration(assignment.actual_start, assignment.actual_stop)}</p>}{a.consignment_photo_url && <img src={a.consignment_photo_url} alt="Fraktsedel" className="mx-auto mt-3 max-w-xs rounded-xl border bg-white" />}{a.signature_url && <img src={a.signature_url} alt="Mottagarsignatur" className="mx-auto mt-3 max-w-xs rounded-xl border bg-white p-3" />}</CardContent></Card>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-5 py-3 backdrop-blur" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        {isPending && <Button onClick={handleStart} disabled={updateAssignment.isPending} className="h-14 w-full text-base"><Play className="mr-2 h-5 w-5" /> Starta körning</Button>}
        {isActive && <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={handleTakePhotoAndComplete} disabled={updateAssignment.isPending} className="h-14"><Camera className="mr-2 h-5 w-5" /> Foto & klar</Button><Button onClick={() => finalizeCompletion(null)} disabled={updateAssignment.isPending} className="h-14 bg-green-600 hover:bg-green-700"><CheckCircle2 className="mr-2 h-5 w-5" /> Slutför</Button></div>}
        {isCompleted && <Button variant="outline" onClick={() => navigate('/driver/assignments')} className="h-14 w-full">Till mina uppdrag</Button>}
      </div>
    </div>
  );
}

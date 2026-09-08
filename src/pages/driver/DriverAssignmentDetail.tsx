import AssignmentDeviations from '@/components/AssignmentDeviations';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAssignment, useDriverUpdateAssignment } from '@/hooks/useData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatSwedishDateTime, calculateDuration } from '@/lib/format';
import { toast } from 'sonner';
import { driverAssignmentPath } from '@/features/driver/assignment-flow';
import { StatusBadge } from '@/components/StatusBadge';
import DriverExtraWorkCard from '@/features/driver/DriverExtraWorkCard';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  Navigation,
  Package,
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

function appendEvent(existing: string | null | undefined, label: string, details?: string) {
  const timestamp = new Date().toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
  const row = `[${timestamp}] ${label}${details ? `: ${details}` : ''}`;
  return [existing, row].filter(Boolean).join('\n');
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

export default function DriverAssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { companyId } = useAuth();
  const location = useLocation();
  const { data: assignment, isLoading } = useAssignment(id);
  const updateAssignment = useDriverUpdateAssignment();
  const [driverComment, setDriverComment] = useState('');
  useEffect(() => {
    if (id && location.pathname.startsWith('/driver/assignment/')) navigate(`${driverAssignmentPath(id)}${location.search}${location.hash}`, { replace: true });
  }, [id, location.pathname, location.search, location.hash, navigate]);

  useEffect(() => {
    setDriverComment(assignment?.driver_comment ?? '');
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
  const isCompleted = assignment.status === 'completed';
  const isClosed = isCompleted || assignment.status === 'cancelled';

  const saveDriverComment = (nextComment: string, successText: string) => {
    updateAssignment.mutate({ id: assignment.id, driver_comment: nextComment }, { onSuccess: () => toast.success(successText) });
  };

  const handleQuickEvent = (label: string) => {
    const next = appendEvent(assignment.driver_comment as string | null, label);
    setDriverComment(next);
    saveDriverComment(next, label);
  };

  const handleSaveComment = () => saveDriverComment(driverComment, 'Kommentar sparad');

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="sticky top-0 z-20 border-b bg-background/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/driver/assignments')} aria-label="Tillbaka" className="flex h-11 w-11 items-center justify-center rounded-full bg-muted active:scale-95"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{assignment.title}</p>
            <p className="font-mono text-xs text-muted-foreground">#{assignment.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <StatusBadge status={assignment.status} />
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

        {!isClosed && (
          <Card>
            <CardHeader><CardTitle className="text-base">Snabbstatus till admin</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" onClick={() => handleQuickEvent('På väg till uppdraget')} disabled={updateAssignment.isPending}>Jag är på väg</Button>
              <Button variant="outline" onClick={() => handleQuickEvent('Framme på plats')} disabled={updateAssignment.isPending}>Jag är framme</Button>
              <Button variant="outline" onClick={() => handleQuickEvent('Lastning/lossning pågår')} disabled={updateAssignment.isPending}>Påbörjat arbete</Button>
            </CardContent>
          </Card>
        )}

        <AssignmentDeviations assignmentId={assignment.id} legacyComment={assignment.driver_comment} />

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" /> Förarkommentar</CardTitle></CardHeader>
          <CardContent className="space-y-3"><Textarea rows={6} value={driverComment} onChange={e => setDriverComment(e.target.value)} placeholder="Skriv anteckning, status eller information till admin..." /><Button variant="outline" onClick={handleSaveComment} disabled={updateAssignment.isPending} className="w-full"><Send className="mr-2 h-4 w-4" /> Spara kommentar</Button></CardContent>
        </Card>

        <DriverExtraWorkCard assignmentId={assignment.id} companyId={companyId} customerId={assignment.customer_id} readOnly={isClosed} />

        {isCompleted && (
          <Card className="border-green-200 bg-green-50"><CardContent className="space-y-3 p-5 text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-green-600" /><p className="text-lg font-bold text-green-900">Uppdraget är slutfört</p>{assignment.actual_start && assignment.actual_stop && <p className="text-sm text-green-800">Tid: {calculateDuration(assignment.actual_start, assignment.actual_stop)}</p>}{a.consignment_photo_url && <img src={a.consignment_photo_url} alt="Fraktsedel" className="mx-auto mt-3 max-w-xs rounded-xl border bg-white" />}{a.signature_url && <img src={a.signature_url} alt="Mottagarsignatur" className="mx-auto mt-3 max-w-xs rounded-xl border bg-white p-3" />}</CardContent></Card>
        )}
      </main>
    </div>
  );
}

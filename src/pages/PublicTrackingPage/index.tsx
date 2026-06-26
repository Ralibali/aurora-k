import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, MapPin, Navigation, Phone, RefreshCw, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type TrackingData = {
  assignment: { title: string; status: string; scheduledStart: string; scheduledEnd: string | null; actualStart: string | null; actualStop: string | null; pickupAddress: string; deliveryAddress: string | null; customerName: string | null };
  driver: { firstName: string; phone: string | null } | null;
  location: { latitude: number; longitude: number; heading: number | null; speed: number | null; updatedAt: string } | null;
};

const labels: Record<string, string> = { pending: 'Planerad', active: 'Pågående transport', completed: 'Levererad', delayed: 'Försenad', cancelled: 'Avbruten' };

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
}

function Step({ title, done, active, time }: { title: string; done: boolean; active?: boolean; time?: string | null }) {
  return <div className="flex gap-3"><div className="flex flex-col items-center"><div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${done ? 'border-green-600 bg-green-600 text-white' : active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 bg-white text-slate-400'}`}>{done ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-3.5 w-3.5" />}</div><div className="min-h-8 w-0.5 flex-1 bg-slate-200" /></div><div className="pb-5"><p className={`font-semibold ${done || active ? 'text-slate-950' : 'text-slate-400'}`}>{title}</p>{time && <p className="mt-0.5 text-xs text-slate-500">{formatDate(time)}</p>}</div></div>;
}

export default function PublicTrackingPage() {
  const token = window.location.pathname.split('/').filter(Boolean).pop() || '';
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    const projectUrl = import.meta.env.VITE_SUPABASE_URL;
    const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    try {
      const response = await fetch(`${projectUrl}/functions/v1/track-assignment?token=${encodeURIComponent(token)}`, {
        cache: 'no-store',
        headers: { apikey: publicKey, Authorization: `Bearer ${publicKey}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Spårningen kunde inte laddas');
      setData(payload);
      setError('');
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Spårningen kunde inte laddas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 20000);
    return () => window.clearInterval(interval);
  }, [load]);

  if (loading) return <div className="min-h-screen bg-slate-50 p-5"><div className="mx-auto max-w-xl space-y-4 pt-12"><Skeleton className="h-16 w-full" /><Skeleton className="h-72 w-full" /></div></div>;
  if (error || !data) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-5"><Card className="max-w-md"><CardContent className="p-8 text-center"><MapPin className="mx-auto mb-3 h-10 w-10 text-slate-300" /><h1 className="font-bold">Spårningen är inte tillgänglig</h1><p className="mt-2 text-sm text-muted-foreground">{error}</p></CardContent></Card></div>;

  const { assignment, driver, location } = data;
  const active = assignment.status === 'active' || assignment.status === 'delayed';
  const completed = assignment.status === 'completed';
  const mapsUrl = location ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}` : '';

  return <div className="min-h-screen bg-slate-50">
    <header className="bg-slate-950 px-5 py-8 text-white"><div className="mx-auto max-w-xl"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600"><Truck className="h-5 w-5" /></div><div><p className="text-sm text-slate-400">Aurora Transport</p><h1 className="text-xl font-bold">Följ din transport</h1></div></div></div></header>
    <main className="mx-auto max-w-xl space-y-4 p-5">
      <Card><CardContent className="space-y-5 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{assignment.customerName || 'Transportuppdrag'}</p><h2 className="mt-1 text-xl font-bold">{assignment.title}</h2></div><Badge>{labels[assignment.status] || assignment.status}</Badge></div><div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /><span><strong>Från:</strong> {assignment.pickupAddress}</span></p>{assignment.deliveryAddress && <p className="mt-2 flex gap-2"><Navigation className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /><span><strong>Till:</strong> {assignment.deliveryAddress}</span></p>}</div><div><Step title="Transport planerad" done={active || completed} active={!active && !completed} time={assignment.scheduledStart} /><Step title="Chauffören är på väg" done={completed} active={active} time={assignment.actualStart} /><Step title="Levererad" done={completed} time={assignment.actualStop} /></div></CardContent></Card>
      {active && <Card className="border-blue-200 bg-blue-50"><CardContent className="space-y-3 p-5"><div className="flex items-center justify-between"><div><p className="font-semibold text-blue-950">{driver?.firstName || 'Chauffören'} är på väg</p><p className="text-sm text-blue-800">{location ? `Senast uppdaterad ${new Date(location.updatedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}` : 'Aktuell position saknas'}</p></div><RefreshCw className={`h-5 w-5 text-blue-700 ${refreshing ? 'animate-spin' : ''}`} /></div>{location && <Button asChild className="w-full"><a href={mapsUrl} target="_blank" rel="noreferrer"><MapPin className="mr-2 h-4 w-4" />Visa senaste position</a></Button>}{driver?.phone && <Button asChild variant="outline" className="w-full bg-white"><a href={`tel:${driver.phone}`}><Phone className="mr-2 h-4 w-4" />Ring {driver.firstName}</a></Button>}</CardContent></Card>}
      <Button variant="ghost" className="w-full" disabled={refreshing} onClick={() => void load(true)}><RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Uppdatera status</Button>
      <p className="pb-6 text-center text-xs text-slate-400">Position visas endast under ett aktivt uppdrag och uppdateras automatiskt.</p>
    </main>
  </div>;
}

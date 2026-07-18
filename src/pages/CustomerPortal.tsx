import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePageMeta } from '@/lib/use-page-meta';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, ShoppingCart, Receipt, Building2, CalendarPlus, MessageCircle, Clock, MapPin, Route, AlertTriangle, CheckCircle2, FileSignature, Camera, ExternalLink } from 'lucide-react';
import { BookingRequestForm } from '@/components/portal/BookingRequestForm';
import { PortalChat } from '@/components/portal/PortalChat';
import { PortalInvoiceDownloadButton } from '@/components/portal/PortalInvoiceDownloadButton';

interface PortalCustomer { id: string; name: string; email?: string | null; phone?: string | null; }
interface PortalAssignment {
  id: string; title: string; status: string; scheduled_start?: string; scheduled_end?: string | null;
  actual_start?: string | null; actual_stop?: string | null;
  pickup_address?: string | null; delivery_address?: string | null; address?: string | null;
  service_type?: string | null; priority?: string | null; tracking_token?: string | null;
  consignment_photo_url?: string | null; signature_url?: string | null;
  require_photo?: boolean | null; require_signature?: boolean | null;
  driver?: { full_name?: string | null } | null;
}
interface PortalOrder { id: string; order_number: string; title: string; status: string; }
interface PortalInvoice {
  id: string; invoice_number: number; invoice_date: string; due_date: string;
  total_inc_vat?: number; status: string; lines?: unknown; assignment_ids?: string[];
  total_ex_vat?: number; vat_amount?: number; reference?: string | null; message?: string | null;
}
interface PortalBooking { id: string; title?: string; preferred_date?: string | null; status?: string; [key: string]: unknown; }
interface PortalSettings {
  company_name: string; org_number: string | null; address: string | null; zip_city: string | null;
  email: string | null; phone: string | null; bankgiro: string | null; plusgiro: string | null; vat_number: string | null;
}
interface PortalData {
  customer?: PortalCustomer;
  settings?: PortalSettings | null;
  assignments?: PortalAssignment[];
  orders?: PortalOrder[];
  invoices?: PortalInvoice[];
  bookings?: PortalBooking[];
}

const statusLabels: Record<string, string> = {
  pending: 'Väntande', active: 'Aktiv', in_progress: 'Pågår', completed: 'Slutförd',
  cancelled: 'Avbruten', draft: 'Utkast', sent: 'Skickad', paid: 'Betald', overdue: 'Förfallen',
};

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (s === 'completed' || s === 'paid') return 'secondary';
  if (s === 'cancelled' || s === 'overdue') return 'destructive';
  if (s === 'active' || s === 'in_progress' || s === 'sent') return 'default';
  return 'outline';
};

function routeText(a: PortalAssignment) {
  if (a.pickup_address && a.delivery_address) return `${a.pickup_address} → ${a.delivery_address}`;
  return a.pickup_address || a.delivery_address || a.address || 'Adress saknas';
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('sv-SE', { dateStyle: 'medium', timeStyle: 'short' });
}

function hasDeliveryProof(a: PortalAssignment) {
  return Boolean(a.actual_stop || a.consignment_photo_url || a.signature_url);
}

function DeliveryProofCard({ assignment }: { assignment: PortalAssignment }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/40">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">{assignment.title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{routeText(assignment)}</p>
          </div>
          <Badge variant={statusVariant(assignment.status)}>{statusLabels[assignment.status] || assignment.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Planerad</p><p className="mt-1 text-sm font-medium">{formatDateTime(assignment.scheduled_start)}</p></div>
          <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Slutförd</p><p className="mt-1 text-sm font-medium">{formatDateTime(assignment.actual_stop)}</p></div>
          <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Förare</p><p className="mt-1 text-sm font-medium">{assignment.driver?.full_name || '—'}</p></div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Camera className="h-4 w-4" /> Fraktsedel / foto</div>
            {assignment.consignment_photo_url ? (
              <a href={assignment.consignment_photo_url} target="_blank" rel="noreferrer" className="block">
                <img src={assignment.consignment_photo_url} alt="Fraktsedelsfoto" className="max-h-72 w-full rounded-lg border object-contain" />
              </a>
            ) : <p className="text-sm text-muted-foreground">Inget foto uppladdat.</p>}
          </div>
          <div className="rounded-xl border bg-white p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><FileSignature className="h-4 w-4" /> Mottagarsignatur</div>
            {assignment.signature_url ? (
              <a href={assignment.signature_url} target="_blank" rel="noreferrer" className="block">
                <img src={assignment.signature_url} alt="Mottagarsignatur" className="max-h-72 w-full rounded-lg border bg-white object-contain p-3" />
              </a>
            ) : <p className="text-sm text-muted-foreground">Ingen signatur registrerad.</p>}
          </div>
        </div>

        {assignment.tracking_token && (
          <Button asChild variant="outline" size="sm">
            <a href={`/track/${assignment.tracking_token}`} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Öppna spårningssida</a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function CustomerPortal() {
  usePageMeta({ title: 'Kundportal | Aurora Transport', description: '', canonical: 'https://auroratransport.se/portal', noindex: true });
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setError('Ingen åtkomsttoken angiven'); setLoading(false); return; }

    const fetchData = async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/customer-portal?token=${encodeURIComponent(token)}`, { headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Kunde inte ladda data');
        setLoading(false);
        return;
      }
      setData(await res.json());
      setLoading(false);
    };

    fetchData();
  }, [token]);

  const assignments: PortalAssignment[] = useMemo(() => data?.assignments ?? [], [data]);
  const invoices: PortalInvoice[] = useMemo(() => data?.invoices ?? [], [data]);
  const orders: PortalOrder[] = useMemo(() => data?.orders ?? [], [data]);
  const bookings: PortalBooking[] = useMemo(() => data?.bookings ?? [], [data]);
  const customer: PortalCustomer | undefined = data?.customer;
  const settings = data?.settings;

  const stats = useMemo(() => {
    const activeAssignments = assignments.filter((a) => ['pending', 'active', 'in_progress'].includes(a.status)).length;
    const completedAssignments = assignments.filter((a) => a.status === 'completed').length;
    const openInvoices = invoices.filter((i) => ['draft', 'sent', 'overdue'].includes(i.status)).length;
    const overdue = invoices.filter((i) => i.status === 'overdue').length;
    return { activeAssignments, completedAssignments, openInvoices, overdue };
  }, [assignments, invoices]);

  const nextAssignment = useMemo(() => {
    return [...assignments]
      .filter((a) => a.status !== 'completed' && a.status !== 'cancelled')
      .sort((a, b) => String(a.scheduled_start).localeCompare(String(b.scheduled_start)))[0];
  }, [assignments]);

  const proofAssignments = useMemo(() => assignments.filter((a) => a.status === 'completed' && hasDeliveryProof(a)), [assignments]);

  const handleBookingCreated = useCallback((booking: PortalBooking) => {
    setData((prev: PortalData | null) => prev ? { ...prev, bookings: [booking, ...(prev.bookings || [])] } : prev);
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 p-6"><div className="max-w-6xl mx-auto space-y-4"><Skeleton className="h-12 w-64 bg-white/10" /><Skeleton className="h-96 w-full bg-white/10" /></div></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md"><CardContent className="pt-6 text-center"><AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" /><p className="text-destructive font-medium">{error}</p><p className="text-sm text-muted-foreground mt-2">Kontakta oss om problemet kvarstår.</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.28),_transparent_32%)]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-blue-100"><Building2 className="h-4 w-4" /> Kundportal</div>
              <h1 className="mt-4 text-3xl font-bold md:text-5xl">{customer?.name}</h1>
              <p className="mt-2 max-w-2xl text-slate-300">Följ uppdrag, se status, hämta fakturor, se leveransbevis och skicka nya transportförfrågningar på ett ställe.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="secondary"><Link to={`/boka/aurora-transport`} target="_blank"><CalendarPlus className="mr-2 h-4 w-4" /> Ny bokning</Link></Button>
              <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => navigator.clipboard?.writeText(window.location.href)}>Kopiera portallänk</Button>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-slate-300">Aktiva uppdrag</p><p className="mt-1 text-3xl font-bold">{stats.activeAssignments}</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-slate-300">Slutförda</p><p className="mt-1 text-3xl font-bold">{stats.completedAssignments}</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-slate-300">Öppna fakturor</p><p className="mt-1 text-3xl font-bold">{stats.openInvoices}</p></div>
            <div className="rounded-2xl bg-white/10 p-4"><p className="text-sm text-slate-300">Förfallna</p><p className="mt-1 text-3xl font-bold">{stats.overdue}</p></div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 text-slate-950">
        {nextAssignment && (
          <Card className="mb-5 border-blue-200 bg-blue-50">
            <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700">Nästa uppdrag</p>
                <h2 className="text-xl font-bold">{nextAssignment.title}</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" /> {formatDateTime(nextAssignment.scheduled_start)}</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><Route className="h-4 w-4" /> {routeText(nextAssignment)}</p>
              </div>
              <Badge variant={statusVariant(nextAssignment.status)}>{statusLabels[nextAssignment.status] || nextAssignment.status}</Badge>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="assignments" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="assignments" className="gap-1"><ClipboardList className="h-3.5 w-3.5" /> Uppdrag</TabsTrigger>
            <TabsTrigger value="proof" className="gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Leveransbevis</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1"><ShoppingCart className="h-3.5 w-3.5" /> Beställningar</TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1"><Receipt className="h-3.5 w-3.5" /> Fakturor</TabsTrigger>
            <TabsTrigger value="booking" className="gap-1"><CalendarPlus className="h-3.5 w-3.5" /> Ny förfrågan</TabsTrigger>
            <TabsTrigger value="chat" className="gap-1"><MessageCircle className="h-3.5 w-3.5" /> Chatt</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Uppdrag</TableHead><TableHead>Rutt</TableHead><TableHead>Planerat</TableHead><TableHead>Status</TableHead><TableHead>Bevis</TableHead></TableRow></TableHeader><TableBody>{assignments.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Inga uppdrag</TableCell></TableRow>}{assignments.map((a) => <TableRow key={a.id}><TableCell><div className="font-medium">{a.title}</div>{a.service_type && <Badge variant="outline" className="mt-1">{a.service_type}</Badge>}</TableCell><TableCell className="max-w-[420px]"><div className="flex gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /><span>{routeText(a)}</span></div></TableCell><TableCell>{formatDateTime(a.scheduled_start)}</TableCell><TableCell><Badge variant={statusVariant(a.status)}>{statusLabels[a.status] || a.status}</Badge></TableCell><TableCell>{hasDeliveryProof(a) ? <Badge variant="secondary">Finns</Badge> : <span className="text-sm text-muted-foreground">—</span>}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
          </TabsContent>

          <TabsContent value="proof">
            <div className="space-y-4">
              {proofAssignments.length === 0 ? <Card><CardContent className="py-10 text-center text-muted-foreground">Inga leveransbevis finns ännu.</CardContent></Card> : proofAssignments.map((assignment) => <DeliveryProofCard key={assignment.id} assignment={assignment} />)}
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Beställning</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{orders.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Inga beställningar</TableCell></TableRow>}{orders.map((o) => <TableRow key={o.id}><TableCell className="font-mono text-xs">{o.order_number}</TableCell><TableCell className="font-medium">{o.title}</TableCell><TableCell><Badge variant={statusVariant(o.status)}>{statusLabels[o.status] || o.status}</Badge></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Fakturanr</TableHead><TableHead>Datum</TableHead><TableHead>Förfallodatum</TableHead><TableHead className="text-right">Belopp</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>{invoices.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Inga fakturor</TableCell></TableRow>}{invoices.map((inv) => <TableRow key={inv.id}><TableCell className="font-medium">#{inv.invoice_number}</TableCell><TableCell>{inv.invoice_date}</TableCell><TableCell>{inv.due_date}</TableCell><TableCell className="text-right font-mono">{inv.total_inc_vat?.toFixed(0)} kr</TableCell><TableCell><Badge variant={statusVariant(inv.status)}>{statusLabels[inv.status] || inv.status}</Badge></TableCell><TableCell className="text-right"><PortalInvoiceDownloadButton invoice={{ ...inv, customer }} assignments={assignments} settings={settings} /></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
          </TabsContent>

          <TabsContent value="booking"><BookingRequestForm token={token!} bookings={bookings} onCreated={handleBookingCreated} /></TabsContent>
          <TabsContent value="chat"><PortalChat token={token!} customerName={customer?.name || 'Kund'} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

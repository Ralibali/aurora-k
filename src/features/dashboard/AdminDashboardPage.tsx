import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, CalendarDays, CheckCircle2, Clock, Inbox, MapPin, Plus, Route, ShieldCheck, Sparkles, TrendingUp, Users, Wallet } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { AttentionQueue } from '@/features/dashboard/AttentionQueue';
import { buildAttentionItems } from '@/features/dashboard/attention-items';
import { useAssignments, useDrivers, useInvoices } from '@/hooks/useData';

type AssignmentRow = NonNullable<ReturnType<typeof useAssignments>['data']>[number];
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoAssignments, demoActivity, demoKpis, type DemoAssignment } from '@/lib/demo-data';
import { calculateDecimalHours, formatSwedishTime } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

type ActivityItem = {
  key: string;
  text: string;
  time: string;
};

function startOfDayIso(date = new Date()) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 10) return 'God morgon';
  if (hour < 17) return 'Hej';
  if (hour < 22) return 'God kväll';
  return 'God natt';
}

function Kpi({ icon: Icon, value, label, loading, helper }: { icon: typeof Briefcase; value: string | number; label: string; loading: boolean; helper?: string }) {
  return (
    <div className="stat-card group">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div>
          {loading ? <Skeleton className="h-8 w-20 rounded-lg" /> : <p className="stat-card-value">{value}</p>}
          <p className="stat-card-label mt-1">{label}</p>
          {helper && <p className="mt-2 text-xs text-muted-foreground">{helper}</p>}
        </div>
        <div className="stat-card-icon bg-primary/10 text-primary transition-transform group-hover:scale-105"><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  );
}

function TrustStrip() {
  const items = [
    { icon: ShieldCheck, title: 'Svenskt arbetsflöde', text: 'Planering, förare och fakturering i samma vy.' },
    { icon: CheckCircle2, title: 'Tydliga beslut', text: 'Fokus på avvikelser, ofakturerat och dagens uppdrag.' },
    { icon: Route, title: 'Mindre friktion', text: 'Snabbvägar till det som faktiskt driver intäkter.' },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map(({ icon: Icon, title, text }) => (
        <div key={title} className="nordic-card flex items-start gap-3 p-4">
          <div className="rounded-2xl bg-success/10 p-2 text-success"><Icon className="h-4 w-4" /></div>
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { enabled: demoOn } = useDemoMode();
  const { data: realAssignments, isLoading } = useAssignments();
  const { data: drivers } = useDrivers();
  const { data: invoices } = useInvoices();
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel(`dashboard-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => queryClient.invalidateQueries({ queryKey: ['assignments'] }))
      .subscribe(status => setIsLive(status === 'SUBSCRIBED'));
    return () => { void supabase.removeChannel(channel); };
  }, [queryClient]);

  const assignments = useMemo<(DemoAssignment | AssignmentRow)[]>(
    () => (demoOn ? demoAssignments : (realAssignments ?? [])),
    [demoOn, realAssignments]
  );
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartIso = startOfDayIso(weekStart);

  const todayAssignments = useMemo(() => assignments.filter(item => item.scheduled_start?.startsWith(today)), [assignments, today]);
  const completedWeek = useMemo(() => assignments.filter(item => item.status === 'completed' && item.actual_start && item.actual_stop && item.actual_start >= weekStartIso), [assignments, weekStartIso]);
  const reportedHours = completedWeek.reduce((sum, item) => sum + calculateDecimalHours(item.actual_start!, item.actual_stop!), 0);
  const invoiceable = assignments
    .filter(item => item.status === 'completed' && !item.invoiced)
    .reduce((sum, item) => {
      const hours = item.actual_start && item.actual_stop ? calculateDecimalHours(item.actual_start, item.actual_stop) : 0;
      if (Number(item.cost ?? 0) > 0) return sum + Number(item.cost);
      if (item.customer?.pricing_type === 'per_delivery') return sum + Number(item.customer.price_per_delivery ?? 0);
      if (item.customer?.pricing_type === 'per_hour') return sum + hours * Number(item.customer.price_per_hour ?? 0);
      return sum;
    }, 0);

  const activeCount = demoOn ? demoKpis.activeAssignments : todayAssignments.filter(item => ['pending', 'active', 'delayed'].includes(item.status)).length;
  const availableDrivers = demoOn ? demoKpis.availableDrivers : (drivers ?? []).filter(item => item.is_available).length;
  const displayedHours = demoOn ? demoKpis.reportedHoursWeek : reportedHours;
  const displayedInvoiceable = demoOn ? demoKpis.invoiceableAmount : invoiceable;
  const attentionItems = demoOn ? [] : buildAttentionItems(assignments, invoices ?? []);
  const conversionScore = Math.min(100, Math.round((Number(Boolean(assignments.length)) * 25) + (Number(Boolean(drivers?.length)) * 25) + (Number(displayedInvoiceable > 0) * 25) + (Number(Boolean(todayAssignments.length)) * 25)));

  const liveJobs = [...todayAssignments].sort((a, b) => {
    const order: Record<string, number> = { active: 0, delayed: 1, pending: 2, completed: 3 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.scheduled_start.localeCompare(b.scheduled_start);
  });

  const activity: ActivityItem[] = demoOn
    ? demoActivity.map(item => ({
      key: item.key,
      text: `${item.driver} ${item.action} ${item.title}`,
      time: item.time,
    }))
    : assignments
      .flatMap(item => {
        const rows: ActivityItem[] = [];
        if (item.actual_start?.startsWith(today)) rows.push({ key: `${item.id}-start`, text: `${item.driver?.full_name ?? 'Förare'} startade ${item.title}`, time: formatSwedishTime(item.actual_start) });
        if (item.actual_stop?.startsWith(today)) rows.push({ key: `${item.id}-stop`, text: `${item.driver?.full_name ?? 'Förare'} slutförde ${item.title}`, time: formatSwedishTime(item.actual_stop) });
        return rows;
      })
      .slice(-10)
      .reverse();

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? 'där';
  const topFocus = attentionItems[0]?.title ?? (displayedInvoiceable > 0 ? 'Fakturera slutförda uppdrag' : 'Skapa nästa uppdrag');
  const topFocusText = attentionItems[0]?.description ?? (displayedInvoiceable > 0 ? 'Det finns intäkter som kan bli faktura direkt.' : 'Ett tydligt första uppdrag gör adminen mer levande för kunden.');

  return (
    <AdminLayout title="Dashboard" description="Nordisk kontrollpanel för dagens transportflöde">
      <div className="space-y-6">
        <section className="nordic-card-premium overflow-hidden p-5 md:p-7">
          <div className="grid gap-6 lg:grid-cols-[1.55fr_0.9fr] lg:items-center">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="nordic-trust-pill"><Sparkles className="h-3.5 w-3.5 text-primary" /> Nordisk adminupplevelse</span>
                {isLive && <span className="nordic-trust-pill"><span className="h-2 w-2 rounded-full bg-success" /> Realtidsdata aktiv</span>}
              </div>
              <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{greeting()}, {firstName}. Här är läget just nu.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">Dashboarden prioriterar det som bygger förtroende: avvikelser först, dagens uppdrag tydligt och snabb väg från utfört arbete till faktura.</p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Button size="lg" asChild className="rounded-full shadow-sm"><Link to="/admin/assignments/new"><Plus className="mr-2 h-4 w-4" /> Skapa uppdrag</Link></Button>
                <Button size="lg" variant="outline" asChild className="rounded-full bg-white/60 dark:bg-white/5"><Link to="/admin/booking-requests">Se bokningsförfrågningar <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              </div>
            </div>
            <div className="rounded-3xl border bg-gradient-to-br from-white/90 to-accent/60 p-5 shadow-sm dark:from-white/10 dark:to-accent/20">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Dagens fokus</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{topFocus}</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary"><TrendingUp className="h-5 w-5" /></div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{topFocusText}</p>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground"><span>Adminmognad</span><span className="font-mono-ui">{conversionScore}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${conversionScore}%` }} /></div>
              </div>
            </div>
          </div>
        </section>

        <TrustStrip />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={Briefcase} value={activeCount} label="Aktiva uppdrag idag" loading={isLoading} helper="Dagens körningar" />
          <Kpi icon={Users} value={availableDrivers} label="Lediga förare" loading={isLoading} helper="Redo att tilldelas" />
          <Kpi icon={Clock} value={`${displayedHours.toFixed(1)} h`} label="Rapporterade timmar" loading={isLoading} helper="Senaste 7 dagarna" />
          <Kpi icon={Wallet} value={`${Math.round(displayedInvoiceable).toLocaleString('sv-SE')} kr`} label="Ofakturerat värde" loading={isLoading} helper="Kan bli intäkt" />
        </div>

        <AttentionQueue items={attentionItems} />

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="space-y-3 lg:col-span-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Dagens uppdrag</h3>
                <p className="text-xs text-muted-foreground">Klicka in där du behöver agera.</p>
              </div>
              <Button size="sm" asChild className="rounded-full"><Link to="/admin/assignments/new"><Plus className="mr-1 h-4 w-4" /> Nytt uppdrag</Link></Button>
            </div>
            {liveJobs.length === 0 ? (
              <div className="nordic-card-premium border-dashed p-10 text-center">
                <Inbox className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                <p className="font-semibold">Inga uppdrag idag</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Visa aktivitet direkt genom att lägga upp nästa uppdrag eller öppna kalendern för att planera veckan.</p>
                <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                  <Button asChild className="rounded-full"><Link to="/admin/assignments/new"><Plus className="mr-1 h-4 w-4" /> Skapa uppdrag</Link></Button>
                  <Button variant="outline" asChild className="rounded-full bg-white/60 dark:bg-white/5"><Link to="/admin/calendar"><CalendarDays className="mr-1 h-4 w-4" /> Öppna kalender</Link></Button>
                </div>
              </div>
            ) : liveJobs.map(item => (
              <Link key={item.id} to={demoOn ? '#' : `/admin/assignments/${item.id}`} className="nordic-card flex items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.customer?.name ?? item.title}</p>
                  <p className="text-xs text-muted-foreground">{formatSwedishTime(item.scheduled_start)} · {item.driver?.full_name ?? 'Ej tilldelad'}</p>
                </div>
                <StatusBadge status={item.status} />
              </Link>
            ))}
            <Button variant="ghost" size="sm" asChild className="rounded-full"><Link to="/admin/assignments">Visa alla <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </section>

          <section className="space-y-3 lg:col-span-2">
            <div>
              <h3 className="font-semibold">Aktivitetsflöde</h3>
              <p className="text-xs text-muted-foreground">Senaste händelserna idag.</p>
            </div>
            <div className="nordic-card divide-y overflow-hidden">
              {activity.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Ingen aktivitet idag.</p> : activity.map(item => <div key={item.key} className="flex items-start justify-between gap-3 p-4 text-sm"><p>{item.text}</p><span className="shrink-0 font-mono-ui text-xs text-muted-foreground">{item.time}</span></div>)}
            </div>
            <div className="grid grid-cols-2 gap-2"><Button variant="outline" size="sm" asChild className="rounded-full bg-white/60 dark:bg-white/5"><Link to="/admin/live-map"><MapPin className="mr-1 h-4 w-4" /> Live-karta</Link></Button><Button variant="outline" size="sm" asChild className="rounded-full bg-white/60 dark:bg-white/5"><Link to="/admin/reports"><Clock className="mr-1 h-4 w-4" /> Tidrapporter</Link></Button></div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

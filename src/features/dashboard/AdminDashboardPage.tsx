import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowRight, CalendarDays, CheckCheck, Clock3, Inbox, MapPin, Plus, RefreshCw, Route, Truck, UserRound, Users, Wallet } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { AttentionQueue } from '@/features/dashboard/AttentionQueue';
import { buildAttentionItems } from '@/features/dashboard/attention-items';
import { formatStockholmTime, getStockholmDateKey, matchesDispatchFilter } from '@/features/dispatch/dispatch-utils';
import { useAssignments, useDrivers, useInvoices } from '@/hooks/useData';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoAssignments, demoDrivers, demoInvoices, type DemoAssignment } from '@/lib/demo-data';
import { calculateDecimalHours } from '@/lib/format';
import { cn } from '@/lib/utils';

type AssignmentRow = NonNullable<ReturnType<typeof useAssignments>['data']>[number];
type ActivityItem = { key: string; title: string; driver: string; timestamp: string; completed: boolean; assignmentId: string };

const dateLabel = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Stockholm', weekday: 'long', day: 'numeric', month: 'long' });
const demoRows = demoAssignments.map(item => ({
  ...item,
  assigned_driver_id: item.assigned_driver_id ?? demoDrivers.find(driver => driver.full_name === item.driver?.full_name)?.id ?? null,
}));

function Kpi({ icon: Icon, value, label, detail, href, loading, warning = false }: {
  icon: typeof Truck;
  value: string | number;
  label: string;
  detail: string;
  href: string;
  loading: boolean;
  warning?: boolean;
}) {
  return (
    <Link to={href} className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <Card className="h-full rounded-xl p-4 shadow-none transition-colors group-hover:border-primary/40 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <span className={cn('rounded-lg p-2', warning ? 'bg-warning/10 text-amber-700 dark:text-amber-400' : 'bg-primary/5 text-primary')}><Icon className="h-4 w-4" /></span>
        </div>
        {loading ? <Skeleton className="mt-2 h-9 w-16" /> : <p className="mt-2 font-mono-ui text-3xl font-semibold tracking-tight tabular-nums">{value}</p>}
        <p className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">{detail}<ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" /></p>
      </Card>
    </Link>
  );
}

export default function AdminDashboardPage() {
  const { enabled: demoOn } = useDemoMode();
  const assignmentQuery = useAssignments();
  const driverQuery = useDrivers();
  const invoiceQuery = useInvoices();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const assignments = useMemo<(DemoAssignment | AssignmentRow)[]>(
    () => demoOn ? demoRows : assignmentQuery.data ?? [],
    [demoOn, assignmentQuery.data],
  );
  const drivers = demoOn ? demoDrivers : driverQuery.data ?? [];
  const today = getStockholmDateKey(now);
  const todayHref = `/admin/assignments?date=${today}`;
  const loading = !demoOn && assignmentQuery.isLoading;
  const failed = !demoOn && assignmentQuery.isError;
  const refreshing = !demoOn && (assignmentQuery.isFetching || driverQuery.isFetching || invoiceQuery.isFetching);
  const incomplete = !demoOn && (assignmentQuery.isError || invoiceQuery.isError);
  const todayAssignments = useMemo(() => assignments.filter(item => getStockholmDateKey(item.scheduled_start) === today), [assignments, today]);
  const attentionItems = buildAttentionItems(assignments, demoOn ? demoInvoices : invoiceQuery.data ?? [], now);
  const unassignedCount = assignments.filter(item => matchesDispatchFilter(item, 'unassigned', now)).length;
  const urgentCount = assignments.filter(item => matchesDispatchFilter(item, 'urgent', now)).length;
  const activeCount = todayAssignments.filter(item => item.status === 'active').length;
  const completedCount = todayAssignments.filter(item => item.status === 'completed').length;
  const plannedCount = todayAssignments.filter(item => ['pending', 'unassigned'].includes(item.status)).length;
  const delayedCount = todayAssignments.filter(item => item.status === 'delayed').length;
  const dayTotal = todayAssignments.filter(item => item.status !== 'cancelled').length;
  const completionPercent = dayTotal ? Math.round(completedCount / dayTotal * 100) : 0;
  const weekStart = new Date(`${today}T12:00:00Z`);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  const weekStartKey = getStockholmDateKey(weekStart);
  const reportedHours = assignments.filter(item => item.status === 'completed' && item.actual_start && item.actual_stop && getStockholmDateKey(item.actual_stop) >= weekStartKey && getStockholmDateKey(item.actual_stop) <= today)
    .reduce((sum, item) => sum + Math.max(0, calculateDecimalHours(item.actual_start!, item.actual_stop!)), 0);
  const invoiceable = assignments.filter(item => item.status === 'completed' && !item.invoiced)
    .reduce((sum, item) => {
      const hours = item.actual_start && item.actual_stop ? Math.max(0, calculateDecimalHours(item.actual_start, item.actual_stop)) : 0;
      if (Number(item.cost ?? 0) > 0) return sum + Number(item.cost);
      if (item.customer?.pricing_type === 'per_delivery') return sum + Number(item.customer.price_per_delivery ?? 0);
      if (item.customer?.pricing_type === 'per_hour') return sum + hours * Number(item.customer.price_per_hour ?? 0);
      return sum;
    }, 0);
  const availableDrivers = drivers.filter(item => item.is_available).length;
  const todaysJobs = [...todayAssignments].sort((a, b) => {
    const order: Record<string, number> = { delayed: 0, active: 1, pending: 2, unassigned: 2, completed: 3, cancelled: 4 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.scheduled_start.localeCompare(b.scheduled_start);
  });
  const activity = assignments.flatMap(item => {
    const rows: ActivityItem[] = [];
    if (item.actual_start && getStockholmDateKey(item.actual_start) === today) rows.push({ key: `${item.id}-start`, title: item.title, driver: item.driver?.full_name ?? 'Förare', timestamp: item.actual_start, completed: false, assignmentId: item.id });
    if (item.actual_stop && getStockholmDateKey(item.actual_stop) === today) rows.push({ key: `${item.id}-stop`, title: item.title, driver: item.driver?.full_name ?? 'Förare', timestamp: item.actual_stop, completed: true, assignmentId: item.id });
    return rows;
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6);
  const refresh = () => {
    void assignmentQuery.refetch();
    void driverQuery.refetch();
    void invoiceQuery.refetch();
    setNow(new Date());
  };

  return (
    <AdminLayout title="Transportöversikt" description="Planera dagen. Fånga avvikelser. Håll transporterna i rörelse.">
      <div className="space-y-6">
        <Card className="overflow-hidden rounded-2xl border-primary/15 bg-primary/[0.035] p-5 shadow-none sm:p-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <p className="flex flex-wrap items-center gap-2 text-xs font-medium text-primary"><Route className="h-4 w-4" /><span className="capitalize">{dateLabel.format(now)}</span><span className="text-muted-foreground">· Svensk tid</span>{demoOn && <span className="rounded-full border border-primary/20 px-2 py-0.5">Demodata</span>}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Din dag. Under kontroll.</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">Alla transporter, tilldelningar och avvikelser samlade. Börja med det som behöver dig.</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <Button asChild><Link to={todayHref}>Öppna dispatch <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
              <Button variant="outline" asChild><Link to="/admin/assignments/new"><Plus className="mr-2 h-4 w-4" />Nytt uppdrag</Link></Button>
            </div>
          </div>
        </Card>

        {!demoOn && (assignmentQuery.isError || driverQuery.isError || invoiceQuery.isError) && (
          <Card role="alert" className="flex flex-wrap items-center gap-3 border-destructive/30 p-4 shadow-none">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="flex-1 text-sm">{failed ? 'Uppdragen kunde inte hämtas.' : 'En del uppgifter kunde inte hämtas. Översikten är inte komplett.'}</p>
            <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>Försök igen</Button>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi icon={Truck} value={failed ? '–' : activeCount} label="På väg just nu" detail="Dagens pågående transporter" href={`${todayHref}&filter=active`} loading={loading} />
          <Kpi icon={UserRound} value={failed ? '–' : unassignedCount} label="Saknar chaufför" detail="Tilldela bland alla datum" href="/admin/assignments?filter=unassigned&date=all" loading={loading} warning={unassignedCount > 0} />
          <Kpi icon={AlertTriangle} value={failed ? '–' : urgentCount} label="Hög prioritet" detail="Öppna uppdrag att prioritera" href="/admin/assignments?filter=urgent&date=all" loading={loading} warning={urgentCount > 0} />
          <Kpi icon={CheckCheck} value={failed ? '–' : completedCount} label="Slutförda idag" detail={loading || failed ? 'Dagens planerade transporter' : `Av ${dayTotal} planerade transporter`} href={`${todayHref}&filter=completed`} loading={loading} />
        </div>

        <AttentionQueue items={attentionItems} loading={loading || (!demoOn && invoiceQuery.isLoading)} incomplete={incomplete} />

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <Card className="min-w-0 overflow-hidden rounded-xl shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
              <div><h2 className="font-semibold">Dagens transporter</h2><p className="mt-1 text-xs text-muted-foreground">Försenade först, därefter pågående och planerade.</p></div>
              <Button variant="ghost" size="sm" asChild><Link to={todayHref}>Visa alla <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            </div>
            {loading ? <div className="space-y-4 p-5" aria-label="Laddar dagens transporter">{[0, 1, 2].map(index => <Skeleton key={index} className="h-14" />)}</div> : failed ? <p className="p-6 text-sm text-muted-foreground">Transporterna visas när uppgifterna har hämtats.</p> : todaysJobs.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-10 text-center">
                <span className="rounded-xl bg-muted p-3"><Inbox className="h-6 w-6 text-muted-foreground" /></span>
                <h3 className="mt-4 text-sm font-semibold">Dagen är öppen för nya uppdrag</h3>
                <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">Skapa en transport eller öppna kalendern för att planera kommande dagar.</p>
                <Button variant="outline" size="sm" asChild className="mt-4"><Link to="/admin/calendar"><CalendarDays className="mr-2 h-4 w-4" />Öppna kalendern</Link></Button>
              </div>
            ) : (
              <div className="divide-y">
                {todaysJobs.slice(0, 8).map(item => (
                  <Link key={item.id} to={demoOn ? todayHref : `/admin/assignments/${item.id}`} className="group flex items-start gap-3 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5">
                    <div className="w-11 shrink-0 pt-0.5 text-center"><p className="font-mono-ui text-sm font-semibold tabular-nums">{formatStockholmTime(item.scheduled_start)}</p><p className="mt-1 text-[10px] text-muted-foreground">Start</p></div>
                    <div className="min-w-0 flex-1 border-l pl-3">
                      <div className="flex flex-wrap items-center justify-between gap-2"><p className="truncate text-sm font-semibold group-hover:text-primary">{item.title}</p><StatusBadge status={matchesDispatchFilter(item, 'unassigned', now) ? 'unassigned' : item.status} /></div>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{item.customer?.name ?? 'Ingen kund angiven'}</p>
                      {(item.pickup_address || item.delivery_address || item.address) && <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{[item.pickup_address, item.delivery_address].filter(Boolean).join(' → ') || item.address}</span></p>}
                      <p className={cn('mt-2 flex items-center gap-1.5 text-xs', item.driver?.full_name ? 'text-muted-foreground' : 'font-medium text-amber-700 dark:text-amber-400')}><UserRound className="h-3 w-3" />{item.driver?.full_name ?? 'Väntar på chaufför'}</p>
                    </div>
                  </Link>
                ))}
                {todaysJobs.length > 8 && <Button variant="ghost" className="w-full rounded-none" asChild><Link to={todayHref}>Visa ytterligare {todaysJobs.length - 8} transporter <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>}
              </div>
            )}
          </Card>

          <div className="space-y-5">
            <Card className="rounded-xl p-5 shadow-none">
              <h2 className="text-sm font-semibold">Dagens framsteg</h2>
              {loading ? <Skeleton className="mt-4 h-16" /> : failed ? <p className="mt-3 text-xs text-muted-foreground">Väntar på uppdragsdata.</p> : (
                <>
                  <div className="mt-4 flex items-baseline justify-between gap-2"><p className="text-xs text-muted-foreground">{completedCount} av {dayTotal} slutförda</p><span className="font-mono-ui text-xl font-semibold tabular-nums">{completionPercent}%</span></div>
                  <div role="progressbar" aria-label="Slutförda transporter idag" aria-valuenow={completionPercent} aria-valuemin={0} aria-valuemax={100} className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-success transition-all" style={{ width: `${completionPercent}%` }} /></div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs"><span className="text-muted-foreground">Planerade <strong className="mt-1 block font-mono-ui text-base font-medium text-foreground">{plannedCount}</strong></span><span className="text-muted-foreground">Pågående <strong className="mt-1 block font-mono-ui text-base font-medium text-foreground">{activeCount}</strong></span><span className="text-muted-foreground">Försenade <strong className="mt-1 block font-mono-ui text-base font-medium text-foreground">{delayedCount}</strong></span></div>
                </>
              )}
            </Card>
            <Card className="overflow-hidden rounded-xl shadow-none">
              <div className="flex items-center gap-2 border-b p-4"><Activity className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Senaste aktivitet idag</h2></div>
              {loading ? <div className="space-y-3 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div> : failed ? <p className="p-4 text-xs text-muted-foreground">Aktiviteten kunde inte hämtas.</p> : activity.length === 0 ? <p className="p-5 text-xs leading-relaxed text-muted-foreground">Här visas dagens registrerade starter och slutförda transporter.</p> : <div className="divide-y">{activity.map(item => <Link key={item.key} to={demoOn ? todayHref : `/admin/assignments/${item.assignmentId}`} className="flex items-start gap-3 p-4 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className={cn('mt-0.5 rounded-full p-1.5', item.completed ? 'bg-success/10 text-success' : 'bg-primary/5 text-primary')}>{item.completed ? <CheckCheck className="h-3 w-3" /> : <Truck className="h-3 w-3" />}</span><div className="min-w-0 flex-1"><p className="text-xs"><span className="font-medium">{item.driver}</span> {item.completed ? 'slutförde' : 'startade'}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.title}</p></div><time dateTime={item.timestamp} className="font-mono-ui text-[11px] tabular-nums text-muted-foreground">{formatStockholmTime(item.timestamp)}</time></Link>)}</div>}
            </Card>
          </div>
        </div>

        <Card className="grid gap-0 overflow-hidden rounded-xl shadow-none sm:grid-cols-3">
          <Link to="/admin/drivers" className="flex items-center gap-3 border-b p-4 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:border-b-0 sm:border-r"><Users className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Tillgängliga chaufförer</p><p className="mt-1 text-sm font-semibold">{!demoOn && (driverQuery.isLoading || driverQuery.isError) ? '–' : `${availableDrivers} av ${drivers.length} markerade lediga`}</p></div><ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" /></Link>
          <Link to="/admin/reports" className="flex items-center gap-3 border-b p-4 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:border-b-0 sm:border-r"><Clock3 className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Rapporterad tid · 7 dagar</p><p className="mt-1 text-sm font-semibold">{loading || failed ? '–' : `${reportedHours.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} timmar`}</p></div><ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" /></Link>
          <Link to="/admin/invoices" className="flex items-center gap-3 p-4 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><Wallet className="h-4 w-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Ofakturerat · beräknat värde</p><p className="mt-1 text-sm font-semibold">{loading || failed ? '–' : `${Math.round(invoiceable).toLocaleString('sv-SE')} kr`}</p></div><ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" /></Link>
        </Card>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><p>{demoOn ? 'Du visar exempeldata i demoläge.' : assignmentQuery.dataUpdatedAt ? `Uppdrag hämtade ${formatStockholmTime(new Date(assignmentQuery.dataUpdatedAt))} · Europe/Stockholm` : 'Uppdrag hämtas från din verksamhet.'}</p><Button variant="ghost" size="sm" onClick={refresh} disabled={refreshing || demoOn}><RefreshCw className={cn('mr-2 h-3.5 w-3.5', refreshing && 'animate-spin')} />Uppdatera</Button></div>
      </div>
    </AdminLayout>
  );
}

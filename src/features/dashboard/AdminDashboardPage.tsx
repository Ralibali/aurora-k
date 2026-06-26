import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Users, Clock, Wallet, Plus, CalendarDays, MapPin, ArrowRight, Inbox } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { AttentionQueue } from '@/features/dashboard/AttentionQueue';
import { buildAttentionItems } from '@/features/dashboard/attention-items';
import { useAssignments, useDrivers, useInvoices } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoAssignments, demoActivity, demoKpis } from '@/lib/demo-data';
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

function Kpi({ icon: Icon, value, label, loading }: { icon: typeof Briefcase; value: string | number; label: string; loading: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>{loading ? <Skeleton className="h-8 w-20" /> : <p className="font-mono text-2xl font-bold">{value}</p>}<p className="mt-1 text-xs text-muted-foreground">{label}</p></div>
        <div className="rounded-lg bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary" /></div>
      </div>
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

  const assignments = demoOn ? demoAssignments : (realAssignments ?? []);
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

  return (
    <AdminLayout title="Dashboard" description="Översikt över dagens transportverksamhet">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-2xl font-semibold">{greeting()}, {firstName}</h2><p className="text-sm text-muted-foreground">Börja med avvikelserna nedan — resten av verksamheten flyter på.</p></div>
          {isLive && <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-green-500" /> Realtidsdata</span>}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={Briefcase} value={activeCount} label="Aktiva uppdrag idag" loading={isLoading} />
          <Kpi icon={Users} value={availableDrivers} label="Lediga förare" loading={isLoading} />
          <Kpi icon={Clock} value={`${displayedHours.toFixed(1)} h`} label="Rapporterade timmar, 7 dagar" loading={isLoading} />
          <Kpi icon={Wallet} value={`${Math.round(displayedInvoiceable).toLocaleString('sv-SE')} kr`} label="Slutfört och ofakturerat" loading={isLoading} />
        </div>

        <AttentionQueue items={attentionItems} />

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="space-y-3 lg:col-span-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">Dagens uppdrag</h3><Button size="sm" asChild><Link to="/admin/assignments/new"><Plus className="mr-1 h-4 w-4" /> Nytt uppdrag</Link></Button></div>
            {liveJobs.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center"><Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">Inga uppdrag idag</p><Button className="mt-4" variant="outline" asChild><Link to="/admin/calendar"><CalendarDays className="mr-1 h-4 w-4" /> Öppna kalender</Link></Button></div>
            ) : liveJobs.map(item => (
              <Link key={item.id} to={demoOn ? '#' : `/admin/assignments/${item.id}`} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 hover:border-primary/40">
                <div className="min-w-0"><p className="truncate font-semibold">{item.customer?.name ?? item.title}</p><p className="text-xs text-muted-foreground">{formatSwedishTime(item.scheduled_start)} · {item.driver?.full_name ?? 'Ej tilldelad'}</p></div><StatusBadge status={item.status} />
              </Link>
            ))}
            <Button variant="ghost" size="sm" asChild><Link to="/admin/assignments">Visa alla <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
          </section>

          <section className="space-y-3 lg:col-span-2">
            <h3 className="font-semibold">Aktivitetsflöde</h3>
            <div className="divide-y rounded-xl border bg-card">
              {activity.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">Ingen aktivitet idag.</p> : activity.map(item => <div key={item.key} className="flex items-start justify-between gap-3 p-3 text-sm"><p>{item.text}</p><span className="shrink-0 font-mono text-xs text-muted-foreground">{item.time}</span></div>)}
            </div>
            <div className="grid grid-cols-2 gap-2"><Button variant="outline" size="sm" asChild><Link to="/admin/live-map"><MapPin className="mr-1 h-4 w-4" /> Live-karta</Link></Button><Button variant="outline" size="sm" asChild><Link to="/admin/reports"><Clock className="mr-1 h-4 w-4" /> Tidrapporter</Link></Button></div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

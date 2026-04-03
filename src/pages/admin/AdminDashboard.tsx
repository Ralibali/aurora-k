import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { useAssignments, useDrivers } from '@/hooks/useData';
import { formatSwedishDateTime, formatSwedishTime } from '@/lib/format';
import {
  Briefcase, Users, Truck, AlertCircle, Plus, ArrowRight,
  MapPin, Clock, ChevronRight, ClipboardList, Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/* ── Elapsed timer ── */
function ElapsedSince({ since }: { since: string }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const update = () => {
      const ms = Date.now() - new Date(since).getTime();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setText(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [since]);
  return <span className="font-mono text-xs text-muted-foreground">{text}</span>;
}

/* ── KPI Card ── */
function KpiCard({ icon: Icon, value, label, trend, iconBg, iconColor, isLoading }: {
  icon: typeof Briefcase;
  value: number | string;
  label: string;
  trend?: string;
  iconBg: string;
  iconColor: string;
  isLoading: boolean;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          {isLoading ? (
            <Skeleton className="h-8 w-16 mb-1" />
          ) : (
            <p className="text-2xl font-bold tracking-tight text-foreground font-mono">{value}</p>
          )}
          <p className="text-xs text-muted-foreground font-medium mt-1">{label}</p>
        </div>
        <div className={`rounded-md p-2 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      {trend && !isLoading && (
        <p className="text-xs text-muted-foreground mt-3">{trend}</p>
      )}
    </div>
  );
}

/* ── Color bar for status ── */
function statusBarColor(status: string) {
  switch (status) {
    case 'pending': return 'bg-blue-500';
    case 'active': return 'bg-green-500';
    case 'delayed': return 'bg-amber-500';
    case 'completed': return 'bg-slate-300';
    default: return 'bg-slate-300';
  }
}

/* ── Dashboard ── */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: assignments, isLoading } = useAssignments();
  const { data: drivers } = useDrivers();
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const channelName = `dashboard-realtime-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['assignments'] });
      })
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const today = new Date().toISOString().split('T')[0];

  const todayAssignments = useMemo(() =>
    (assignments ?? []).filter(a => a.scheduled_start.startsWith(today)),
    [assignments, today]
  );

  const activeCount = todayAssignments.filter(a => a.status === 'active' || a.status === 'pending').length;
  const activeRunning = todayAssignments.filter(a => a.status === 'active').length;
  const completed = todayAssignments.filter(a => a.status === 'completed').length;
  const availableDrivers = (drivers ?? []).filter(d => d.is_available).length;

  // "Not time reported" — completed but no actual_stop
  const notReported = todayAssignments.filter(a => a.status === 'completed' && !a.actual_stop).length;

  // Activity feed
  const activityItems = useMemo(() => {
    const items: { key: string; driver: string; title: string; action: string; time: string; sortTime: number; isComplete: boolean }[] = [];
    (assignments ?? []).forEach(a => {
      if (a.actual_start?.startsWith(today)) {
        items.push({
          key: `${a.id}-start`, driver: a.driver?.full_name ?? 'Okänd',
          title: `${a.customer?.name ?? ''} — ${a.title}`, action: 'startade',
          time: formatSwedishTime(a.actual_start), sortTime: new Date(a.actual_start).getTime(), isComplete: false,
        });
      }
      if (a.actual_stop?.startsWith(today)) {
        items.push({
          key: `${a.id}-stop`, driver: a.driver?.full_name ?? 'Okänd',
          title: `${a.customer?.name ?? ''} — ${a.title}`, action: 'slutförde',
          time: formatSwedishTime(a.actual_stop), sortTime: new Date(a.actual_stop).getTime(), isComplete: true,
        });
      }
    });
    items.sort((a, b) => b.sortTime - a.sortTime);
    return items.slice(0, 12);
  }, [assignments, today]);

  // Today's assignments sorted
  const liveJobs = useMemo(() =>
    todayAssignments
      .sort((a, b) => {
        const order: Record<string, number> = { active: 0, pending: 1, delayed: 2, completed: 3 };
        const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
        return diff !== 0 ? diff : a.scheduled_start.localeCompare(b.scheduled_start);
      }),
    [todayAssignments]
  );

  return (
    <AdminLayout title="Dashboard" description="Översikt över dagens aktivitet">
      <div className="space-y-6">
        {/* Live indicator */}
        {isLive && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span>Realtidsdata</span>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Briefcase}
            value={activeCount}
            label="Aktiva uppdrag"
            trend={`↑ ${todayAssignments.length} totalt idag`}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            isLoading={isLoading}
          />
          <KpiCard
            icon={Users}
            value={availableDrivers}
            label="Tillgängliga chaufförer"
            trend={`${(drivers ?? []).length} registrerade`}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            isLoading={isLoading}
          />
          <KpiCard
            icon={Truck}
            value={activeRunning}
            label="Pågående körningar"
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            isLoading={isLoading}
          />
          <KpiCard
            icon={AlertCircle}
            value={notReported}
            label="Ej tidrapporterade"
            iconBg="bg-red-50"
            iconColor="text-red-600"
            isLoading={isLoading}
          />
        </div>

        {/* Main content: jobs + activity */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT — Today's assignments */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Dagens uppdrag</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/assignments">Visa alla <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/admin/assignments/new"><Plus className="h-3.5 w-3.5 mr-1" /> Nytt</Link>
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-[72px] w-full rounded-lg" />)}
              </div>
            ) : liveJobs.length === 0 ? (
              <div className="bg-card rounded-lg border border-dashed border-border p-10 text-center shadow-card">
                <Inbox className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Inga uppdrag idag</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Skapa ett uppdrag för att komma igång</p>
                <Button size="sm" className="mt-4" asChild>
                  <Link to="/admin/assignments/new"><Plus className="h-3.5 w-3.5 mr-1" /> Skapa uppdrag</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {liveJobs.map(a => (
                  <Link key={a.id} to={`/admin/assignments/${a.id}`} className="block group">
                    <div className="flex items-stretch bg-card rounded-lg border border-border hover:border-blue-200 transition-colors duration-100 overflow-hidden shadow-card">
                      {/* Color bar */}
                      <div className={`w-1 shrink-0 ${statusBarColor(a.status)}`} />

                      <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-muted-foreground">{a.id.slice(0, 6).toUpperCase()}</span>
                            <span className="text-sm font-semibold text-foreground truncate">{a.customer?.name}</span>
                            {a.priority !== 'normal' && <PriorityBadge priority={a.priority} />}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {a.driver && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-[9px] font-bold text-blue-700">
                                    {a.driver.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground">{a.driver.full_name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span className="font-mono text-[11px]">{formatSwedishTime(a.scheduled_start)}</span>
                            </div>
                            {a.actual_start && a.status === 'active' && (
                              <ElapsedSince since={a.actual_start} />
                            )}
                          </div>
                        </div>

                        {/* Badge + chevron */}
                        <StatusBadge status={a.status} />
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Activity feed */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Aktivitetsflöde</h2>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ) : activityItems.length === 0 ? (
              <div className="bg-card rounded-lg border border-dashed border-border p-10 text-center shadow-card">
                <Clock className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Ingen aktivitet ännu idag</p>
              </div>
            ) : (
              <div className="bg-card rounded-lg border border-border shadow-card divide-y divide-border">
                {activityItems.map(item => (
                  <div key={item.key} className="flex items-start gap-3 px-4 py-3">
                    <div className="mt-1.5 shrink-0">
                      <span className={`block h-2 w-2 rounded-full ${item.isComplete ? 'bg-green-500' : 'bg-amber-500'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs leading-relaxed">
                        <span className="font-medium text-foreground">{item.driver}</span>
                        <span className="text-muted-foreground"> {item.action} </span>
                        <span className="text-muted-foreground">{item.title}</span>
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-0.5">{item.time}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button variant="outline" size="sm" className="justify-start text-xs" asChild>
                <Link to="/admin/live-map"><MapPin className="h-3.5 w-3.5 mr-1.5" /> Live-karta</Link>
              </Button>
              <Button variant="outline" size="sm" className="justify-start text-xs" asChild>
                <Link to="/admin/reports"><Clock className="h-3.5 w-3.5 mr-1.5" /> Tidrapporter</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

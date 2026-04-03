import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { useAssignments, useDrivers } from '@/hooks/useData';
import { formatSwedishDateTime, formatSwedishTime } from '@/lib/format';
import { ClipboardList, CheckCircle2, Loader2, Plus, TrendingUp, ArrowRight, Wifi, MapPin, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

function StatCard({ icon: Icon, value, label, trend, color, isLoading }: {
  icon: typeof ClipboardList;
  value: number | string;
  label: string;
  trend?: string;
  color: string;
  isLoading: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          {isLoading ? <Skeleton className="h-8 w-16 mb-1" /> : <p className="stat-card-value">{value}</p>}
          <p className="stat-card-label mt-1">{label}</p>
        </div>
        <div className={`stat-card-icon ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && !isLoading && (
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}

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
  const completed = todayAssignments.filter(a => a.status === 'completed').length;
  const active = todayAssignments.filter(a => a.status === 'active').length;
  const pending = todayAssignments.filter(a => a.status === 'pending').length;
  const availableDrivers = (drivers ?? []).filter(d => d.is_available).length;

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
    return items.slice(0, 10);
  }, [assignments, today]);

  // Active assignments for the live job list
  const liveJobs = useMemo(() =>
    todayAssignments
      .filter(a => a.status !== 'completed')
      .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start)),
    [todayAssignments]
  );

  return (
    <AdminLayout title="Dashboard" description="Översikt över dagens aktivitet">
      <div className="space-y-6">
        {/* Live indicator */}
        {isLive && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span>Realtidsdata</span>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ClipboardList} value={active + pending} label="Aktiva uppdrag" color="bg-primary/10 text-primary" isLoading={isLoading} trend={`${todayAssignments.length} totalt idag`} />
          <StatCard icon={Users} value={availableDrivers} label="Tillgängliga" color="bg-success/10 text-success" isLoading={isLoading} trend={`${(drivers ?? []).length} registrerade`} />
          <StatCard icon={Loader2} value={active} label="Pågående" color="bg-warning/10 text-warning" isLoading={isLoading} />
          <StatCard icon={CheckCircle2} value={completed} label="Slutförda" color="bg-muted text-muted-foreground" isLoading={isLoading} />
        </div>

        {/* Split layout: job list + activity feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Job list — 55% */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Dagens uppdrag</h2>
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
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : liveJobs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                  <ClipboardList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm font-medium text-muted-foreground">Inga aktiva uppdrag</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Skapa ett uppdrag för att komma igång</p>
                  <Button size="sm" className="mt-4" asChild>
                    <Link to="/admin/assignments/new"><Plus className="h-3.5 w-3.5 mr-1" /> Skapa uppdrag</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-1.5">
                {liveJobs.map(a => (
                  <Link key={a.id} to={`/admin/assignments/${a.id}`} className="block group">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border bg-card hover:bg-primary/[0.02] hover:border-primary/20 transition-colors duration-100 group-hover:translate-x-0.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-muted-foreground">{a.id.slice(0, 6).toUpperCase()}</span>
                          <span className="text-sm font-medium truncate">{a.customer?.name}</span>
                          {a.priority !== 'normal' && <PriorityBadge priority={a.priority} />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {a.driver && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-primary">{a.driver.full_name.split(' ').map(n => n[0]).join('')}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{a.driver.full_name}</span>
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="font-mono text-[11px] text-muted-foreground">{formatSwedishTime(a.scheduled_start)}</span>
                          {a.actual_start && a.status === 'active' && (
                            <>
                              <span className="text-xs text-muted-foreground">·</span>
                              <ElapsedSince since={a.actual_start} />
                            </>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Activity feed — 45% */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-sm font-semibold">Aktivitet</h2>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ) : activityItems.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                  <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Ingen aktivitet ännu idag</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-0.5">
                {activityItems.map(item => (
                  <div key={item.key} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors duration-100">
                    <div className="mt-1.5 shrink-0">
                      <span className={`block h-2 w-2 rounded-full ${item.isComplete ? 'bg-success' : 'bg-warning'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs">
                        <span className="font-medium">{item.driver}</span>
                        <span className="text-muted-foreground"> {item.action} </span>
                        <span className="text-muted-foreground truncate">{item.title}</span>
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-2 pt-2">
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

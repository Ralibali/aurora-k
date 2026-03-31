import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { useAssignments } from '@/hooks/useData';
import { formatSwedishDateTime, formatSwedishTime } from '@/lib/format';
import { ClipboardList, CheckCircle2, Loader2, Plus, TrendingUp, ArrowRight, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

function StatCard({ icon: Icon, value, label, color, isLoading }: {
  icon: typeof ClipboardList;
  value: number;
  label: string;
  color: string;
  isLoading: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-4">
        <div className={`stat-card-icon ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          {isLoading ? <Skeleton className="h-8 w-14" /> : <p className="stat-card-value">{value}</p>}
          <p className="stat-card-label">{label}</p>
        </div>
      </div>
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
      setText(h > 0 ? `${h}h ${m}min` : `${m}min`);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [since]);
  return <span className="text-xs font-mono text-muted-foreground">{text}</span>;
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { data: assignments, isLoading } = useAssignments();
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'assignments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['assignments'] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'assignments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['assignments'] });
      })
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const today = new Date().toISOString().split('T')[0];
  const todayAssignments = (assignments ?? []).filter(a =>
    a.scheduled_start.startsWith(today)
  );
  const completed = todayAssignments.filter(a => a.status === 'completed').length;
  const active = todayAssignments.filter(a => a.status === 'active').length;
  const pending = todayAssignments.filter(a => a.status === 'pending').length;

  // Activity feed: assignments with actual_start or actual_stop today
  const activityItems: { key: string; driver: string; title: string; action: string; time: string; sortTime: number }[] = [];
  (assignments ?? []).forEach(a => {
    if (a.actual_start?.startsWith(today)) {
      activityItems.push({
        key: `${a.id}-start`,
        driver: a.driver?.full_name ?? 'Okänd',
        title: `${a.customer?.name ?? ''} ${a.title}`,
        action: 'startade',
        time: formatSwedishTime(a.actual_start),
        sortTime: new Date(a.actual_start).getTime(),
      });
    }
    if (a.actual_stop?.startsWith(today)) {
      activityItems.push({
        key: `${a.id}-stop`,
        driver: a.driver?.full_name ?? 'Okänd',
        title: `${a.customer?.name ?? ''} ${a.title}`,
        action: 'slutförde',
        time: formatSwedishTime(a.actual_stop),
        sortTime: new Date(a.actual_stop).getTime(),
      });
    }
  });
  activityItems.sort((a, b) => b.sortTime - a.sortTime);
  const recentActivity = activityItems.slice(0, 8);

  // Active assignments
  const activeAssignments = (assignments ?? []).filter(a => a.status === 'active' && a.actual_start);

  return (
    <AdminLayout title="Dashboard" description="Översikt över dagens aktivitet">
      <div className="space-y-8 max-w-6xl">
        {/* Live indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isLive && (
            <>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
              </span>
              <span>Live</span>
            </>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ClipboardList} value={todayAssignments.length} label="Dagens uppdrag" color="bg-primary/10 text-primary" isLoading={isLoading} />
          <StatCard icon={CheckCircle2} value={completed} label="Slutförda" color="bg-success/10 text-success" isLoading={isLoading} />
          <StatCard icon={Loader2} value={active} label="Aktiva just nu" color="bg-warning/10 text-warning" isLoading={isLoading} />
          <StatCard icon={TrendingUp} value={pending} label="Ej startade" color="bg-info/10 text-info" isLoading={isLoading} />
        </div>

        {/* Activity feed */}
        {recentActivity.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Senaste aktivitet</h2>
            <div className="space-y-1">
              {recentActivity.map(item => (
                <div key={item.key} className="flex items-center gap-2 text-sm py-1.5 px-3 rounded-lg hover:bg-muted/50 animate-in fade-in duration-300">
                  <span className="font-medium">{item.driver}</span>
                  <span className="text-muted-foreground">{item.action}</span>
                  <span className="truncate">{item.title}</span>
                  <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">· {item.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active assignments */}
        {activeAssignments.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Aktiva just nu</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeAssignments.map(a => (
                <Link key={a.id} to={`/admin/assignments/${a.id}`}>
                  <Card className="hover:shadow-md hover:border-warning/30 transition-all">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm truncate">{a.driver?.full_name}</p>
                        {a.actual_start && <ElapsedSince since={a.actual_start} />}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{a.customer?.name} · {a.address}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Dagens uppdrag</h2>
            <p className="text-sm text-muted-foreground">{todayAssignments.length} uppdrag schemalagda</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/assignments">
                Visa alla <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/admin/assignments/new">
                <Plus className="h-4 w-4 mr-1" /> Nytt uppdrag
              </Link>
            </Button>
          </div>
        </div>

        {/* Assignment list */}
        <div className="space-y-3">
          {isLoading && [1, 2, 3].map(i => <Skeleton key={i} className="h-[84px] w-full rounded-xl" />)}
          {!isLoading && todayAssignments.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Inga uppdrag idag</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Skapa ett nytt uppdrag för att komma igång</p>
                <Button size="sm" className="mt-4" asChild>
                  <Link to="/admin/assignments/new"><Plus className="h-4 w-4 mr-1" /> Skapa uppdrag</Link>
                </Button>
              </CardContent>
            </Card>
          )}
          {todayAssignments.map((a) => (
            <Link key={a.id} to={`/admin/assignments/${a.id}`} className="block group">
              <Card className="transition-all duration-150 hover:shadow-md hover:border-primary/20 group-hover:translate-y-[-1px]">
                <CardContent className="py-4 px-5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-foreground truncate">{a.title}</p>
                      {a.priority !== 'normal' && <PriorityBadge priority={a.priority} />}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {a.customer?.name} · {a.driver?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      {formatSwedishDateTime(a.scheduled_start)}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

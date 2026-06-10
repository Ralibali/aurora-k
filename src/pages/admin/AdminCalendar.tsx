import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { useAssignments, useDrivers } from '@/hooks/useData';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from 'date-fns';
import { sv } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoCalendarAssignments, demoDrivers } from '@/lib/demo-data';
import { CalendarDays, Info } from 'lucide-react';

type ViewMode = 'week' | 'month';

export default function AdminCalendar() {
  const navigate = useNavigate();
  const { data: assignments, isLoading } = useAssignments();
  const { data: drivers } = useDrivers();
  const { enabled: demoEnabled } = useDemoMode();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [driverFilter, setDriverFilter] = useState<string>('all');

  const effectiveAssignments = useMemo(() => {
    const real = assignments ?? [];
    if (demoEnabled && real.length === 0) return demoCalendarAssignments as any[];
    return real;
  }, [assignments, demoEnabled]);

  const effectiveDrivers = useMemo(() => {
    const real = drivers ?? [];
    if (demoEnabled && real.length === 0) return demoDrivers as any[];
    return real;
  }, [drivers, demoEnabled]);

  const filteredAssignments = useMemo(() => {
    if (!effectiveAssignments.length) return [];
    if (driverFilter === 'all') return effectiveAssignments;
    return effectiveAssignments.filter((a: any) => a.assigned_driver_id === driverFilter);
  }, [effectiveAssignments, driverFilter]);

  const days = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate, { locale: sv });
      const end = endOfWeek(currentDate, { locale: sv });
      return eachDayOfInterval({ start, end });
    }
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const monthDays = eachDayOfInterval({ start, end });
    // Pad start to Monday
    const firstDay = startOfWeek(start, { locale: sv });
    const lastDay = endOfWeek(end, { locale: sv });
    return eachDayOfInterval({ start: firstDay, end: lastDay });
  }, [currentDate, viewMode]);

  const assignmentsByDay = useMemo(() => {
    const map = new Map<string, typeof filteredAssignments>();
    for (const a of filteredAssignments) {
      const key = format(new Date(a.scheduled_start), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    // Sort each day by time
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());
    }
    return map;
  }, [filteredAssignments]);

  const navigate_period = (dir: 1 | -1) => {
    if (viewMode === 'week') {
      setCurrentDate(prev => dir === 1 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => dir === 1 ? addMonths(prev, 1) : subMonths(prev, 1));
    }
  };

  const headerLabel = viewMode === 'week'
    ? `${format(days[0], 'd MMM', { locale: sv })} – ${format(days[days.length - 1], 'd MMM yyyy', { locale: sv })}`
    : format(currentDate, 'MMMM yyyy', { locale: sv });

  const today = new Date();

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/15 border-green-500/30 text-green-700 dark:text-green-400';
      case 'in_progress': return 'bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-400';
      case 'cancelled': return 'bg-destructive/15 border-destructive/30 text-destructive';
      default: return 'bg-orange-500/15 border-orange-500/30 text-orange-700 dark:text-orange-400';
    }
  };

  return (
    <AdminLayout title="Kalender">
      <div className="space-y-4">
        {/* Helper banner */}
        <div className="flex items-start gap-3 rounded-lg border border-border bg-card/50 px-4 py-3 text-sm">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-foreground font-medium">Här ser du uppdrag per dag och chaufför.</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Färgerna visar status: <span className="text-orange-600 dark:text-orange-400">väntande</span>,{' '}
              <span className="text-blue-600 dark:text-blue-400">pågående</span>,{' '}
              <span className="text-green-600 dark:text-green-400">slutförda</span>,{' '}
              <span className="text-destructive">avbokade</span>.
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Föregående period" onClick={() => navigate_period(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Idag
            </Button>
            <Button variant="outline" size="icon" aria-label="Nästa period" onClick={() => navigate_period(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold capitalize ml-2">{headerLabel}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Alla chaufförer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla chaufförer</SelectItem>
                {effectiveDrivers.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-[120px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Vecka</SelectItem>
                <SelectItem value="month">Månad</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => navigate('/admin/assignments/new')}>
              <Plus className="h-4 w-4 mr-1" /> Skapa uppdrag
            </Button>
          </div>
        </div>

        {/* Skeleton during load */}
        {isLoading && effectiveAssignments.length === 0 && (
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-[180px] w-full rounded-lg" />)}
          </div>
        )}

        {/* CTA overlay when no assignments at all */}
        {!isLoading && effectiveAssignments.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-8 text-center">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/5 border border-primary/10 mb-3">
              <CalendarDays className="h-6 w-6 text-primary/70" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">Skapa veckans första uppdrag</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              När du planerar uppdrag visas de här som färgade block per dag och chaufför — så hela teamet ser veckan i taget.
            </p>
            <Button size="sm" onClick={() => navigate('/admin/assignments/new')}>
              <Plus className="h-4 w-4 mr-1" /> Skapa uppdrag
            </Button>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="border rounded-lg overflow-hidden bg-card">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b">
            {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2 border-r last:border-r-0">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayAssignments = assignmentsByDay.get(key) || [];
              const isToday = isSameDay(day, today);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const maxShow = viewMode === 'week' ? 20 : 4;
              const overflow = dayAssignments.length - maxShow;

              return (
                <div
                  key={key}
                  className={cn(
                    'border-r border-b last:border-r-0 p-1.5',
                    viewMode === 'week' ? 'min-h-[180px]' : 'min-h-[100px]',
                    !isCurrentMonth && viewMode === 'month' && 'bg-muted/30',
                  )}
                >
                  <div className={cn(
                    'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                    isToday && 'bg-primary text-primary-foreground',
                    !isToday && !isCurrentMonth && 'text-muted-foreground/50',
                  )}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayAssignments.slice(0, maxShow).map(a => (
                      <button
                        key={a.id}
                        onClick={() => navigate(`/admin/assignments/${a.id}`)}
                        className={cn(
                          'w-full text-left text-[11px] leading-tight px-1.5 py-1 rounded border truncate block hover:opacity-80 transition-opacity',
                          statusColor(a.status),
                        )}
                        title={`${format(new Date(a.scheduled_start), 'HH:mm')} ${a.title} — ${a.driver?.full_name || 'Ej tilldelad'}`}
                      >
                        <span className="font-medium">{format(new Date(a.scheduled_start), 'HH:mm')}</span>{' '}
                        {a.title}
                      </button>
                    ))}
                    {overflow > 0 && (
                      <p className="text-[10px] text-muted-foreground pl-1">+{overflow} till</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

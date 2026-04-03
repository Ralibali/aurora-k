import { Card, CardContent } from '@/components/ui/card';
import { useDriverAssignments } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { calculateDecimalHours, formatSwedishDate } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function DriverTimeReport() {
  const { user } = useAuth();
  const { data: assignments, isLoading } = useDriverAssignments(user?.id);
  const [period, setPeriod] = useState('week');

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const completed = (assignments ?? []).filter(a => a.status === 'completed' && a.actual_start && a.actual_stop);

  const filterByPeriod = (start: Date, end: Date) =>
    completed.filter(a => {
      const d = parseISO(a.actual_start!);
      return isWithinInterval(d, { start, end });
    });

  const weekAssignments = filterByPeriod(weekStart, weekEnd);
  const monthAssignments = filterByPeriod(monthStart, monthEnd);

  const totalHours = (items: typeof completed) =>
    items.reduce((sum, a) => sum + calculateDecimalHours(a.actual_start!, a.actual_stop!), 0);

  const weekHours = totalHours(weekAssignments);
  const monthHours = totalHours(monthAssignments);

  const currentItems = period === 'week' ? weekAssignments : monthAssignments;
  const currentHours = period === 'week' ? weekHours : monthHours;

  return (
    <>
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Tidrapport</h2>

        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-xl" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="stat-card">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-foreground font-mono">{weekHours.toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Denna vecka</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <p className="text-2xl font-bold text-foreground font-mono">{monthHours.toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Denna månad</p>
                </div>
              </div>
            </div>

            <Tabs value={period} onValueChange={setPeriod}>
              <TabsList className="w-full h-11">
                <TabsTrigger value="week" className="flex-1 text-sm">Vecka ({weekAssignments.length})</TabsTrigger>
                <TabsTrigger value="month" className="flex-1 text-sm">Månad ({monthAssignments.length})</TabsTrigger>
              </TabsList>
              <TabsContent value={period} className="mt-4 space-y-2">
                {currentItems.length === 0 && (
                  <p className="text-center text-muted-foreground py-10">Inga avklarade uppdrag</p>
                )}
                {currentItems.map(a => {
                  const hours = calculateDecimalHours(a.actual_start!, a.actual_stop!);
                  return (
                    <Card key={a.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="py-3.5 px-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{a.customer?.name || a.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatSwedishDate(a.actual_start!)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm text-foreground tabular-nums">{hours.toFixed(1)}h</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {currentItems.length > 0 && (
                  <div className="flex justify-between items-center pt-3 border-t text-sm font-medium px-1">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-success" /> {currentItems.length} uppdrag
                    </span>
                    <span className="text-foreground font-semibold tabular-nums">{currentHours.toFixed(1)} timmar</span>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </>
  );
}

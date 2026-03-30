import { DriverLayout } from '@/components/DriverLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <DriverLayout>
      <div className="p-4 space-y-4">
        <h2 className="text-lg font-semibold">Tidrapport</h2>

        {isLoading ? (
          <Skeleton className="h-48 w-full rounded-lg" />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="py-4 text-center">
                  <Clock className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">{weekHours.toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground">Denna vecka</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">{monthHours.toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground">Denna månad</p>
                </CardContent>
              </Card>
            </div>

            <Tabs value={period} onValueChange={setPeriod}>
              <TabsList className="w-full">
                <TabsTrigger value="week" className="flex-1">Vecka ({weekAssignments.length})</TabsTrigger>
                <TabsTrigger value="month" className="flex-1">Månad ({monthAssignments.length})</TabsTrigger>
              </TabsList>
              <TabsContent value={period} className="mt-3 space-y-2">
                {currentItems.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Inga avklarade uppdrag</p>
                )}
                {currentItems.map(a => {
                  const hours = calculateDecimalHours(a.actual_start!, a.actual_stop!);
                  return (
                    <Card key={a.id}>
                      <CardContent className="py-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{a.customer?.name || a.title}</p>
                          <p className="text-xs text-muted-foreground">{formatSwedishDate(a.actual_start!)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm">{hours.toFixed(1)}h</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {currentItems.length > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t text-sm font-medium px-1">
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-success" /> {currentItems.length} uppdrag</span>
                    <span>{currentHours.toFixed(1)} timmar totalt</span>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DriverLayout>
  );
}

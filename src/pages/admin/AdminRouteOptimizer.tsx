import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssignments, useDrivers } from '@/hooks/useData';
import { MapPin, Route, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function AdminRouteOptimizer() {
  const { data: assignments } = useAssignments();
  const { data: drivers } = useDrivers();
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const driverAssignments = useMemo(() => {
    if (!selectedDriver || !assignments) return [];
    return assignments
      .filter(a => a.assigned_driver_id === selectedDriver && a.scheduled_start.startsWith(selectedDate) && a.status !== 'completed')
      .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));
  }, [assignments, selectedDriver, selectedDate]);

  return (
    <AdminLayout title="Slingor & Ruttoptimering">
      <div className="space-y-4">
        <p className="text-muted-foreground">Visa och optimera körordningen för chaufförers uppdrag.</p>

        <div className="flex gap-4 items-end">
          <div className="space-y-1">
            <label className="text-sm font-medium">Chaufför</label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Välj chaufför" /></SelectTrigger>
              <SelectContent>{(drivers ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Datum</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>

        {selectedDriver && driverAssignments.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground"><Route className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Inga uppdrag för vald dag</p></CardContent></Card>
        )}

        {driverAssignments.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Körordning ({driverAssignments.length} stopp)</CardTitle></CardHeader>
            <CardContent className="space-y-0">
              {driverAssignments.map((a, i) => (
                <div key={a.id}>
                  <div className="flex items-start gap-3 py-3">
                    <div className="flex flex-col items-center">
                      <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{i + 1}</div>
                      {i < driverAssignments.length - 1 && <div className="w-px h-8 bg-border mt-1" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{a.title}</p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {a.address}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(a.scheduled_start), 'HH:mm')}
                        {a.scheduled_end && ` – ${format(new Date(a.scheduled_end), 'HH:mm')}`}
                      </p>
                    </div>
                    <Badge variant="outline">{a.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            <p className="text-sm">💡 Tips: Dra och släpp uppdrag i kalendervyn för att optimera körordningen manuellt.</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

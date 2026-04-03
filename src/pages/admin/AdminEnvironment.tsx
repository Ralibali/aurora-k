import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAssignments } from '@/hooks/useData';
import { Leaf, Fuel, Route } from 'lucide-react';
import { useMemo } from 'react';

export default function AdminEnvironment() {
  const { data: assignments } = useAssignments();

  const stats = useMemo(() => {
    const all = assignments ?? [];
    const totalKm = all.reduce((s, a) => s + ((a as any).distance_km || 0), 0);
    const totalCo2 = all.reduce((s, a) => s + ((a as any).co2_kg || 0), 0);
    const totalFuel = all.reduce((s, a) => s + ((a as any).fuel_liters || 0), 0);
    const count = all.filter(a => (a as any).distance_km).length;
    return { totalKm, totalCo2, totalFuel, count };
  }, [assignments]);

  return (
    <AdminLayout title="Miljödata">
      <div className="space-y-4">
        <p className="text-muted-foreground">Schablonberäkningar för miljöpåverkan baserat på körsträckor.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Route className="h-4 w-4" /> Total körsträcka</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-bold font-mono">{stats.totalKm.toFixed(0)} km</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Leaf className="h-4 w-4" /> CO₂-utsläpp</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-bold">{stats.totalCo2.toFixed(1)} kg</span><p className="text-xs text-muted-foreground mt-1">Schablon: 0.12 kg/km</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Fuel className="h-4 w-4" /> Bränsleförbrukning</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-bold">{stats.totalFuel.toFixed(1)} liter</span><p className="text-xs text-muted-foreground mt-1">Schablon: 0.08 l/km</p></CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Leaf className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Miljörapportering</p>
            <p className="text-sm mt-1">Registrera körsträcka på uppdrag för att se automatiska miljöberäkningar.</p>
            <p className="text-sm mt-1">{stats.count} uppdrag har registrerad körsträcka.</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAssignments } from '@/hooks/useData';
import { Leaf, Fuel, Route, Download, TrendingDown } from 'lucide-react';
import { useMemo } from 'react';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoEnvironmentMonthly } from '@/lib/demo-data';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';

export default function AdminEnvironment() {
  const { data: assignments } = useAssignments();
  const { enabled: demoEnabled } = useDemoMode();

  const stats = useMemo(() => {
    const all = assignments ?? [];
    const totalKm = all.reduce((s, a) => s + (a.distance_km || 0), 0);
    const totalCo2 = all.reduce((s, a) => s + (a.co2_kg || 0), 0);
    const totalFuel = all.reduce((s, a) => s + (a.fuel_liters || 0), 0);
    const count = all.filter(a => a.distance_km).length;
    return { totalKm, totalCo2, totalFuel, count };
  }, [assignments]);

  const useDemo = demoEnabled && stats.count === 0;
  const km = useDemo ? demoEnvironmentMonthly.totalKm : stats.totalKm;
  const co2 = useDemo ? demoEnvironmentMonthly.co2Kg : stats.totalCo2;
  const fuel = useDemo ? demoEnvironmentMonthly.fuelLiters : stats.totalFuel;

  const handleExport = () => {
    const rows = [
      ['Mått', 'Värde', 'Enhet'],
      ['Total körsträcka', km.toFixed(0), 'km'],
      ['CO₂-utsläpp', co2.toFixed(1), 'kg'],
      ['Bränsleförbrukning', fuel.toFixed(1), 'liter'],
    ];
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miljorapport-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Miljörapport exporterad');
  };

  return (
    <AdminLayout title="Miljöuppföljning" description="Följ körsträcka, utsläpp och bränsleförbrukning">
      <div className="space-y-6 max-w-5xl">
        {useDemo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Visar exempeldata. Dina riktiga miljötal beräknas automatiskt när chaufförer registrerar körsträcka på uppdrag.
          </div>
        )}

        <div className="rounded-xl border border-success/15 bg-gradient-to-br from-success/5 via-card to-card p-5 flex items-start gap-4">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-success/10 border border-success/20 shrink-0">
            <Leaf className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Så fungerar miljöuppföljningen</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Aurora Transport beräknar utsläpp och bränsleförbrukning automatiskt baserat på körsträckan som loggas på varje uppdrag.
              Schabloner: <strong>0,12 kg CO₂/km</strong> och <strong>0,08 liter bränsle/km</strong>. Använd rapporten i hållbarhetsredovisning eller upphandlingssvar.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} className="shrink-0">
            <Download className="h-3.5 w-3.5 mr-1.5" /> Exportera rapport
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-2 font-medium uppercase tracking-wider">
                <Route className="h-3.5 w-3.5" /> Total körsträcka
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono">{km.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} <span className="text-base text-muted-foreground font-normal">km</span></p>
              <p className="text-xs text-muted-foreground mt-1">Senaste 30 dagarna</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-2 font-medium uppercase tracking-wider">
                <Leaf className="h-3.5 w-3.5" /> CO₂-utsläpp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono">{co2.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} <span className="text-base text-muted-foreground font-normal">kg</span></p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-success" /> Schablon 0,12 kg/km
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-2 font-medium uppercase tracking-wider">
                <Fuel className="h-3.5 w-3.5" /> Bränsleförbrukning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono">{fuel.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} <span className="text-base text-muted-foreground font-normal">liter</span></p>
              <p className="text-xs text-muted-foreground mt-1">Schablon 0,08 l/km</p>
            </CardContent>
          </Card>
        </div>

        {useDemo && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Trend — senaste 6 månaderna</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={demoEnvironmentMonthly.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="km" name="Körsträcka (km)" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="co2" name="CO₂ (kg)" stroke="hsl(var(--success))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {!useDemo && stats.count === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-success/5 border border-success/10 mb-4">
                <Leaf className="h-7 w-7 text-success/70" strokeWidth={1.75} />
              </div>
              <p className="font-semibold">Ingen körsträcka registrerad ännu</p>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto">
                När chaufförer slutför uppdrag och registrerar körsträcka beräknas utsläpp och bränsleförbrukning automatiskt här.
              </p>
            </CardContent>
          </Card>
        )}

        {!useDemo && stats.count > 0 && (
          <p className="text-xs text-muted-foreground">{stats.count} uppdrag har registrerad körsträcka.</p>
        )}
      </div>
    </AdminLayout>
  );
}

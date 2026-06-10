import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlatformLayout } from '@/components/PlatformAdminLayout';
import { Card } from '@/components/ui/card';
import { TrendingUp, DollarSign, Users, BarChart3, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const PRICE_PER_MONTH = 449;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

type SubscriptionStatus = 'active' | 'pending' | 'past_due' | 'cancelled';
interface PlatformCompany {
  id: string;
  name: string;
  subscription_status: SubscriptionStatus;
  created_at: string;
  updated_at: string | null;
  org_nr: string | null;
}

export default function PlatformRevenue() {
  const { data: companies, isLoading } = useQuery<PlatformCompany[]>({
    queryKey: ['platform-companies-revenue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name, subscription_status, created_at, org_nr, updated_at')
        .order('created_at', { ascending: false });
      return (data ?? []) as PlatformCompany[];
    },
  });

  const list: PlatformCompany[] = companies ?? [];
  const active = list.filter((c) => c.subscription_status === 'active');
  const pending = list.filter((c) => c.subscription_status === 'pending');
  const pastDue = list.filter((c) => c.subscription_status === 'past_due');
  const cancelled = list.filter((c) => c.subscription_status === 'cancelled');

  const mrr = active.length * PRICE_PER_MONTH;
  const arr = mrr * 12;

  // Churn this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const churnThisMonth = cancelled.filter((c) => {
    const d = new Date(c.updated_at || c.created_at);
    return d >= monthStart;
  }).length;

  // Average customer age
  const avgAgeDays = active.length > 0
    ? Math.round(active.reduce((sum, c) => sum + (Date.now() - new Date(c.created_at).getTime()) / 86400000, 0) / active.length)
    : 0;

  // Chart data: last 6 months cumulative active
  const chartData = (() => {
    const months: { label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      // Count companies created before end of that month that are active (or were created by then)
      const count = list.filter((c) => {
        const created = new Date(c.created_at);
        return created <= endOfMonth && (c.subscription_status === 'active' || c.subscription_status === 'past_due');
      }).length;
      months.push({ label: MONTH_LABELS[d.getMonth()], count });
    }
    return months;
  })();

  const total = list.length;
  const statusRows = [
    { label: 'Aktiv', count: active.length, pct: total ? ((active.length / total) * 100).toFixed(0) : '0', mrr: `${(active.length * PRICE_PER_MONTH).toLocaleString('sv-SE')} kr` },
    { label: 'Väntande', count: pending.length, pct: total ? ((pending.length / total) * 100).toFixed(0) : '0', mrr: '—' },
    { label: 'Förfallen', count: pastDue.length, pct: total ? ((pastDue.length / total) * 100).toFixed(0) : '0', mrr: `${(pastDue.length * PRICE_PER_MONTH).toLocaleString('sv-SE')} kr (risk)` },
    { label: 'Avslutad', count: cancelled.length, pct: total ? ((cancelled.length / total) * 100).toFixed(0) : '0', mrr: '—' },
  ];

  const recentActivations = active.slice(0, 10);

  const kpis = [
    { label: 'MRR', value: `${mrr.toLocaleString('sv-SE')} kr`, icon: DollarSign, color: 'text-green-600 bg-green-50' },
    { label: 'ARR', value: `${arr.toLocaleString('sv-SE')} kr`, icon: TrendingUp, color: 'text-blue-600 bg-blue-50' },
    { label: 'Aktiva kunder', value: active.length, icon: Users, color: 'text-violet-600 bg-violet-50' },
    { label: 'Churn denna månad', value: churnThisMonth, icon: BarChart3, color: churnThisMonth > 0 ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50' },
    { label: 'Snitt kundålder', value: `${avgAgeDays} dagar`, icon: Calendar, color: 'text-amber-600 bg-amber-50' },
  ];

  if (isLoading) {
    return (
      <PlatformLayout title="Intäkter" description="Intäktsöversikt">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}
        </div>
      </PlatformLayout>
    );
  }

  return (
    <PlatformLayout title="Intäkter" description="Intäktsöversikt och tillväxt">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${k.color}`}>
              <k.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-foreground">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </Card>
        ))}
      </div>

      {/* MRR Chart */}
      <Card className="p-5 mb-8">
        <h2 className="font-semibold text-foreground mb-4">Tillväxt — aktiva kunder per månad</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis allowDecimals={false} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="count" name="Aktiva kunder" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Status breakdown */}
      <Card className="p-5 mb-8">
        <h2 className="font-semibold text-foreground mb-4">Prenumerationsöversikt</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Antal</th>
                <th className="text-right py-2 font-medium text-muted-foreground">Andel</th>
                <th className="text-right py-2 font-medium text-muted-foreground">MRR-bidrag</th>
              </tr>
            </thead>
            <tbody>
              {statusRows.map((r) => (
                <tr key={r.label} className="border-b border-border last:border-0">
                  <td className="py-2 text-foreground font-medium">{r.label}</td>
                  <td className="py-2 text-right text-foreground">{r.count}</td>
                  <td className="py-2 text-right text-muted-foreground">{r.pct}%</td>
                  <td className="py-2 text-right text-foreground">{r.mrr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent activations */}
      <Card className="p-5">
        <h2 className="font-semibold text-foreground mb-4">Senaste aktiveringar</h2>
        {recentActivations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Inga aktiva företag ännu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 font-medium text-muted-foreground">Företagsnamn</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Registrerat</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Org.nr</th>
                </tr>
              </thead>
              <tbody>
                {recentActivations.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="py-2 text-foreground font-medium">{c.name}</td>
                    <td className="py-2 text-muted-foreground">{new Date(c.created_at).toLocaleDateString('sv-SE')}</td>
                    <td className="py-2 text-muted-foreground">{c.org_nr || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PlatformLayout>
  );
}

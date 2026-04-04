import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlatformLayout } from '@/components/PlatformAdminLayout';
import { Card } from '@/components/ui/card';
import { Building2, Users, HeadphonesIcon, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

export default function PlatformDashboard() {
  const { data: companies } = useQuery({
    queryKey: ['platform-companies'],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name, subscription_status, created_at');
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['platform-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, role');
      return data || [];
    },
  });

  const { data: tickets } = useQuery({
    queryKey: ['platform-tickets-count'],
    queryFn: async () => {
      const { data } = await supabase
        .from('support_tickets' as any)
        .select('id, status');
      return (data || []) as { id: string; status: string }[];
    },
  });

  const totalCompanies = companies?.length || 0;
  const activeCompanies = companies?.filter((c: any) => c.subscription_status === 'active').length || 0;
  const totalUsers = profiles?.length || 0;
  const openTickets = tickets?.filter((t) => t.status === 'open').length || 0;

  const mrr = activeCompanies * 449;

  const stats = [
    { label: 'Totalt företag', value: totalCompanies, icon: Building2, color: 'text-blue-600 bg-blue-50' },
    { label: 'Aktiva prenumerationer', value: activeCompanies, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Totalt användare', value: totalUsers, icon: Users, color: 'text-violet-600 bg-violet-50' },
    { label: 'MRR', value: `${mrr.toLocaleString('sv-SE')} kr`, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
    { label: 'Öppna supportärenden', value: openTickets, icon: openTickets > 0 ? AlertCircle : HeadphonesIcon, color: openTickets > 0 ? 'text-red-600 bg-red-50' : 'text-slate-600 bg-slate-50' },
  ];

  return (
    <PlatformLayout title="Platform Dashboard" description="Aurora Media AB · Översikt">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Recent companies */}
      <Card className="p-5">
        <h2 className="font-semibold text-foreground mb-4">Senaste företag</h2>
        <div className="space-y-3">
          {companies?.slice(0, 10).map((c: any) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  Registrerat {new Date(c.created_at).toLocaleDateString('sv-SE')}
                </p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  c.subscription_status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : c.subscription_status === 'past_due'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {c.subscription_status || 'pending'}
              </span>
            </div>
          ))}
          {!companies?.length && <p className="text-sm text-muted-foreground">Inga företag registrerade ännu.</p>}
        </div>
      </Card>
    </PlatformLayout>
  );
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlatformLayout } from '@/components/PlatformAdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, HeadphonesIcon, TrendingUp, AlertCircle, CheckCircle, ExternalLink, Clock , type LucideIcon } from 'lucide-react';

const statusBadge = (status: string | null) => {
  switch (status) {
    case 'active': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Aktiv</Badge>;
    case 'past_due': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Förfallen</Badge>;
    case 'cancelled': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Avslutad</Badge>;
    default: return <Badge variant="outline">Pending</Badge>;
  }
};

export default function PlatformDashboard() {
  const { data: companies } = useQuery({
    queryKey: ['platform-companies'],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name, subscription_status, created_at, stripe_customer_id, trial_ends_at')
        .order('created_at', { ascending: false });
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
      const { data } = await (supabase
        .from('support_tickets')
        .select('id, status'));
      return (data || []) as { id: string; status: string }[];
    },
  });

  const totalCompanies = companies?.length || 0;
  const activeCompanies = companies?.filter((c) => c.subscription_status === 'active').length || 0;
  const totalUsers = profiles?.length || 0;
  const openTickets = tickets?.filter((t) => t.status === 'open').length || 0;
  const mrr = activeCompanies * 449;

  const pending = companies?.filter((c) => c.subscription_status === 'pending') || [];
  const pastDue = companies?.filter((c) => c.subscription_status === 'past_due') || [];
  const cancelled = companies?.filter((c) => c.subscription_status === 'cancelled') || [];

  const stats = [
    { label: 'Totalt företag', value: totalCompanies, icon: Building2, color: 'text-blue-600 bg-blue-50' },
    { label: 'Aktiva prenumerationer', value: activeCompanies, icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Totalt användare', value: totalUsers, icon: Users, color: 'text-violet-600 bg-violet-50' },
    { label: 'MRR', value: `${mrr.toLocaleString('sv-SE')} kr`, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
    { label: 'Öppna supportärenden', value: openTickets, icon: openTickets > 0 ? AlertCircle : HeadphonesIcon, color: openTickets > 0 ? 'text-red-600 bg-red-50' : 'text-slate-600 bg-slate-50' },
  ];

  return (
    <PlatformLayout title="Platform Dashboard" description="Aurora Media AB · Översikt">
      {/* Stats */}
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

      {/* Churned / Pending / Past Due */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatusColumn title="Väntar på betalning" items={pending} icon={Clock} />
        <StatusColumn title="Förfallen betalning" items={pastDue} icon={AlertCircle} showStripe />
        <StatusColumn title="Avslutade" items={cancelled} icon={Building2} />
      </div>

      {/* Activity feed */}
      <Card className="p-5">
        <h2 className="font-semibold text-foreground mb-4">Senaste aktivitet</h2>
        <div className="space-y-3">
          {companies?.slice(0, 15).map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  Registrerat {new Date(c.created_at).toLocaleDateString('sv-SE')}
                </p>
              </div>
              {statusBadge(c.subscription_status)}
            </div>
          ))}
          {!companies?.length && <p className="text-sm text-muted-foreground">Inga företag registrerade ännu.</p>}
        </div>
      </Card>
    </PlatformLayout>
  );
}

type StatusItem = { id: string; name: string; created_at: string; stripe_customer_id?: string | null };
function StatusColumn({ title, items, icon: Icon, showStripe }: { title: string; items: StatusItem[]; icon: LucideIcon; showStripe?: boolean }) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      {items.length === 0 ? (
        <div className="flex items-center gap-2 py-3">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-sm text-muted-foreground">Inga</span>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('sv-SE')}</p>
              </div>
              {(showStripe || c.stripe_customer_id) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => window.open('https://dashboard.stripe.com/customers', '_blank')}
                >
                  Stripe <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

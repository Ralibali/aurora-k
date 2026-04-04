import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlatformLayout } from '@/components/PlatformAdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Search, Building2, Users, FileText } from 'lucide-react';

export default function PlatformCompanies() {
  const [search, setSearch] = useState('');

  const { data: companies } = useQuery({
    queryKey: ['platform-companies-detail'],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ['platform-profiles-all'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, company_id, role, full_name, email');
      return data || [];
    },
  });

  const filtered = companies?.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.org_nr || '').includes(search)
  ) || [];

  const getUserCount = (companyId: string) =>
    profiles?.filter((p: any) => p.company_id === companyId).length || 0;

  const getAdminCount = (companyId: string) =>
    profiles?.filter((p: any) => p.company_id === companyId && p.role === 'admin').length || 0;

  const statusLabel = (s: string | null) => {
    switch (s) {
      case 'active': return { label: 'Aktiv', variant: 'default' as const };
      case 'past_due': return { label: 'Förfallen', variant: 'destructive' as const };
      case 'cancelled': return { label: 'Avslutad', variant: 'secondary' as const };
      default: return { label: 'Pending', variant: 'outline' as const };
    }
  };

  return (
    <PlatformLayout title="Företagshantering" description="Alla registrerade företag">
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök företag eller orgnr..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((c: any) => {
          const status = statusLabel(c.subscription_status);
          return (
            <Card key={c.id} className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{c.name}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      {c.org_nr && <span>Org.nr: {c.org_nr}</span>}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {getUserCount(c.id)} användare ({getAdminCount(c.id)} admins)
                      </span>
                      <span>Reg: {new Date(c.created_at).toLocaleDateString('sv-SE')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {c.onboarding_completed && (
                    <Badge variant="outline" className="text-green-600 border-green-200">Onboardad</Badge>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Inga företag matchar sökningen.</p>
        )}
      </div>
    </PlatformLayout>
  );
}

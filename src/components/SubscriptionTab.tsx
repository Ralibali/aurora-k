import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  active: { label: 'Aktiv', variant: 'default' },
  pending: { label: 'Väntar på betalning', variant: 'secondary' },
  past_due: { label: 'Förfallen', variant: 'destructive' },
  cancelled: { label: 'Avslutad', variant: 'destructive' },
};

export default function SubscriptionTab() {
  const { companyId } = useAuth();
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('companies')
      .select('subscription_status')
      .eq('id', companyId)
      .single()
      .then(({ data }) => {
        setStatus(data?.subscription_status || 'pending');
        setLoading(false);
      });
  }, [companyId]);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-portal');
      if (error || !data?.url) throw new Error('Kunde inte öppna portalen');
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || 'Något gick fel');
      setPortalLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const statusInfo = STATUS_MAP[status] || STATUS_MAP.pending;

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Aurora Transport
            </h3>
            <p className="text-2xl font-bold mt-2">449 kr<span className="text-sm font-normal text-muted-foreground">/mån</span></p>
            <p className="text-xs text-muted-foreground mt-1">+ 3 500 kr startavgift (engångs)</p>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
      </div>

      {/* Manage */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-2">Hantera prenumeration</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Ändra betalningsmetod, se fakturor eller avsluta din prenumeration via Stripe.
        </p>
        <Button onClick={openPortal} disabled={portalLoading} className="gap-2">
          {portalLoading ? 'Öppnar...' : (
            <>Hantera prenumeration <ExternalLink className="h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}

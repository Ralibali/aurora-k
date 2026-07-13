import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { trackEventOnce } from '@/lib/analytics';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
  active: { label: 'Aktiv', variant: 'default' },
  pending: { label: 'Väntar på betalning', variant: 'secondary' },
  past_due: { label: 'Förfallen', variant: 'destructive' },
  cancelled: { label: 'Avslutad', variant: 'destructive' },
};

export default function SubscriptionTab() {
  const { companyId, loading: authLoading } = useAuth();
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(loading);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  const loadSubscription = useCallback(async () => {
    if (authLoading && !companyId) return;

    if (!companyId) {
      setError('Det finns inget företag kopplat till kontot ännu. Koppla användaren till ett företag för att visa prenumerationen här.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: companyError } = await supabase
        .from('companies')
        .select('subscription_status')
        .eq('id', companyId)
        .single();

      if (companyError) {
        setError('Kunde inte hämta prenumerationsstatus just nu. Försök igen.');
        setLoading(false);
        return;
      }

      setStatus(data?.subscription_status || 'pending');

      // Fire Subscription Purchased exactly once per company when the Stripe
      // webhook has flipped status to active. Deduped in localStorage.
      if (data?.subscription_status === 'active' && companyId) {
        trackEventOnce(companyId, 'Subscription Purchased', {
          plan: 'aurora_449',
          billing_interval: 'monthly',
        });
      }
    } catch {
      setError('Kunde inte hämta prenumerationsstatus just nu. Försök igen.');
    } finally {
      setLoading(false);
    }
  }, [authLoading, companyId]);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  // Safety: if auth stays loading for >5s without companyId, stop spinner
  useEffect(() => {
    if (!authLoading || companyId) return;
    const timer = setTimeout(() => {
      if (loadingRef.current && !companyId) {
        setLoading(false);
        setError('Autentiseringen tog för lång tid. Försök ladda om sidan.');
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [authLoading, companyId]);

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

  if ((authLoading && !companyId) || loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-muted p-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="font-semibold">Prenumerationen kunde inte visas</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
            {companyId ? (
              <Button variant="outline" size="sm" onClick={() => void loadSubscription()} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Försök igen
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[status] || STATUS_MAP.pending;

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <div className="bg-card rounded-xl border p-6">
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
      <div className="bg-card rounded-xl border p-6">
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

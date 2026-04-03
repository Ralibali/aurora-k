import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Lock, AlertTriangle, XCircle } from 'lucide-react';

type SubStatus = 'active' | 'pending' | 'past_due' | 'cancelled' | null;

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { companyId } = useAuth();
  const [status, setStatus] = useState<SubStatus>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('companies')
      .select('subscription_status')
      .eq('id', companyId)
      .single()
      .then(({ data }) => {
        setStatus((data?.subscription_status as SubStatus) || 'pending');
        setLoading(false);
      });
  }, [companyId]);

  const openPortal = async () => {
    setRedirecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-portal');
      if (error || !data?.url) throw new Error('Could not open portal');
      window.location.href = data.url;
    } catch {
      setRedirecting(false);
    }
  };

  const retryCheckout = async () => {
    setRedirecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { companyId },
      });
      if (error || !data?.url) throw new Error('Could not create checkout');
      window.location.href = data.url;
    } catch {
      setRedirecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Active subscription — render normally
  if (status === 'active') {
    return <>{children}</>;
  }

  // Pending — full overlay
  if (status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl border shadow-sm p-8 max-w-md text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Slutför betalning</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Ditt konto är skapat men betalningen har inte slutförts ännu. Slutför betalningen för att komma igång.
          </p>
          <Button onClick={retryCheckout} className="w-full h-12 rounded-xl font-semibold" disabled={redirecting}>
            {redirecting ? 'Laddar...' : 'Slutför betalning'}
          </Button>
        </div>
      </div>
    );
  }

  // Cancelled — overlay with reactivation
  if (status === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl border shadow-sm p-8 max-w-md text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <XCircle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Prenumerationen avslutad</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Din prenumeration har avslutats. Aktivera den igen för att fortsätta använda Aurora Transport.
          </p>
          <Button onClick={retryCheckout} className="w-full h-12 rounded-xl font-semibold" disabled={redirecting}>
            {redirecting ? 'Laddar...' : 'Återaktivera prenumeration'}
          </Button>
        </div>
      </div>
    );
  }

  // Past due — show banner + allow access
  return (
    <>
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Betalning misslyckades — uppdatera dina kortuppgifter</span>
        </div>
        <Button variant="outline" size="sm" onClick={openPortal} disabled={redirecting} className="border-amber-300 text-amber-800 hover:bg-amber-100">
          {redirecting ? 'Laddar...' : 'Uppdatera betalning'}
        </Button>
      </div>
      {children}
    </>
  );
}

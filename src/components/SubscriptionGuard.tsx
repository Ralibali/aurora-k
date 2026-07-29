import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertTriangle, Lock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  normalizeSubscriptionStatus,
  type RawSubscriptionStatus,
  type SubscriptionViewStatus,
} from '@/lib/subscription-status';
import { trialDaysLeft } from '@/lib/trial';

function AccountCard({ icon, title, text, action, actionLabel, busy }: {
  icon: React.ReactNode;
  title: string;
  text: string;
  action: () => void;
  actionLabel: string;
  busy: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">{icon}</div>
        <h2 className="mb-2 text-lg font-semibold">{title}</h2>
        <p className="mb-6 text-sm text-muted-foreground">{text}</p>
        <Button onClick={action} className="h-12 w-full rounded-xl font-semibold" disabled={busy}>{busy ? 'Laddar…' : actionLabel}</Button>
      </div>
    </div>
  );
}

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { companyId, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<SubscriptionViewStatus>(null);
  const [rawStatus, setRawStatus] = useState<RawSubscriptionStatus>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const loadStatus = useCallback(async () => {
    if (authLoading) return;
    if (!companyId) { setLoading(false); return; }
    setLoadError(false);
    setLoading(true);
    try {
      const { data, error } = await supabase.from('companies').select('subscription_status, trial_ends_at').eq('id', companyId).single();
      if (error) throw error;
      const raw = (data?.subscription_status ?? null) as RawSubscriptionStatus;
      setRawStatus(raw);
      setTrialEndsAt(data?.trial_ends_at ?? null);
      setStatus(normalizeSubscriptionStatus(raw));
    } catch (error) {
      console.error('[SubscriptionGuard] Failed to load status', error);
      setLoadError(true);
    } finally { setLoading(false); }
  }, [authLoading, companyId]);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  const redirect = async (functionName: 'stripe-portal' | 'create-checkout') => {
    setRedirecting(true);
    try {
      const options = functionName === 'create-checkout' ? { body: { companyId } } : undefined;
      const { data, error } = await supabase.functions.invoke(functionName, options);
      if (error || !data?.url) throw error || new Error('Ingen betalningslänk returnerades');
      window.location.assign(data.url);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Betalningssidan kunde inte öppnas');
      setRedirecting(false);
    }
  };

  if (loading || authLoading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" /></div>;
  if (!companyId) return <Navigate to="/onboarding" replace />;
  if (loadError || status === null) return <AccountCard icon={<AlertTriangle className="h-7 w-7 text-destructive" />} title="Kunde inte verifiera kontot" text="Kontostatusen kunde inte hämtas. Försök igen innan du fortsätter." action={() => void loadStatus()} actionLabel="Försök igen" busy={loading} />;

  // Provperiod: full tillgång medan den pågår, automatiskt låst när den tar slut.
  if (rawStatus === 'trialing') {
    const daysLeft = trialDaysLeft(trialEndsAt);
    if (daysLeft <= 0) {
      return <AccountCard icon={<Lock className="h-7 w-7" />} title="Provperioden har löpt ut" text="Dina 14 gratisdagar är slut. Uppgradera för att fortsätta använda Aurora Transport — all din data finns kvar." action={() => void redirect('create-checkout')} actionLabel="Uppgradera – 449 kr/mån" busy={redirecting} />;
    }
    return (
      <>
        <div className="flex items-center justify-between gap-3 border-b border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Provperiod: {daysLeft} {daysLeft === 1 ? 'dag' : 'dagar'} kvar</span>
          <Button variant="outline" size="sm" disabled={redirecting} onClick={() => void redirect('create-checkout')}>Uppgradera nu</Button>
        </div>
        {children}
      </>
    );
  }

  if (status === 'active') return <>{children}</>;
  if (status === 'past_due') return <><div className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Betalningen misslyckades. Uppdatera betalningsmetoden.</span><Button variant="outline" size="sm" disabled={redirecting} onClick={() => void redirect('stripe-portal')}>Hantera betalning</Button></div>{children}</>;
  if (status === 'paused') return <AccountCard icon={<Lock className="h-7 w-7" />} title="Prenumerationen är pausad" text="Öppna betalningsportalen för att återuppta tjänsten." action={() => void redirect('stripe-portal')} actionLabel="Hantera prenumeration" busy={redirecting} />;
  if (status === 'cancelled') return <AccountCard icon={<XCircle className="h-7 w-7 text-destructive" />} title="Prenumerationen är avslutad" text="Starta en ny prenumeration för att använda Aurora Transport igen." action={() => void redirect('create-checkout')} actionLabel="Återaktivera" busy={redirecting} />;
  return <AccountCard icon={<Lock className="h-7 w-7" />} title="Slutför betalningen" text="Kontot är skapat men betalningen är inte slutförd." action={() => void redirect('create-checkout')} actionLabel="Slutför betalning" busy={redirecting} />;
}

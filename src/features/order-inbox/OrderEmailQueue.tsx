import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { OrderInboxChannel } from './order-inbox-client';

export function OrderEmailQueue() {
  const { companyId } = useAuth();
  const [channel, setChannel] = useState<OrderInboxChannel | null>(null);
  const [domain, setDomain] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    setChannel(null); setDomain(''); setReady(false); setError('');
    if (!companyId) return;
    setLoading(true);
    void supabase.functions.invoke('order-inbox-api', { body: { action: 'list' } }).then(({ data, error }) => {
      if (!current) return;
      if (error || data?.error) { setError('Orderinkorgen kunde inte hämtas. Försök igen.'); return; }
      setChannel(data.channel); setDomain(data.domain); setReady(data.receivingReady === true);
    }).catch(() => { if (current) setError('Orderinkorgen kunde inte hämtas. Försök igen.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [companyId, attempt]);

  const activate = async () => {
    setLoading(true); setError('');
    try {
      const { data, error } = await supabase.functions.invoke('order-inbox-api', { body: { action: 'activate' } });
      if (error || data?.error) throw error || new Error(data.error);
      setChannel(data.channel); setDomain(data.domain); setReady(data.receivingReady === true);
    } catch { setError('Orderinkorgen kunde inte aktiveras. Försök igen.'); }
    finally { setLoading(false); }
  };

  const address = ready && channel?.enabled && domain ? `order-${channel.inbox_key}@${domain}` : '';
  return <div className="rounded-xl border p-4">
    <p className="font-semibold">Automatisk orderinkorg</p>
    {loading ? <p className="mt-2 text-sm">Hämtar orderinkorgen…</p> : error ? <><p role="alert" className="mt-2 text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}>Försök igen</Button></> : address ? <><p className="mt-1 break-all font-mono text-sm">{address}</p><p className="mt-2 text-xs text-muted-foreground">Vidarebefordra ordermejl och PDF-bilagor till adressen.</p></> : ready ? <Button className="mt-3" onClick={() => void activate()}>Aktivera</Button> : <p className="mt-2 text-sm text-muted-foreground">E-postmottagningen konfigureras. Du kan ladda upp orderfiler här under tiden.</p>}
  </div>;
}

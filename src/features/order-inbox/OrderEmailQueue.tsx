import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { orderInboxClient, type OrderInboxChannel } from './order-inbox-client';

export function OrderEmailQueue() {
  const { companyId } = useAuth();
  const [channel, setChannel] = useState<OrderInboxChannel | null>(null);
  const domain = import.meta.env.VITE_ORDER_INBOX_DOMAIN as string | undefined;

  useEffect(() => {
    if (!companyId) return;
    orderInboxClient.from('order_inbox_channels').select('*').eq('company_id', companyId).maybeSingle()
      .then(result => setChannel(result.data));
  }, [companyId]);

  const activate = async () => {
    if (!companyId) return;
    const result = await orderInboxClient.from('order_inbox_channels').insert({ company_id: companyId }).select('*').single();
    setChannel(result.data);
  };

  const address = channel && domain ? ['order-', channel.inbox_key, '@', domain].join('') : '';
  return <div className="rounded-xl border p-4">
    <p className="font-semibold">Automatisk orderinkorg</p>
    {channel ? <><p className="mt-1 break-all font-mono text-sm">{address}</p><p className="mt-2 text-xs text-muted-foreground">Vidarebefordra ordermejl och PDF-bilagor till adressen.</p></> : <Button className="mt-3" disabled={!domain} onClick={() => void activate()}>Aktivera</Button>}
  </div>;
}

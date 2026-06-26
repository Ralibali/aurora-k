import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { orderInboxClient, type OrderInboxChannel } from './order-inbox-client';

export function OrderEmailQueue() {
  const { companyId } = useAuth();
  const [channel, setChannel] = useState<OrderInboxChannel | null>(null);

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

  return <div className="rounded-xl border p-4">
    <p className="font-semibold">Automatisk orderinkorg</p>
    {channel ? <p className="text-sm text-muted-foreground">Aktiverad</p> : <Button className="mt-3" onClick={() => void activate()}>Aktivera</Button>}
  </div>;
}

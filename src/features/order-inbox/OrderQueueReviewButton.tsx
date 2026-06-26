import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCustomers } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';

export type ReviewableOrderRow = {
  id: string;
  subject: string;
  status: string;
  parsed_payload: Record<string, unknown> | null;
};

function field(row: ReviewableOrderRow, key: string) {
  const value = row.parsed_payload?.[key];
  return typeof value === 'string' ? value : '';
}

export function OrderQueueReviewButton({ row }: { row: ReviewableOrderRow }) {
  const navigate = useNavigate();
  const { data: customers } = useCustomers();
  const customerId = useMemo(() => {
    const wanted = field(row, 'customerName').toLowerCase().replace(/\s+/g, ' ').trim();
    if (!wanted) return '';
    return (customers ?? []).find(customer => customer.name.toLowerCase().replace(/\s+/g, ' ').trim() === wanted)?.id ?? '';
  }, [customers, row]);

  const open = async () => {
    await supabase.functions.invoke('order-inbox-api', { body: { action: 'mark', id: row.id } });
    const reference = field(row, 'orderReference');
    const organizationNumber = field(row, 'organizationNumber');
    const weight = row.parsed_payload?.weightKg;
    const additions = [
      reference && `Orderreferens: ${reference}`,
      organizationNumber && `Org.nr: ${organizationNumber}`,
      typeof weight === 'number' && `Vikt: ${weight} kg`,
    ].filter(Boolean).join('\n');

    navigate('/admin/assignments/new', { state: {
      copy: {
        title: field(row, 'title') || row.subject,
        customer_id: customerId,
        service_type: field(row, 'serviceType'),
        pickup_address: field(row, 'pickupAddress'),
        delivery_address: field(row, 'deliveryAddress'),
        instructions: [field(row, 'instructions'), additions].filter(Boolean).join('\n\n'),
        require_photo: true,
        require_signature: true,
      },
      importedScheduledStart: field(row, 'scheduledStart'),
      source: 'inbound-order-email',
      inboundEmailId: row.id,
    } });
  };

  return <Button disabled={!row.parsed_payload || row.status === 'processing' || row.status === 'failed'} onClick={() => void open()}>Granska och skapa</Button>;
}

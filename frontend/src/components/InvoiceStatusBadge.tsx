import { invoiceStatusLabels } from '@/lib/types';
import { cn } from '@/lib/utils';

interface InvoiceStatusBadgeProps {
  status: string;
  className?: string;
}

export function InvoiceStatusBadge({ status, className }: InvoiceStatusBadgeProps) {
  return (
    <span className={cn('status-badge', {
      'bg-muted text-muted-foreground': status === 'draft',
      'bg-primary/15 text-primary': status === 'sent',
      'bg-success/15 text-success': status === 'paid',
      'bg-destructive/15 text-destructive': status === 'overdue',
    }, className)}>
      {invoiceStatusLabels[status as keyof typeof invoiceStatusLabels] || status}
    </span>
  );
}

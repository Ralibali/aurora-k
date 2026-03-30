import { statusLabels } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('status-badge', {
      'status-pending': status === 'pending',
      'status-active': status === 'active',
      'status-completed': status === 'completed',
    }, className)}>
      {statusLabels[status as keyof typeof statusLabels] || status}
    </span>
  );
}

import { statusLabels } from '@/lib/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const dotColors: Record<string, string> = {
  pending: 'bg-muted-foreground/50',
  active: 'bg-warning animate-pulse',
  completed: 'bg-success',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn('status-badge', {
      'status-pending': status === 'pending',
      'status-active': status === 'active',
      'status-completed': status === 'completed',
    }, className)}>
      <span className={cn('inline-block h-1.5 w-1.5 rounded-full mr-1.5', dotColors[status] || 'bg-muted-foreground/50')} />
      {statusLabels[status as keyof typeof statusLabels] || status}
    </span>
  );
}

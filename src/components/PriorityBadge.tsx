import { priorityLabels } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span className={cn('status-badge', {
      'bg-muted text-muted-foreground': priority === 'low',
      'bg-primary/10 text-primary': priority === 'normal',
      'bg-destructive/15 text-destructive': priority === 'urgent',
    }, className)}>
      {priorityLabels[priority as keyof typeof priorityLabels] || priority}
    </span>
  );
}

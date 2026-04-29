import { priorityLabels } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium', {
      'bg-muted text-muted-foreground': priority === 'low',
      'bg-primary/10 text-primary': priority === 'normal',
      'bg-destructive/10 text-destructive': priority === 'urgent',
    }, className)}>
      {priorityLabels[priority as keyof typeof priorityLabels] || priority}
    </span>
  );
}

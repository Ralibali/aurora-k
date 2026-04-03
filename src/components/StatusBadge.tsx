import { cn } from '@/lib/utils';
import { Check, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const config: Record<string, { label: string; dot?: string; icon?: 'check' | 'warning'; border?: boolean; bg: string; text: string }> = {
  pending: { label: 'Tilldelad', dot: 'bg-primary', bg: 'bg-primary/10', text: 'text-primary' },
  active: { label: 'Pågående', dot: 'bg-success animate-pulse-dot', bg: 'bg-success/10', text: 'text-success' },
  completed: { label: 'Slutförd', icon: 'check', bg: 'bg-muted', text: 'text-muted-foreground' },
  delayed: { label: 'Försenad', icon: 'warning', bg: 'bg-warning/10', text: 'text-warning' },
  unassigned: { label: 'Ej tilldelad', border: true, bg: 'bg-transparent', text: 'text-destructive' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const c = config[status] ?? { label: status, bg: 'bg-muted', text: 'text-muted-foreground' };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium animate-status-crossfade',
      c.bg, c.text,
      c.border && 'border border-destructive/40',
      className
    )}>
      {c.dot && <span className={cn('h-1.5 w-1.5 rounded-full', c.dot)} />}
      {c.icon === 'check' && <Check className="h-3 w-3" />}
      {c.icon === 'warning' && <AlertTriangle className="h-3 w-3" />}
      {c.label}
    </span>
  );
}

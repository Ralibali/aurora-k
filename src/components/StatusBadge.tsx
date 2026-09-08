import { cn } from '@/lib/utils';
import { Check, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const config: Record<string, { label: string; dot?: string; dotPulse?: boolean; icon?: 'check' | 'warning'; border?: boolean; bg: string; text: string }> = {
  pending:     { label: 'Planerad',    dot: 'bg-blue-500',  bg: 'bg-blue-100 dark:bg-blue-500/15',  text: 'text-blue-700 dark:text-blue-300' },
  active:      { label: 'Pågående',    dot: 'bg-green-500', dotPulse: true, bg: 'bg-green-100 dark:bg-green-500/15', text: 'text-green-700 dark:text-green-300' },
  completed:   { label: 'Slutförd',    icon: 'check',       bg: 'bg-muted', text: 'text-muted-foreground' },
  delayed:     { label: 'Försenad',    dot: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-500/15', text: 'text-amber-700 dark:text-amber-300' },
  cancelled:   { label: 'Avbokad',     bg: 'bg-muted',     text: 'text-muted-foreground' },
  unassigned:  { label: 'Ej tilldelad', border: true,       bg: 'bg-red-50 dark:bg-red-500/10',    text: 'text-red-600 dark:text-red-300' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const c = config[status] ?? { label: status, bg: 'bg-muted', text: 'text-muted-foreground' };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
      c.bg, c.text,
      c.border && 'border border-red-300 dark:border-red-500/30',
      className
    )}>
      {c.dot && (
        <span className="relative flex h-1.5 w-1.5">
          {c.dotPulse && <span className={cn('motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', c.dot)} />}
          <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', c.dot)} />
        </span>
      )}
      {c.icon === 'check' && <Check className="h-3 w-3" />}
      {c.icon === 'warning' && <AlertTriangle className="h-3 w-3" />}
      {c.label}
    </span>
  );
}

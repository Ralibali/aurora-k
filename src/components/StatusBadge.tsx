import { cn } from '@/lib/utils';
import { Check, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const config: Record<string, { label: string; dot?: string; dotPulse?: boolean; icon?: 'check' | 'warning'; border?: boolean; bg: string; text: string }> = {
  pending:     { label: 'Tilldelad',    dot: 'bg-blue-500',  bg: 'bg-blue-100',  text: 'text-blue-700' },
  active:      { label: 'Pågående',    dot: 'bg-green-500', dotPulse: true, bg: 'bg-green-100', text: 'text-green-700' },
  completed:   { label: 'Slutförd',    icon: 'check',       bg: 'bg-slate-100', text: 'text-slate-600' },
  delayed:     { label: 'Försenad',    dot: 'bg-amber-500', bg: 'bg-amber-100', text: 'text-amber-700' },
  unassigned:  { label: 'Ej tilldelad', border: true,       bg: 'bg-red-50',    text: 'text-red-600' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const c = config[status] ?? { label: status, bg: 'bg-slate-100', text: 'text-slate-600' };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
      c.bg, c.text,
      c.border && 'border border-red-300',
      className
    )}>
      {c.dot && (
        <span className="relative flex h-1.5 w-1.5">
          {c.dotPulse && <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', c.dot)} />}
          <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', c.dot)} />
        </span>
      )}
      {c.icon === 'check' && <Check className="h-3 w-3" />}
      {c.icon === 'warning' && <AlertTriangle className="h-3 w-3" />}
      {c.label}
    </span>
  );
}

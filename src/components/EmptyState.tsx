import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Icon className="h-12 w-12 text-muted-foreground/20 mb-4" strokeWidth={1.5} />
      <h3 className="text-muted-foreground font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground/70 text-center max-w-sm mb-6">{description}</p>
      {actionLabel && actionHref && (
        <Button asChild><Link to={actionHref}>{actionLabel}</Link></Button>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

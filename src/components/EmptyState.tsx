import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Primary CTA label */
  actionLabel?: string;
  /** Primary CTA href (uses Link) */
  actionHref?: string;
  /** Primary CTA onClick (used if no href) */
  onAction?: () => void;
  /** Secondary CTA label */
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondary?: () => void;
  /** Helper hint shown below the buttons */
  hint?: string;
  /** Extra content (e.g. illustration mock) */
  children?: ReactNode;
  /** Visual variant — "card" wraps in a dashed card, "plain" leaves bare */
  variant?: 'card' | 'plain';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
  onSecondary,
  hint,
  children,
  variant = 'card',
}: EmptyStateProps) {
  const wrapperClass =
    variant === 'card'
      ? 'rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 md:py-16 shadow-sm'
      : 'py-12 md:py-16 px-4';

  return (
    <div className={`flex flex-col items-center justify-center text-center ${wrapperClass} animate-fade-in`}>
      <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/5 border border-primary/10 mb-5">
        <Icon className="h-7 w-7 text-primary/70" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">{description}</p>

      {(actionLabel || secondaryLabel) && (
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          {actionLabel && actionHref && (
            <Button asChild size="sm">
              <Link to={actionHref}>{actionLabel}</Link>
            </Button>
          )}
          {actionLabel && onAction && !actionHref && (
            <Button onClick={onAction} size="sm">{actionLabel}</Button>
          )}
          {secondaryLabel && secondaryHref && (
            <Button asChild variant="outline" size="sm">
              <Link to={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          )}
          {secondaryLabel && onSecondary && !secondaryHref && (
            <Button onClick={onSecondary} variant="outline" size="sm">{secondaryLabel}</Button>
          )}
        </div>
      )}

      {hint && (
        <p className="text-xs text-muted-foreground/70 mt-5 max-w-sm">{hint}</p>
      )}

      {children && <div className="mt-6 w-full">{children}</div>}
    </div>
  );
}

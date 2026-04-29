import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface UsageInfoCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Bullet points showing what the data is used for */
  usedFor?: string[];
  /** Optional secondary "next step" link */
  nextStep?: { label: string; href: string };
}

/**
 * Compact info banner shown above setup pages.
 * Explains what the data is used for downstream (e.g. articles → invoices).
 */
export function UsageInfoCard({ icon: Icon, title, description, usedFor, nextStep }: UsageInfoCardProps) {
  return (
    <div className="rounded-xl border border-primary/10 bg-gradient-to-br from-primary/5 via-card to-card p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>

          {usedFor && usedFor.length > 0 && (
            <ul className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {usedFor.map(item => (
                <li key={item} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-primary/40" />
                  {item}
                </li>
              ))}
            </ul>
          )}

          {nextStep && (
            <div className="mt-3">
              <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary hover:text-primary">
                <Link to={nextStep.href}>
                  {nextStep.label} <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
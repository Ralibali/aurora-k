import { AlertTriangle, ArrowRight, CheckCircle2, CircleDollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AttentionItem } from '@/features/dashboard/attention-items';

const styles = {
  red: { icon: 'bg-destructive/10 text-destructive', line: 'border-l-destructive', Icon: AlertTriangle },
  amber: { icon: 'bg-warning/10 text-amber-700 dark:text-amber-400', line: 'border-l-warning', Icon: AlertTriangle },
  green: { icon: 'bg-success/10 text-success', line: 'border-l-success', Icon: CircleDollarSign },
} as const;

export function AttentionQueue({ items, loading = false, incomplete = false }: {
  items: AttentionItem[];
  loading?: boolean;
  incomplete?: boolean;
}) {
  return (
    <section className="space-y-3" aria-labelledby="attention-heading" aria-busy={loading}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="attention-heading" className="text-base font-semibold">Att ta hand om</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Avvikelser och nästa steg, över alla datum.</p>
        </div>
        {!loading && items.length > 0 && <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{items.length} områden</span>}
      </div>
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-label="Laddar åtgärder">
          {[0, 1, 2].map(index => <Skeleton key={index} className="h-28 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <Card className="flex items-center gap-3 border-dashed p-4 shadow-none">
          <div className={cn('rounded-lg p-2', incomplete ? 'bg-muted text-muted-foreground' : 'bg-success/10 text-success')}>
            {incomplete ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-semibold">{incomplete ? 'Översikten är inte komplett' : 'Inga väntande åtgärder'}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{incomplete ? 'En del uppgifter kunde inte hämtas. Försök uppdatera sidan.' : 'Inga avvikelser eller fakturaunderlag att hantera just nu.'}</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map(item => {
            const { Icon, icon, line } = styles[item.tone];
            return (
              <Link key={item.id} to={item.href} className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Card className={cn('flex h-full gap-3 rounded-xl border-l-[3px] p-4 shadow-none transition-colors group-hover:bg-muted/40', line)}>
                  <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', icon)}><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold">{item.title}</p><span className="font-mono-ui text-lg font-semibold tabular-nums">{item.count}</span></div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">{item.action}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

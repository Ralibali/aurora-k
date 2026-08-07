import { AlertTriangle, ArrowRight, CheckCircle2, CircleDollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { AttentionItem } from '@/features/dashboard/attention-items';

const styles = {
  red: { card: 'border-red-200 bg-red-50', icon: 'bg-red-100 text-red-700', Icon: AlertTriangle },
  amber: { card: 'border-amber-200 bg-amber-50', icon: 'bg-amber-100 text-amber-700', Icon: AlertTriangle },
  green: { card: 'border-green-200 bg-green-50', icon: 'bg-green-100 text-green-700', Icon: CircleDollarSign },
} as const;

export function AttentionQueue({ items }: { items: AttentionItem[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div><h3 className="font-semibold">Kräver din uppmärksamhet</h3><p className="text-xs text-muted-foreground">Avvikelser och åtgärder som väntar.</p></div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{items.reduce((sum, item) => sum + item.count, 0)} åtgärder</span>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">
          <div className="rounded-lg bg-green-100 p-2"><CheckCircle2 className="h-5 w-5 text-green-700" /></div>
          <div><p className="font-semibold">Allt ser bra ut</p><p className="text-sm text-green-800">Inga akuta avvikelser eller väntande ekonomiska åtgärder.</p></div>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map(item => {
            const style = styles[item.tone];
            const Icon = style.Icon;
            return (
              <div key={item.id} className={`flex items-start gap-3 rounded-xl border p-4 ${style.card}`}>
                <div className={`relative rounded-lg p-2 ${style.icon}`}><Icon className="h-5 w-5" /><span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-950 px-1 text-[10px] font-bold text-white">{item.count}</span></div>
                <div className="min-w-0 flex-1"><p className="font-semibold">{item.title}</p><p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p><Button variant="link" size="sm" className="mt-2 h-auto p-0" asChild><Link to={item.href}>{item.action}<ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button></div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

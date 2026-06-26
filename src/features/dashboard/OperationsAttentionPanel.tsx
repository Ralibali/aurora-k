import { AlertTriangle, ArrowRight, CircleDollarSign, Clock3, UserRoundX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Assignment = {
  id: string;
  title: string;
  status: string;
  priority?: string | null;
  assigned_driver_id?: string | null;
  scheduled_start?: string | null;
};

type Invoice = {
  id: string;
  status: string;
  due_date?: string | null;
};

type AttentionItem = {
  key: string;
  title: string;
  description: string;
  count: number;
  href: string;
  tone: 'critical' | 'warning' | 'info';
  icon: typeof AlertTriangle;
};

const toneClasses = {
  critical: 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100',
  info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100',
};

export function OperationsAttentionPanel({ assignments, invoices }: {
  assignments: Assignment[];
  invoices: Invoice[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  const now = Date.now();
  const openAssignments = assignments.filter(item => !['completed', 'cancelled'].includes(item.status));
  const unassignedToday = openAssignments.filter(item => item.scheduled_start?.startsWith(today) && !item.assigned_driver_id).length;
  const urgent = openAssignments.filter(item => item.priority === 'urgent' || item.priority === 'high').length;
  const delayed = openAssignments.filter(item => item.status === 'delayed').length;
  const overdue = invoices.filter(item => item.status === 'overdue' || (item.status === 'sent' && item.due_date && new Date(item.due_date).getTime() < now)).length;

  const items: AttentionItem[] = [
    {
      key: 'delayed',
      title: 'Försenade uppdrag',
      description: 'Pågående uppdrag som behöver följas upp direkt.',
      count: delayed,
      href: '/admin/assignments',
      tone: 'critical',
      icon: Clock3,
    },
    {
      key: 'unassigned',
      title: 'Saknar chaufför idag',
      description: 'Planerade körningar utan tilldelad chaufför.',
      count: unassignedToday,
      href: '/admin/assignments',
      tone: 'warning',
      icon: UserRoundX,
    },
    {
      key: 'urgent',
      title: 'Brådskande uppdrag',
      description: 'Högprioriterade uppdrag som fortfarande är öppna.',
      count: urgent,
      href: '/admin/assignments',
      tone: 'warning',
      icon: AlertTriangle,
    },
    {
      key: 'overdue',
      title: 'Förfallna fakturor',
      description: 'Fakturor som behöver betalningsuppföljning.',
      count: overdue,
      href: '/admin/invoices',
      tone: 'info',
      icon: CircleDollarSign,
    },
  ].filter(item => item.count > 0);

  return (
    <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Kräver din uppmärksamhet</h3>
            {items.length > 0 && <Badge variant="destructive" className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]">{items.reduce((sum, item) => sum + item.count, 0)}</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Det viktigaste att hantera just nu.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">✓</div>
          <p className="font-medium">Allt ser bra ut</p>
          <p className="mt-1 text-sm text-muted-foreground">Inga akuta uppgifter eller förfallna fakturor.</p>
        </div>
      ) : (
        <div className="space-y-2 p-3">
          {items.map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.key} to={item.href} className={`group flex items-center gap-3 rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow-sm ${toneClasses[item.tone]}`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/70 shadow-sm dark:bg-black/20"><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-semibold">{item.title}</p><Badge variant="outline" className="bg-white/60 dark:bg-black/20">{item.count}</Badge></div><p className="mt-0.5 text-xs opacity-75">{item.description}</p></div>
                <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            );
          })}
        </div>
      )}

      <div className="border-t px-4 py-3">
        <Button variant="ghost" size="sm" asChild className="w-full justify-center"><Link to="/admin/assignments">Öppna dispatchvyn <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
      </div>
    </section>
  );
}

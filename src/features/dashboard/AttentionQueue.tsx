import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import type { AttentionItem } from '@/features/dashboard/attention-items';
export function AttentionQueue({items, loading = false, incomplete = false}: {items: AttentionItem[]; loading?: boolean; incomplete?: boolean}) {
 return <section aria-labelledby="attention-heading" aria-busy={loading}>
  <h2 id="attention-heading" className="mb-4 text-lg font-semibold">Behöver dig nu</h2>
  {loading ? <Skeleton className="h-28 rounded-2xl" /> : <div className="admin-attention">
   {items.length ? items.map(item => <Link key={item.id} to={item.href} className="admin-attention-row">
    <AlertTriangle className={`h-4 w-4 shrink-0 ${item.tone === 'red' ? 'text-destructive' : item.tone === 'green' ? 'text-success' : 'text-warning'}`} />
    <div className="min-w-0"><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.description}</p></div>
    <span className="admin-attention-count">{item.count}</span><span className="admin-attention-action text-sm">{item.action}</span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
   </Link>) : <div className="admin-attention-row"><CheckCircle2 className="h-5 w-5 text-success" /><p className="text-sm">{incomplete ? 'Alla uppgifter kunde inte hämtas. Prova att uppdatera.' : 'Allt ser lugnt ut. Inget väntar på dig just nu.'}</p></div>}
  </div>}
 </section>;
}

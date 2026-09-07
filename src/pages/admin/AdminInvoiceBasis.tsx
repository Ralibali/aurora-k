import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssignments, useCustomers } from '@/hooks/useData';
import { csvCell, invoiceReadiness } from '@/lib/invoice-readiness';
import { useAssignmentDeviations } from '@/lib/assignment-deviations';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { FileSpreadsheet, FilePlus2, Search, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';

type StatusFilter = 'ready' | 'invoiced' | 'all';

const fmtSek = (v: number) =>
  new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(v || 0);

export default function AdminInvoiceBasis() {
  const { data: assignments, isLoading } = useAssignments();
  const { data: customers } = useCustomers();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ready');
  const [customerId, setCustomerId] = useState<string>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const deviations=useAssignmentDeviations();
  const openCounts=useMemo(()=>{const counts=new Map<string,number>();for(const d of deviations.data??[])counts.set(d.assignment_id,(counts.get(d.assignment_id)??0)+1);return counts;},[deviations.data]);
  const readiness=useCallback((a:NonNullable<typeof assignments>[number])=>invoiceReadiness(a,openCounts.get(a.id)??0,!deviations.isPending&&!deviations.isError),[openCounts,deviations.isPending,deviations.isError]);


  const completedAssignments = useMemo(() => {
    return (assignments ?? []).filter((a) => a.status === 'completed');
  }, [assignments]);

  const filtered = useMemo(() => {
    return completedAssignments.filter((a) => {
      if (status === 'ready' && a.invoiced) return false;
      if (status === 'invoiced' && !a.invoiced) return false;
      if (customerId !== 'all' && a.customer_id !== customerId) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${a.title} ${a.address} ${a.customer?.name ?? ''} ${a.driver?.full_name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [completedAssignments, status, customerId, search]);

  // Group by customer for the "skapa underlag" workflow
  const groupedByCustomer = useMemo(() => {
    const map = new Map<string, { customer: (typeof filtered)[number]['customer']; assignments: (typeof filtered)[number][]; total: number; hours: number }>();
    filtered.forEach((a) => {
      if (!a.customer_id || !readiness(a).ready) return;
      const { hours, amount } = readiness(a);
      const entry = map.get(a.customer_id) ?? { customer: a.customer, assignments: [], total: 0, hours: 0 };
      entry.assignments.push(a);
      entry.total += amount ?? 0;
      entry.hours += hours ?? 0;
      map.set(a.customer_id, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered, readiness]);

  const stats = useMemo(() => {
    const ready = completedAssignments.filter((a) => readiness(a).ready);
    const invoiced = completedAssignments.filter((a) => a.invoiced);
    const readyAmount = ready.reduce((sum, a) => sum + (readiness(a).amount ?? 0), 0);
    return {
      readyCount: ready.length,
      readyAmount,
      invoicedCount: invoiced.length,
      customerCount: new Set(ready.map((a) => a.customer_id)).size,
    };
  }, [completedAssignments, readiness]);

  const eligible=filtered.filter(a=>readiness(a).ready);
  const selectedVisible=filtered.filter(a=>selected.has(a.id));
  const selectedForInvoice=selectedVisible.filter(a=>readiness(a).ready);
  const toggleAll=()=>setSelected(previous=>{
    const result=new Set(previous);const all=eligible.length>0&&eligible.every(a=>previous.has(a.id));
    for(const a of eligible){if(all)result.delete(a.id);else result.add(a.id);}return result;
  });

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const exportCsv = () => {
    const rows = (selectedVisible.length ? selectedVisible : filtered).map((a) => {
      const { hours, amount } = readiness(a);
      return {
        Datum: a.actual_start ? format(new Date(a.actual_start), 'yyyy-MM-dd', { locale: sv }) : '',
        Uppdrag: a.title,
        Kund: a.customer?.name ?? '',
        Förare: a.driver?.full_name ?? '',
        Adress: a.address,
        Timmar: hours?.toFixed(2) ?? '',
        Belopp: amount?.toFixed(2) ?? '',
        Kontroll: readiness(a).issues.join('; '),
        Status: a.invoiced ? 'Fakturerat' : 'Ej fakturerat',
      };
    });
    if (rows.length === 0) {
      toast.error('Inga rader att exportera');
      return;
    }
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(';'),
      ...rows.map((r) => headers.map((h) => csvCell(r[h as keyof typeof r])).join(';')),
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fakturaunderlag-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exporterade ${rows.length} rader`);
  };

  const createInvoiceUrl = (custId?: string, ids?: string[]) => {
    const params = new URLSearchParams();
    if (custId) params.set('customer', custId);
    if (ids && ids.length) params.set('assignments', ids.join(','));
    return `/admin/invoices/new${params.toString() ? `?${params}` : ''}`;
  };

  if (isLoading) {
    return (
      <AdminLayout title="Fakturaunderlag">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Fakturaunderlag" description="Granska slutförda uppdrag, leveransbevis och avvikelser före fakturering">
      {(deviations.isPending||deviations.isError)&&<div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-4 mb-5 text-sm text-amber-900">{deviations.isError?'Avvikelserna kunde inte kontrolleras. Fakturering från denna lista väntar tills kontrollen fungerar.':'Kontrollerar öppna avvikelser…'}{deviations.isError&&<Button variant="outline" size="sm" className="ml-3" onClick={()=>void deviations.refetch()}>Försök igen</Button>}</div>}
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="h-5 w-5 text-amber-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Färdiga att fakturera</p>
                <p className="text-2xl font-bold">{stats.readyCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><AlertCircle className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Belopp att fakturera</p>
                <p className="text-2xl font-bold">{fmtSek(stats.readyAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><FilePlus2 className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Kunder</p>
                <p className="text-2xl font-bold">{stats.customerCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Fakturerade</p>
                <p className="text-2xl font-bold">{stats.invoicedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-customer summary cards */}
      {status === 'ready' && groupedByCustomer.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Fakturaunderlag per kund</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupedByCustomer.map((group) => (
                <div key={group.customer?.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{group.customer?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {group.assignments.length} uppdrag · {group.hours.toFixed(1)}h
                      </p>
                    </div>
                    <Badge variant="secondary">{fmtSek(group.total)}</Badge>
                  </div>
                  <Button asChild size="sm" className="w-full mt-2">
                    <Link to={createInvoiceUrl(group.customer?.id, group.assignments.map((a) => a.id))}>
                      <FilePlus2 className="h-4 w-4 mr-2" /> Skapa faktura
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters + table */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök på uppdrag, kund, förare..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ready">Att fakturera</SelectItem>
                <SelectItem value="invoiced">Fakturerade</SelectItem>
                <SelectItem value="all">Alla slutförda</SelectItem>
              </SelectContent>
            </Select>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="w-full md:w-56"><SelectValue placeholder="Alla kunder" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alla kunder</SelectItem>
                {(customers ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> {selectedVisible.length ? `Exportera markerade (${selectedVisible.length})` : 'Exportera CSV'}
            </Button>
            {selectedForInvoice.length > 0 && (() => {
              const selArr = selectedForInvoice;
              const custIds = new Set(selArr.map((a) => a.customer_id));
              if (custIds.size === 1) {
                const cid = [...custIds][0];
                return (
                  <Button asChild>
                    <Link to={createInvoiceUrl(cid, selArr.map((a) => a.id))}>
                      <FilePlus2 className="h-4 w-4 mr-2" /> Skapa faktura ({selectedForInvoice.length})
                    </Link>
                  </Button>
                );
              }
              return (
                <Button disabled title="Markerade uppdrag tillhör olika kunder">
                  <FilePlus2 className="h-4 w-4 mr-2" /> Olika kunder
                </Button>
              );
            })()}
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={FilePlus2}
              title="Inga underlag"
              description={status === 'ready' ? 'Alla slutförda uppdrag är fakturerade.' : 'Inga uppdrag matchar filtret.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={eligible.length > 0 && eligible.every(a=>selected.has(a.id))}
                        disabled={eligible.length===0}
                        aria-label="Markera alla färdiga uppdrag"
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Uppdrag</TableHead>
                    <TableHead>Kund</TableHead>
                    <TableHead>Förare</TableHead>
                    <TableHead className="text-right">Timmar</TableHead>
                    <TableHead className="text-right">Belopp</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => {
                    const { hours, amount } = readiness(a);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Checkbox aria-label={`Markera ${a.title}`} disabled={!readiness(a).ready} checked={selected.has(a.id)} onCheckedChange={() => toggleOne(a.id)} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {a.actual_start ? format(new Date(a.actual_start), 'd MMM yyyy', { locale: sv }) : '—'}
                        </TableCell>
                        <TableCell>
                          <Link to={`/admin/assignments/${a.id}`} className="font-medium hover:underline">
                            {a.title}
                          </Link>
                        </TableCell>
                        <TableCell>{a.customer?.name ?? '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.driver?.full_name ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{hours?.toFixed(2) ?? '—'}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{amount===null?'Saknas':fmtSek(amount)}</TableCell>
                        <TableCell>
                          {a.invoiced ? (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:text-green-400">
                              Fakturerat
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                              {readiness(a).ready ? 'Att fakturera' : 'Behöver granskas'}
                            </Badge>
                          )}
                          {!a.invoiced&&readiness(a).issues.length>0&&<ul className="mt-2 text-xs text-amber-800 space-y-1">{readiness(a).issues.map(issue=><li key={issue}>{issue}</li>)}</ul>}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
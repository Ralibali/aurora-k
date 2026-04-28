import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBookingRequests, useUpdateBookingRequest } from '@/hooks/useAllFeatures';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Check,
  ClipboardCheck,
  Eye,
  Filter,
  Inbox,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';

const statusLabels: Record<string, string> = {
  pending: 'Ny förfrågan',
  accepted: 'Bekräftad',
  rejected: 'Avböjd',
  needs_info: 'Behöver komplettering',
  quote_sent: 'Offert skickad',
  planned: 'Planerad',
  on_the_way: 'På väg',
  completed: 'Utförd',
  invoiced: 'Fakturerad',
};

const statusVariant = (status: string) => {
  if (status === 'pending') return 'default';
  if (status === 'accepted' || status === 'planned' || status === 'completed') return 'secondary';
  if (status === 'rejected') return 'destructive';
  return 'outline';
};

export default function AdminBookingRequests() {
  const { data: requests, isLoading } = useBookingRequests();
  const update = useUpdateBookingRequest();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const localDemoRequests = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('aurora_public_booking_requests') || '[]');
    } catch {
      return [];
    }
  }, []);

  const allRequests = useMemo(() => {
    const remote = requests ?? [];
    return [...localDemoRequests, ...remote];
  }, [requests, localDemoRequests]);

  const filtered = useMemo(() => {
    return allRequests.filter((r: any) => {
      const haystack = `${r.customer_name} ${r.title} ${r.customer_email} ${r.customer_phone} ${r.description}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allRequests, search, statusFilter]);

  const pendingCount = allRequests.filter((r: any) => r.status === 'pending').length;
  const urgentCount = allRequests.filter((r: any) => String(r.description ?? '').toLowerCase().includes('brådskande: ja')).length;
  const acceptedCount = allRequests.filter((r: any) => r.status === 'accepted').length;

  return (
    <AdminLayout title="Bokningsförfrågningar">
      <div className="space-y-6">
        <div className="rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Badge className="mb-3 bg-blue-500/20 text-blue-100 hover:bg-blue-500/20">
                <Sparkles className="mr-1 h-3 w-3" /> Kundernas väg in
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Inkommande transportförfrågningar</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Här hamnar uppdrag från den publika bokningssidan. Granska, bekräfta, begär komplettering eller skapa en planerad order.
              </p>
            </div>
            <Button variant="secondary" asChild>
              <a href="/boka" target="_blank" rel="noreferrer"><Truck className="mr-2 h-4 w-4" /> Testa publik bokning</a>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-blue-50 p-3 text-blue-600"><Inbox className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{pendingCount}</p><p className="text-sm text-muted-foreground">Nya förfrågningar</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-amber-50 p-3 text-amber-600"><AlertTriangle className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{urgentCount}</p><p className="text-sm text-muted-foreground">Brådskande</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600"><ClipboardCheck className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{acceptedCount}</p><p className="text-sm text-muted-foreground">Bekräftade</p></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Förfrågningar</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Prioritera det nya, brådskande och ofullständiga först.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9 sm:w-72" placeholder="Sök kund, adress, uppdrag..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="sm:w-52"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla statusar</SelectItem>
                  <SelectItem value="pending">Ny förfrågan</SelectItem>
                  <SelectItem value="needs_info">Behöver komplettering</SelectItem>
                  <SelectItem value="quote_sent">Offert skickad</SelectItem>
                  <SelectItem value="accepted">Bekräftad</SelectItem>
                  <SelectItem value="planned">Planerad</SelectItem>
                  <SelectItem value="rejected">Avböjd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !allRequests.length ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Inbox className="h-8 w-8" /></div>
                <h3 className="text-lg font-semibold">Inga förfrågningar ännu</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  När en kund skickar in en transportförfrågan via /boka visas den här med status, kontaktuppgifter och komplett underlag.
                </p>
                <Button className="mt-5" asChild><a href="/boka" target="_blank" rel="noreferrer">Öppna publik bokningssida</a></Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kund</TableHead>
                    <TableHead>Uppdrag</TableHead>
                    <TableHead>Önskat datum</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Snabbåtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => {
                    const isUrgent = String(r.description ?? '').toLowerCase().includes('brådskande: ja');
                    const isLocal = String(r.id ?? '').startsWith('AT-');
                    return (
                      <TableRow key={r.id} className={r.status === 'pending' ? 'bg-blue-50/40' : undefined}>
                        <TableCell>
                          <div className="font-medium">{r.customer_name}</div>
                          {isUrgent && <Badge variant="outline" className="mt-1 border-amber-300 bg-amber-50 text-amber-700">Brådskande</Badge>}
                        </TableCell>
                        <TableCell className="max-w-[360px]">
                          <div className="font-medium">{r.title}</div>
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground whitespace-pre-wrap">{r.description || 'Ingen beskrivning'}</p>
                        </TableCell>
                        <TableCell>{r.preferred_date || '—'}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {r.customer_email || '—'}</div>
                          <div className="mt-1 flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {r.customer_phone || '—'}</div>
                        </TableCell>
                        <TableCell><Badge variant={statusVariant(r.status) as any}>{statusLabels[r.status] || r.status}</Badge>{isLocal && <div className="mt-1 text-[11px] text-muted-foreground">Lokalt demo-läge</div>}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Granska"><Eye className="h-3.5 w-3.5" /></Button>
                            {!isLocal && r.status === 'pending' && (
                              <>
                                <Button variant="ghost" size="icon" title="Bekräfta" onClick={() => update.mutate({ id: r.id, status: 'accepted' })}><Check className="h-3.5 w-3.5 text-green-600" /></Button>
                                <Button variant="ghost" size="icon" title="Begär komplettering" onClick={() => update.mutate({ id: r.id, status: 'needs_info' })}><MessageSquare className="h-3.5 w-3.5 text-amber-600" /></Button>
                                <Button variant="ghost" size="icon" title="Avböj" onClick={() => update.mutate({ id: r.id, status: 'rejected' })}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

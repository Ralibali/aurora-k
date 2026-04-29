import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBookingRequests, useUpdateBookingRequest } from '@/hooks/useAllFeatures';
import { AlertTriangle, Check, ClipboardPlus, ExternalLink, Filter, Inbox, Mail, Phone, Search, Sparkles, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const statusLabels: Record<string, string> = {
  pending: 'Ny förfrågan',
  accepted: 'Accepterad',
  rejected: 'Avvisad',
  needs_info: 'Behöver komplettering',
};

function extractPickupAddress(description?: string | null) {
  const match = description?.match(/Hämtning:\s*(.*)/i);
  return match?.[1]?.trim() || '';
}

function isUrgent(description?: string | null) {
  return String(description || '').toLowerCase().includes('brådskande: ja');
}

export default function AdminBookingRequests() {
  const navigate = useNavigate();
  const { data: requests, isLoading } = useBookingRequests();
  const update = useUpdateBookingRequest();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return (requests ?? []).filter((r: any) => {
      const haystack = `${r.customer_name} ${r.title} ${r.customer_email} ${r.customer_phone} ${r.description}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  const pending = (requests ?? []).filter((r: any) => r.status === 'pending').length;
  const urgent = (requests ?? []).filter((r: any) => isUrgent(r.description)).length;
  const accepted = (requests ?? []).filter((r: any) => r.status === 'accepted').length;

  const createAssignmentFromRequest = (r: any) => {
    navigate('/admin/assignments/new', {
      state: {
        copy: {
          title: r.title,
          address: extractPickupAddress(r.description),
          instructions: r.description || '',
          priority: isUrgent(r.description) ? 'urgent' : 'normal',
          admin_comment: `Skapad från bokningsförfrågan. Kontakt: ${r.customer_name || '—'} ${r.customer_phone || ''} ${r.customer_email || ''}`.trim(),
        },
        bookingRequestId: r.id,
      },
    });
  };

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
                Granska nya förfrågningar, prioritera brådskande uppdrag och skapa körbara uppdrag direkt till transportledningen.
              </p>
            </div>
            <Button variant="secondary" asChild>
              <a href="/boka" target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" /> Öppna publik bokning</a>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-blue-50 p-3 text-blue-600"><Inbox className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{pending}</p><p className="text-sm text-muted-foreground">Nya förfrågningar</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-amber-50 p-3 text-amber-600"><AlertTriangle className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{urgent}</p><p className="text-sm text-muted-foreground">Brådskande</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600"><Check className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{accepted}</p><p className="text-sm text-muted-foreground">Accepterade</p></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Intag</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Sök, filtrera och gör om rätt förfrågan till uppdrag.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9 sm:w-72" placeholder="Sök kund, uppdrag, adress..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="sm:w-52"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla statusar</SelectItem>
                  <SelectItem value="pending">Ny förfrågan</SelectItem>
                  <SelectItem value="accepted">Accepterad</SelectItem>
                  <SelectItem value="needs_info">Behöver komplettering</SelectItem>
                  <SelectItem value="rejected">Avvisad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !requests?.length ? (
              <div className="p-10 text-center text-muted-foreground">
                <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-foreground">Inga förfrågningar ännu</p>
                <p className="mx-auto mt-2 max-w-md text-sm">När kunder skickar in via /boka hamnar de här och kan göras om till riktiga uppdrag.</p>
                <Button className="mt-5" asChild><a href="/boka" target="_blank" rel="noreferrer">Testa bokningssidan</a></Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kund</TableHead>
                    <TableHead>Förfrågan</TableHead>
                    <TableHead>Önskat datum</TableHead>
                    <TableHead>Kontakt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Åtgärder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r: any) => {
                    const urgentRequest = isUrgent(r.description);
                    return (
                      <TableRow key={r.id} className={r.status === 'pending' ? 'bg-blue-50/40' : undefined}>
                        <TableCell className="font-medium">
                          {r.customer_name}
                          {urgentRequest && <Badge variant="outline" className="mt-1 block w-fit border-amber-300 bg-amber-50 text-amber-700">Brådskande</Badge>}
                        </TableCell>
                        <TableCell className="max-w-[380px]">
                          <p className="font-medium">{r.title}</p>
                          <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{r.description || 'Ingen beskrivning'}</p>
                        </TableCell>
                        <TableCell>{r.preferred_date || '—'}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {r.customer_email || '—'}</div>
                          <div className="mt-1 flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {r.customer_phone || '—'}</div>
                        </TableCell>
                        <TableCell><Badge variant={r.status === 'accepted' ? 'secondary' : r.status === 'rejected' ? 'destructive' : 'outline'}>{statusLabels[r.status] || r.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => createAssignmentFromRequest(r)}>
                              <ClipboardPlus className="mr-1 h-3.5 w-3.5" /> Skapa uppdrag
                            </Button>
                            {r.status === 'pending' && (
                              <>
                                <Button variant="ghost" size="icon" title="Acceptera" onClick={() => update.mutate({ id: r.id, status: 'accepted' })}><Check className="h-3.5 w-3.5 text-green-600" /></Button>
                                <Button variant="ghost" size="icon" title="Avvisa" onClick={() => update.mutate({ id: r.id, status: 'rejected' })}><X className="h-3.5 w-3.5 text-destructive" /></Button>
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

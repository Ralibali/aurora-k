import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrders, useCreateOrder } from '@/hooks/useNewFeatures';
import { useCustomers, useAssignments } from '@/hooks/useData';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowUpRight,
  CalendarClock,
  ClipboardList,
  ExternalLink,
  Filter,
  PackageCheck,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Truck,
} from 'lucide-react';

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  completed: 'Slutförd',
  cancelled: 'Avbruten',
};

const statusVariant = (status: string) => {
  if (status === 'active') return 'default';
  if (status === 'completed') return 'secondary';
  return 'destructive';
};

export default function AdminOrders() {
  const { data: orders, isLoading } = useOrders();
  const { data: customers } = useCustomers();
  const { data: assignments } = useAssignments();
  const createOrder = useCreateOrder();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const orderAssignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (assignments ?? []).forEach(a => {
      if ((a as any).order_id) {
        counts[(a as any).order_id] = (counts[(a as any).order_id] || 0) + 1;
      }
    });
    return counts;
  }, [assignments]);

  const filteredOrders = useMemo(() => {
    return (orders ?? []).filter(o => {
      const customerName = ((o as any).customer?.name ?? '').toLowerCase();
      const haystack = `${o.order_number} ${o.title} ${customerName} ${o.status}`.toLowerCase();
      const matchesSearch = haystack.includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  const activeOrders = (orders ?? []).filter(o => o.status === 'active').length;
  const totalAssignments = Object.values(orderAssignmentCounts).reduce((sum, count) => sum + count, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrder.mutate({ title, customer_id: customerId, description: description || null }, {
      onSuccess: () => {
        setDialogOpen(false);
        setTitle('');
        setCustomerId('');
        setDescription('');
      },
    });
  };

  return (
    <AdminLayout title="Beställningar">
      <div className="space-y-6">
        <div className="rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Badge className="mb-3 bg-blue-500/20 text-blue-100 hover:bg-blue-500/20">
                <Sparkles className="mr-1 h-3 w-3" /> Premium orderflöde
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Beställningar och inkomna transportuppdrag</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Samla kundens förfrågningar, planerade körningar och uppdrag under en tydlig beställning. Använd den publika bokningssidan för att få in rätt uppgifter från början.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="secondary" asChild>
                <Link to="/boka" target="_blank"><ExternalLink className="mr-2 h-4 w-4" /> Öppna bokningssida</Link>
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="mr-2 h-4 w-4" /> Ny beställning</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Ny beställning</DialogTitle></DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Titel *</Label>
                      <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="T.ex. Kranbil vecka 18" />
                    </div>
                    <div className="space-y-2">
                      <Label>Kund *</Label>
                      <Select value={customerId} onValueChange={setCustomerId} required>
                        <SelectTrigger><SelectValue placeholder="Välj kund" /></SelectTrigger>
                        <SelectContent>
                          {(customers ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Beskrivning</Label>
                      <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Kort sammanfattning av ordern" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button>
                      <Button type="submit">Skapa</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-blue-50 p-3 text-blue-600"><ShoppingCart className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{orders?.length ?? 0}</p><p className="text-sm text-muted-foreground">Totala beställningar</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600"><CalendarClock className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{activeOrders}</p><p className="text-sm text-muted-foreground">Aktiva order</p></div></CardContent></Card>
          <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-2xl bg-slate-100 p-3 text-slate-700"><PackageCheck className="h-5 w-5" /></div><div><p className="text-2xl font-bold">{totalAssignments}</p><p className="text-sm text-muted-foreground">Kopplade uppdrag</p></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Orderlista</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Sök, filtrera och följ upp beställningar.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9 sm:w-64" placeholder="Sök order, kund, nummer..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="sm:w-44"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla statusar</SelectItem>
                  <SelectItem value="active">Aktiva</SelectItem>
                  <SelectItem value="completed">Slutförda</SelectItem>
                  <SelectItem value="cancelled">Avbrutna</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !orders?.length ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <ClipboardList className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold">Inga beställningar ännu</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Här samlas kundernas transportförfrågningar och bokade uppdrag. Skapa en intern beställning eller aktivera en publik ordersida så att kunder kan lägga uppdrag direkt.
                </p>
                <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                  <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Ny beställning</Button>
                  <Button variant="outline" asChild><Link to="/boka" target="_blank"><ArrowUpRight className="mr-2 h-4 w-4" /> Öppna publik ordersida</Link></Button>
                  <Button variant="outline" asChild><Link to="/admin/booking-requests"><Truck className="mr-2 h-4 w-4" /> Bokningsförfrågningar</Link></Button>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordernr</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Kund</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uppdrag</TableHead>
                    <TableHead>Fokus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map(o => (
                    <TableRow key={o.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-xs font-semibold">{o.order_number}</TableCell>
                      <TableCell className="font-medium">{o.title}</TableCell>
                      <TableCell>{(o as any).customer?.name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(o.status) as any}>{statusLabels[o.status] || o.status}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{orderAssignmentCounts[o.id] || 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(orderAssignmentCounts[o.id] || 0) === 0 ? 'Koppla första uppdraget' : 'Planera, följ upp och fakturera'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

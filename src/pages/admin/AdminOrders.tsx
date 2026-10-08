import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrders, useCreateOrder } from '@/hooks/useNewFeatures';
import { useCustomers, useAssignments } from '@/hooks/useData';
import { Plus, ShoppingCart, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SmartOrderImportDialog } from '@/features/order-inbox/SmartOrderImportDialog';
import { PdfOrderImportDialog } from '@/features/order-inbox/PdfOrderImportDialog';
import { DocumentInboxPanel } from '@/features/order-inbox/DocumentInboxPanel';
import { OrderEmailQueue } from '@/features/order-inbox/OrderEmailQueue';
import { OrderQueuePanel } from '@/features/order-inbox/OrderQueuePanel';

const statusLabels: Record<string, string> = {
  active: 'Bekräftad',
  new: 'Ny',
  completed: 'Omvandlad',
  cancelled: 'Avbruten',
};

export default function AdminOrders() {
  const navigate = useNavigate();
  const { data: orders, isLoading } = useOrders();
  const { data: customers } = useCustomers();
  const { data: assignments } = useAssignments();
  const createOrder = useCreateOrder();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [description, setDescription] = useState('');

  const orderAssignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (assignments ?? []).forEach(assignment => {
      const orderId = (assignment as { order_id?: string | null }).order_id;
      if (orderId) counts[orderId] = (counts[orderId] || 0) + 1;
    });
    return counts;
  }, [assignments]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
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
    <AdminLayout title="Ordrar">
      <div className="space-y-5">

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Inkommande ordrar</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Ny order</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ny order</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Titel *</Label><Input value={title} onChange={event => setTitle(event.target.value)} required placeholder="T.ex. Flytt Storgatan 5" /></div>
                <div className="space-y-2"><Label>Kund *</Label><Select value={customerId} onValueChange={setCustomerId} required><SelectTrigger><SelectValue placeholder="Välj kund" /></SelectTrigger><SelectContent>{(customers ?? []).map(customer => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Beskrivning</Label><Textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Valfri beskrivning" /></div>
                <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button><Button type="submit">Skapa</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">{[1, 2, 3].map(item => <Skeleton key={item} className="h-10 w-full" />)}</div>
            ) : !orders?.length ? (
              <div className="py-12 text-center text-muted-foreground"><ShoppingCart className="mx-auto mb-3 h-10 w-10 opacity-30" /><p>Inga ordrar här ännu.</p><Button className="mt-4" onClick={()=>setDialogOpen(true)}>Ny order</Button></div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Titel</TableHead><TableHead>Kund</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Uppdrag</TableHead><TableHead>Åtgärd</TableHead></TableRow></TableHeader>
                <TableBody>{orders.map(order => <TableRow key={order.id}><TableCell className="font-mono text-xs">{order.order_number}</TableCell><TableCell className="font-medium">{order.title}</TableCell><TableCell>{(order as { customer?: { name?: string } }).customer?.name}</TableCell><TableCell><span className="admin-status" data-tone={orderAssignmentCounts[order.id] ? 'green' : order.status === 'cancelled' ? 'red' : 'orange'}>{orderAssignmentCounts[order.id] ? 'Omvandlad' : statusLabels[order.status] || 'Ny'}</span></TableCell><TableCell className="text-right font-mono">{orderAssignmentCounts[order.id] || 0}</TableCell><TableCell><Button variant="outline" disabled={order.status==='cancelled'} onClick={()=>navigate('/admin/assignments/new',{state:{copy:{title:order.title,customer_id:order.customer_id,order_id:order.id,instructions:order.description || ''}}})}>Gör till uppdrag</Button></TableCell></TableRow>)}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <details><summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">Import och orderinkorg</summary><div className="space-y-5 pt-3">
        <Card className="border-border bg-white">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Gör orderunderlag till uppdrag</div><p className="mt-1 text-sm text-muted-foreground">Ta emot order automatiskt eller tolka PDF, foton, mejltext och CSV.</p></div>
            <div className="flex flex-wrap gap-2"><SmartOrderImportDialog /><PdfOrderImportDialog /></div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2"><OrderEmailQueue /><OrderQueuePanel /></div>

        <DocumentInboxPanel />

        </div></details>
      </div>
    </AdminLayout>
  );
}

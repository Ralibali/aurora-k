import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrders, useCreateOrder, useUpdateOrder } from '@/hooks/useNewFeatures';
import { useCustomers, useAssignments } from '@/hooks/useData';
import { Plus, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

const statusLabels: Record<string, string> = {
  active: 'Aktiv',
  completed: 'Slutförd',
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
    (assignments ?? []).forEach(a => {
      if ((a as any).order_id) {
        counts[(a as any).order_id] = (counts[(a as any).order_id] || 0) + 1;
      }
    });
    return counts;
  }, [assignments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrder.mutate({ title, customer_id: customerId, description: description || null }, {
      onSuccess: () => { setDialogOpen(false); setTitle(''); setCustomerId(''); setDescription(''); },
    });
  };

  return (
    <AdminLayout title="Beställningar">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Samla flera uppdrag under en beställning.</p>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ny beställning</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ny beställning</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Titel *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="T.ex. Flytt Storgatan 5" />
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
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Valfri beskrivning" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button>
                  <Button type="submit">Skapa</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !orders?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Inga beställningar ännu</p>
                <p className="text-sm">Skapa en beställning för att gruppera uppdrag.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Titel</TableHead>
                    <TableHead>Kund</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Uppdrag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(o => (
                    <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                      <TableCell className="font-medium">{o.title}</TableCell>
                      <TableCell>{(o as any).customer?.name}</TableCell>
                      <TableCell>
                        <Badge variant={o.status === 'active' ? 'default' : o.status === 'completed' ? 'secondary' : 'destructive'}>
                          {statusLabels[o.status] || o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{orderAssignmentCounts[o.id] || 0}</TableCell>
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

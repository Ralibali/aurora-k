import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBookingRequests, useUpdateBookingRequest } from '@/hooks/useAllFeatures';
import { Check, X, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const statusLabels: Record<string, string> = { pending: 'Ny', accepted: 'Accepterad', rejected: 'Avvisad' };

export default function AdminBookingRequests() {
  const { data: requests, isLoading } = useBookingRequests();
  const update = useUpdateBookingRequest();

  return (
    <AdminLayout title="Bokningsförfrågningar">
      <div className="space-y-4">
        <p className="text-muted-foreground">Inkommande förfrågningar från kunder.</p>
        <Card><CardContent className="p-0">
          {isLoading ? <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> :
          !requests?.length ? <div className="text-center py-12 text-muted-foreground"><Inbox className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Inga förfrågningar</p></div> :
          <Table><TableHeader><TableRow><TableHead>Kund</TableHead><TableHead>Titel</TableHead><TableHead>Önskat datum</TableHead><TableHead>Kontakt</TableHead><TableHead>Status</TableHead><TableHead className="w-[100px]" /></TableRow></TableHeader>
            <TableBody>{requests.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.customer_name}</TableCell>
                <TableCell>{r.title}</TableCell>
                <TableCell>{r.preferred_date || '—'}</TableCell>
                <TableCell className="text-sm">{r.customer_email || r.customer_phone || '—'}</TableCell>
                <TableCell><Badge variant={r.status === 'accepted' ? 'secondary' : r.status === 'rejected' ? 'destructive' : 'outline'}>{statusLabels[r.status] || r.status}</Badge></TableCell>
                <TableCell>{r.status === 'pending' && <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => update.mutate({ id: r.id, status: 'accepted' })}><Check className="h-3.5 w-3.5 text-green-600" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => update.mutate({ id: r.id, status: 'rejected' })}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>}
        </CardContent></Card>
      </div>
    </AdminLayout>
  );
}

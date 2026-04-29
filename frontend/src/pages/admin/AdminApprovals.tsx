import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApprovals, useUpdateApproval } from '@/hooks/useAllFeatures';
import { useAuth } from '@/hooks/useAuth';
import { Check, X, ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const statusLabels: Record<string, string> = { pending: 'Väntande', approved: 'Godkänd', rejected: 'Avslagen' };

export default function AdminApprovals() {
  const { data: approvals, isLoading } = useApprovals();
  const updateApproval = useUpdateApproval();
  const { user } = useAuth();

  return (
    <AdminLayout title="Attestering">
      <div className="space-y-4">
        <p className="text-muted-foreground">Granska och godkänn eller avslå utförda uppdrag.</p>
        <Card><CardContent className="p-0">
          {isLoading ? <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> :
          !approvals?.length ? <div className="text-center py-12 text-muted-foreground"><ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Inga ärenden att attestera</p></div> :
          <Table><TableHeader><TableRow><TableHead>Uppdrag</TableHead><TableHead>Kund</TableHead><TableHead>Chaufför</TableHead><TableHead>Status</TableHead><TableHead className="w-[120px]" /></TableRow></TableHeader>
            <TableBody>{approvals.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{(a as any).assignment?.title}</TableCell>
                <TableCell>{(a as any).assignment?.customer?.name}</TableCell>
                <TableCell>{(a as any).assignment?.driver?.full_name}</TableCell>
                <TableCell><Badge variant={a.status === 'approved' ? 'secondary' : a.status === 'rejected' ? 'destructive' : 'outline'}>{statusLabels[a.status] || a.status}</Badge></TableCell>
                <TableCell>{a.status === 'pending' && <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => updateApproval.mutate({ id: a.id, status: 'approved', approved_by: user?.id })}><Check className="h-3.5 w-3.5 text-green-600" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => updateApproval.mutate({ id: a.id, status: 'rejected', approved_by: user?.id })}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>}
        </CardContent></Card>
      </div>
    </AdminLayout>
  );
}

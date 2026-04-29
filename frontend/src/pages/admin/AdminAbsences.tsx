import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDriverAbsences, useCreateAbsence, useUpdateAbsence, useDeleteAbsence } from '@/hooks/useAllFeatures';
import { useDrivers } from '@/hooks/useData';
import { Plus, Trash2, Check, X, CalendarOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const typeLabels: Record<string, string> = { vacation: 'Semester', sick: 'Sjuk', parental: 'Föräldraledig', other: 'Annat' };

export default function AdminAbsences() {
  const { data: absences, isLoading } = useDriverAbsences();
  const { data: drivers } = useDrivers();
  const createAbsence = useCreateAbsence();
  const updateAbsence = useUpdateAbsence();
  const deleteAbsence = useDeleteAbsence();

  const [open, setOpen] = useState(false);
  const [driverId, setDriverId] = useState('');
  const [type, setType] = useState('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAbsence.mutate({ driver_id: driverId, type, start_date: startDate, end_date: endDate, note: note || undefined }, {
      onSuccess: () => { setOpen(false); setDriverId(''); setType('vacation'); setStartDate(''); setEndDate(''); setNote(''); },
    });
  };

  return (
    <AdminLayout title="Frånvarohantering">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Hantera semester, sjukfrånvaro och annan ledighet.</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Registrera frånvaro</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrera frånvaro</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Chaufför *</Label>
                  <Select value={driverId} onValueChange={setDriverId}><SelectTrigger><SelectValue placeholder="Välj chaufför" /></SelectTrigger>
                    <SelectContent>{(drivers ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Från *</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Till *</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required /></div>
                </div>
                <div className="space-y-2"><Label>Anteckning</Label><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Valfritt" /></div>
                <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Avbryt</Button><Button type="submit">Registrera</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Card><CardContent className="p-0">
          {isLoading ? <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> :
          !absences?.length ? <div className="text-center py-12 text-muted-foreground"><CalendarOff className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Ingen frånvaro registrerad</p></div> :
          <Table><TableHeader><TableRow><TableHead>Chaufför</TableHead><TableHead>Typ</TableHead><TableHead>Period</TableHead><TableHead>Status</TableHead><TableHead className="w-[120px]" /></TableRow></TableHeader>
            <TableBody>{absences.map(a => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{(a as any).driver?.full_name}</TableCell>
                <TableCell><Badge variant="outline">{typeLabels[a.type] || a.type}</Badge></TableCell>
                <TableCell className="text-sm">{a.start_date} → {a.end_date}</TableCell>
                <TableCell>{a.approved ? <Badge variant="secondary">Godkänd</Badge> : <Badge variant="outline">Väntande</Badge>}</TableCell>
                <TableCell><div className="flex gap-1 justify-end">
                  {!a.approved && <Button variant="ghost" size="icon" onClick={() => updateAbsence.mutate({ id: a.id, approved: true })}><Check className="h-3.5 w-3.5 text-green-600" /></Button>}
                  <Button variant="ghost" size="icon" onClick={() => deleteAbsence.mutate(a.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>}
        </CardContent></Card>
      </div>
    </AdminLayout>
  );
}

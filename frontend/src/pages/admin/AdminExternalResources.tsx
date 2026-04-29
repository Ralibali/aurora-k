import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useExternalResources, useCreateExternalResource, useUpdateExternalResource, useDeleteExternalResource } from '@/hooks/useAllFeatures';
import { Plus, Pencil, Trash2, UsersRound } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminExternalResources() {
  const { data: resources, isLoading } = useExternalResources();
  const create = useCreateExternalResource();
  const update = useUpdateExternalResource();
  const del = useDeleteExternalResource();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [rate, setRate] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => { setEditId(null); setName(''); setCompany(''); setEmail(''); setPhone(''); setSpecialty(''); setRate(''); setNotes(''); };
  const openEdit = (r: any) => { setEditId(r.id); setName(r.name); setCompany(r.company||''); setEmail(r.email||''); setPhone(r.phone||''); setSpecialty(r.specialty||''); setRate(r.hourly_rate?String(r.hourly_rate):''); setNotes(r.notes||''); setOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = { name, company: company||undefined, email: email||undefined, phone: phone||undefined, specialty: specialty||undefined, hourly_rate: rate ? parseFloat(rate) : undefined, notes: notes||undefined };
    if (editId) update.mutate({ id: editId, ...p }, { onSuccess: () => { setOpen(false); reset(); } });
    else create.mutate(p, { onSuccess: () => { setOpen(false); reset(); } });
  };

  return (
    <AdminLayout title="Externa resurser">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Underleverantörer och externa samarbetspartners.</p>
          <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ny resurs</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? 'Redigera' : 'Ny extern resurs'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2"><Label>Namn *</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Företag</Label><Input value={company} onChange={e => setCompany(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Specialitet</Label><Input value={specialty} onChange={e => setSpecialty(e.target.value)} /></div>
                  <div className="space-y-2"><Label>E-post</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Telefon</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Timpris (kr)</Label><Input type="number" value={rate} onChange={e => setRate(e.target.value)} /></div>
                </div>
                <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => { setOpen(false); reset(); }}>Avbryt</Button><Button type="submit">{editId ? 'Spara' : 'Skapa'}</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Card><CardContent className="p-0">
          {isLoading ? <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div> :
          !resources?.length ? <div className="text-center py-12 text-muted-foreground"><UsersRound className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Inga externa resurser</p></div> :
          <Table><TableHeader><TableRow><TableHead>Namn</TableHead><TableHead>Företag</TableHead><TableHead>Specialitet</TableHead><TableHead>Kontakt</TableHead><TableHead className="text-right">Timpris</TableHead><TableHead className="w-[100px]" /></TableRow></TableHeader>
            <TableBody>{resources.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>{r.company || '—'}</TableCell>
                <TableCell>{r.specialty || '—'}</TableCell>
                <TableCell className="text-sm">{r.email || r.phone || '—'}</TableCell>
                <TableCell className="text-right">{r.hourly_rate ? `${r.hourly_rate} kr` : '—'}</TableCell>
                <TableCell><div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>}
        </CardContent></Card>
      </div>
    </AdminLayout>
  );
}

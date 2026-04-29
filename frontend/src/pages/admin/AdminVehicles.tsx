import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '@/hooks/useNewFeatures';
import { useAssignments } from '@/hooks/useData';
import { Plus, Pencil, Trash2, Car } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

const vehicleTypes = [
  { value: 'vehicle', label: 'Fordon' },
  { value: 'machine', label: 'Maskin' },
  { value: 'trailer', label: 'Släp' },
  { value: 'other', label: 'Övrigt' },
];

export default function AdminVehicles() {
  const { data: vehicles, isLoading } = useVehicles();
  const { data: assignments } = useAssignments();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [regNr, setRegNr] = useState('');
  const [type, setType] = useState('vehicle');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [notes, setNotes] = useState('');

  const vehicleAssignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (assignments ?? []).forEach(a => {
      if ((a as any).vehicle_id) {
        counts[(a as any).vehicle_id] = (counts[(a as any).vehicle_id] || 0) + 1;
      }
    });
    return counts;
  }, [assignments]);

  const resetForm = () => {
    setEditId(null); setName(''); setRegNr(''); setType('vehicle'); setMake(''); setModel(''); setYear(''); setNotes('');
  };

  const openEdit = (v: any) => {
    setEditId(v.id); setName(v.name); setRegNr(v.registration_number || ''); setType(v.type); setMake(v.make || ''); setModel(v.model || ''); setYear(v.year ? String(v.year) : ''); setNotes(v.notes || ''); setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name, registration_number: regNr || null, type, make: make || null, model: model || null, year: year ? parseInt(year) : null, notes: notes || null };
    if (editId) {
      updateVehicle.mutate({ id: editId, ...payload }, { onSuccess: () => { setDialogOpen(false); resetForm(); } });
    } else {
      createVehicle.mutate(payload, { onSuccess: () => { setDialogOpen(false); resetForm(); } });
    }
  };

  const typeLabel = (t: string) => vehicleTypes.find(vt => vt.value === t)?.label || t;

  return (
    <AdminLayout title="Fordon & objekt">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Hantera fordon, maskiner och objekt.</p>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nytt fordon</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? 'Redigera fordon' : 'Nytt fordon'}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Namn *</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} required placeholder="T.ex. Volvo FH16" />
                  </div>
                  <div className="space-y-2">
                    <Label>Reg.nummer</Label>
                    <Input value={regNr} onChange={e => setRegNr(e.target.value)} placeholder="ABC 123" />
                  </div>
                  <div className="space-y-2">
                    <Label>Typ</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {vehicleTypes.map(vt => <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Märke</Label>
                    <Input value={make} onChange={e => setMake(e.target.value)} placeholder="Volvo" />
                  </div>
                  <div className="space-y-2">
                    <Label>Modell</Label>
                    <Input value={model} onChange={e => setModel(e.target.value)} placeholder="FH16" />
                  </div>
                  <div className="space-y-2">
                    <Label>Årsmodell</Label>
                    <Input type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2024" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Anteckningar</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Valfria anteckningar" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Avbryt</Button>
                  <Button type="submit">{editId ? 'Spara' : 'Skapa'}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !vehicles?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Car className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Inga fordon registrerade</p>
                <p className="text-sm">Registrera fordon för att koppla dem till uppdrag.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Namn</TableHead>
                    <TableHead>Reg.nr</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Märke/Modell</TableHead>
                    <TableHead className="text-right">Uppdrag</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.name}</TableCell>
                      <TableCell className="font-mono text-xs">{v.registration_number || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{typeLabel(v.type)}</Badge></TableCell>
                      <TableCell>{[v.make, v.model].filter(Boolean).join(' ') || '—'}</TableCell>
                      <TableCell className="text-right">{vehicleAssignmentCounts[v.id] || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteVehicle.mutate(v.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
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

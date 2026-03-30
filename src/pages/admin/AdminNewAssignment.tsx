import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomers, useDrivers, useCreateAssignment } from '@/hooks/useData';
import { priorityLabels } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';

export default function AdminNewAssignment() {
  const navigate = useNavigate();
  const location = useLocation();
  const copyFrom = (location.state as any)?.copy;

  const { data: customers } = useCustomers();
  const { data: drivers } = useDrivers();
  const createAssignment = useCreateAssignment();

  const [title, setTitle] = useState(copyFrom ? `${copyFrom.title} (kopia)` : '');
  const [customerId, setCustomerId] = useState(copyFrom?.customer_id || '');
  const [address, setAddress] = useState(copyFrom?.address || '');
  const [instructions, setInstructions] = useState(copyFrom?.instructions || '');
  const [priority, setPriority] = useState(copyFrom?.priority || 'normal');
  const [scheduledStart, setScheduledStart] = useState('');
  const [scheduledEnd, setScheduledEnd] = useState('');
  const [driverId, setDriverId] = useState(copyFrom?.assigned_driver_id || '');
  const [adminComment, setAdminComment] = useState(copyFrom?.admin_comment || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAssignment.mutate({
      title,
      customer_id: customerId,
      address,
      instructions: instructions || null,
      scheduled_start: new Date(scheduledStart).toISOString(),
      scheduled_end: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
      assigned_driver_id: driverId,
      priority,
      admin_comment: adminComment || null,
    }, {
      onSuccess: () => navigate('/admin/assignments'),
    });
  };

  return (
    <AdminLayout title="Nytt uppdrag">
      <div className="max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
        </Button>

        <Card>
          <CardHeader><CardTitle>Skapa nytt uppdrag</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titel</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="T.ex. Leverans kontorsmöbler" required />
              </div>

              <div className="space-y-2">
                <Label>Kund</Label>
                <Select value={customerId} onValueChange={setCustomerId} required>
                  <SelectTrigger><SelectValue placeholder="Välj kund" /></SelectTrigger>
                  <SelectContent>
                    {(customers ?? []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Leveransadress</Label>
                <Input id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Gatuadress, stad" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instruktioner (valfritt)</Label>
                <Textarea id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Särskilda instruktioner..." />
              </div>

              <div className="space-y-2">
                <Label>Prioritet</Label>
                <div className="flex gap-2">
                  {(['low', 'normal', 'urgent'] as const).map(p => (
                    <label key={p} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm ${priority === p ? (p === 'urgent' ? 'border-destructive bg-destructive/5' : 'border-primary bg-primary/5') : 'border-border'}`}>
                      <input type="radio" name="priority" checked={priority === p} onChange={() => setPriority(p)} className="accent-primary" />
                      {priorityLabels[p]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Datum och starttid</Label>
                  <Input id="date" type="datetime-local" value={scheduledStart} onChange={e => setScheduledStart(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Sluttid (valfritt)</Label>
                  <Input id="end" type="datetime-local" value={scheduledEnd} onChange={e => setScheduledEnd(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tilldela chaufför</Label>
                <Select value={driverId} onValueChange={setDriverId} required>
                  <SelectTrigger><SelectValue placeholder="Välj chaufför" /></SelectTrigger>
                  <SelectContent>
                    {(drivers ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Intern kommentar (valfritt)</Label>
                <Textarea id="comment" value={adminComment} onChange={e => setAdminComment(e.target.value)} placeholder="Meddelande till chauffören..." />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={createAssignment.isPending}>
                  {createAssignment.isPending ? 'Skapar...' : 'Skapa uppdrag'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Avbryt</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCustomers, useDrivers, useCreateAssignment } from '@/hooks/useData';
import { priorityLabels } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly';

function addInterval(date: Date, freq: RecurrenceFrequency): Date {
  const d = new Date(date);
  switch (freq) {
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'biweekly': d.setDate(d.getDate() + 14); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
  }
  return d;
}

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

  // Recurrence
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('weekly');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const baseStart = new Date(scheduledStart);
    const baseEnd = scheduledEnd ? new Date(scheduledEnd) : null;
    const durationMs = baseEnd ? baseEnd.getTime() - baseStart.getTime() : 0;

    const dates: { start: Date; end: Date | null }[] = [{ start: baseStart, end: baseEnd }];

    if (recurrenceEnabled && recurrenceEndDate) {
      const endLimit = new Date(recurrenceEndDate + 'T23:59:59');
      let nextStart = addInterval(baseStart, recurrenceFrequency);
      while (nextStart <= endLimit) {
        dates.push({
          start: nextStart,
          end: baseEnd ? new Date(nextStart.getTime() + durationMs) : null,
        });
        nextStart = addInterval(nextStart, recurrenceFrequency);
      }
    }

    try {
      for (const d of dates) {
        await new Promise<void>((resolve, reject) => {
          createAssignment.mutate({
            title,
            customer_id: customerId,
            address,
            instructions: instructions || null,
            scheduled_start: d.start.toISOString(),
            scheduled_end: d.end ? d.end.toISOString() : null,
            assigned_driver_id: driverId,
            priority,
            admin_comment: adminComment || null,
          }, {
            onSuccess: () => resolve(),
            onError: (err) => reject(err),
          });
        });
      }
      if (dates.length > 1) {
        toast.success(`Skapade ${dates.length} uppdrag`);
      }
      navigate('/admin/assignments');
    } catch {
      setIsSubmitting(false);
    }
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

              {/* Recurrence */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Upprepning</Label>
                  <Switch checked={recurrenceEnabled} onCheckedChange={setRecurrenceEnabled} />
                </div>
                {recurrenceEnabled && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Frekvens</Label>
                      <Select value={recurrenceFrequency} onValueChange={(v) => setRecurrenceFrequency(v as RecurrenceFrequency)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Varje vecka</SelectItem>
                          <SelectItem value="biweekly">Varannan vecka</SelectItem>
                          <SelectItem value="monthly">Varje månad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recurrence-end">Upprepa till och med</Label>
                      <Input id="recurrence-end" type="date" value={recurrenceEndDate} onChange={e => setRecurrenceEndDate(e.target.value)} required={recurrenceEnabled} />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isSubmitting || createAssignment.isPending}>
                  {isSubmitting ? 'Skapar...' : 'Skapa uppdrag'}
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

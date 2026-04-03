import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { useAssignment, useUpdateAssignment, useDeleteAssignment, useDrivers, useAssignmentLogs, useCreateAssignmentLog } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { formatSwedishDateTime, calculateDuration } from '@/lib/format';
import { ArrowLeft, Trash2, Copy, History, Mail, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const ACTION_LABELS: Record<string, string> = {
  driver_changed: 'Chaufför ändrad',
  status_changed: 'Status ändrad',
  comment_updated: 'Kommentar uppdaterad',
  created: 'Uppdrag skapat',
};

export default function AdminAssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: assignment, isLoading } = useAssignment(id);
  const { data: drivers } = useDrivers();
  const { data: logs } = useAssignmentLogs(id);
  const updateAssignment = useUpdateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const createLog = useCreateAssignmentLog();
  const [comment, setComment] = useState<string | null>(null);
  const [costInput, setCostInput] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  if (isLoading) {
    return <AdminLayout title="Uppdragsdetaljer"><div className="max-w-2xl space-y-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-64 w-full" /></div></AdminLayout>;
  }

  if (!assignment) {
    return <AdminLayout title="Uppdrag"><div className="text-center py-12 text-muted-foreground">Uppdraget hittades inte</div></AdminLayout>;
  }

  const currentComment = comment !== null ? comment : (assignment.admin_comment || '');

  const handleDriverChange = (driverId: string) => {
    const oldDriver = assignment.driver?.full_name || 'Ingen';
    const newDriver = (drivers ?? []).find(d => d.id === driverId)?.full_name || 'Okänd';

    updateAssignment.mutate({ id: assignment.id, assigned_driver_id: driverId }, {
      onSuccess: () => {
        if (user) {
          createLog.mutate({
            assignment_id: assignment.id,
            user_id: user.id,
            action: 'driver_changed',
            old_value: oldDriver,
            new_value: newDriver,
          });
        }
      },
    });
  };

  const handleSaveComment = () => {
    const oldComment = assignment.admin_comment || '(tom)';
    updateAssignment.mutate({ id: assignment.id, admin_comment: currentComment || null }, {
      onSuccess: () => {
        if (user) {
          createLog.mutate({
            assignment_id: assignment.id,
            user_id: user.id,
            action: 'comment_updated',
            old_value: oldComment,
            new_value: currentComment || '(tom)',
          });
        }
      },
    });
  };

  return (
    <AdminLayout title="Uppdragsdetaljer">
      <div className="space-y-4 max-w-2xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Tillbaka
        </Button>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 flex-wrap">
            <div className="space-y-1">
              <CardTitle className="text-lg">{assignment.title}</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <StatusBadge status={assignment.status} />
                <PriorityBadge priority={assignment.priority} />
                {assignment.invoiced && <span className="status-badge bg-primary/10 text-primary">Fakturerad</span>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Kund</p>
                <p className="font-medium">{assignment.customer?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Chaufför</p>
                <Select value={assignment.assigned_driver_id} onValueChange={handleDriverChange}>
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(drivers ?? []).map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-muted-foreground">Adress</p>
                <p className="font-medium">{assignment.address}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Schemalagd tid</p>
                <p className="font-medium">
                  {formatSwedishDateTime(assignment.scheduled_start)}
                  {assignment.scheduled_end && ` – ${formatSwedishDateTime(assignment.scheduled_end)}`}
                </p>
              </div>
              {assignment.instructions && (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground">Instruktioner</p>
                  <p className="font-medium">{assignment.instructions}</p>
                </div>
              )}
              {assignment.actual_start && (
                <div>
                  <p className="text-muted-foreground">Faktisk start</p>
                  <p className="font-medium">{formatSwedishDateTime(assignment.actual_start)}</p>
                </div>
              )}
              {assignment.actual_stop && (
                <div>
                  <p className="text-muted-foreground">Faktiskt stopp</p>
                  <p className="font-medium">{formatSwedishDateTime(assignment.actual_stop)}</p>
                </div>
              )}
              {assignment.actual_start && assignment.actual_stop && (
                <div>
                  <p className="text-muted-foreground">Varaktighet</p>
                  <p className="font-medium">{calculateDuration(assignment.actual_start, assignment.actual_stop)}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-2">
              <Label htmlFor="cost">Kostnad / fakturabelopp (kr)</Label>
              <div className="flex gap-2">
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  className="max-w-[200px]"
                  value={costInput !== null ? costInput : ((assignment as any).cost != null ? String((assignment as any).cost) : '')}
                  onChange={e => setCostInput(e.target.value)}
                  placeholder="Valfritt"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const val = costInput !== null ? costInput : '';
                    updateAssignment.mutate({ id: assignment.id, cost: val ? parseFloat(val) : null } as any);
                    setCostInput(null);
                  }}
                >
                  Spara
                </Button>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Krav vid leverans</p>
              <div className="flex items-center justify-between">
                <Label htmlFor="req-sig">Kräv mottagarsignatur</Label>
                <Switch
                  id="req-sig"
                  checked={assignment.require_signature}
                  onCheckedChange={(checked) => updateAssignment.mutate({ id: assignment.id, require_signature: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="req-photo">Kräv fraktsedelsfoto</Label>
                <Switch
                  id="req-photo"
                  checked={assignment.require_photo}
                  onCheckedChange={(checked) => updateAssignment.mutate({ id: assignment.id, require_photo: checked })}
                />
              </div>
            </div>
            {assignment.signature_url && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Mottagarens signatur</p>
                <img src={assignment.signature_url} alt="Signatur" className="w-full max-w-xs rounded-lg border bg-white p-2" />
              </div>
            )}

            {assignment.consignment_photo_url && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Fraktsedel</p>
                <img src={assignment.consignment_photo_url} alt="Fraktsedel" className="w-full max-w-xs rounded-lg border" />
              </div>
            )}

            {(assignment as any).driver_comment && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Förarkommentar</p>
                <p className="text-sm">{(assignment as any).driver_comment}</p>
              </div>
            )}

            <div className="border-t pt-4 space-y-2">
              <Label>Intern kommentar (visas för chauffören)</Label>
              <Textarea value={currentComment} onChange={(e) => setComment(e.target.value)} placeholder="Skriv kommentar till chauffören..." />
              <Button size="sm" variant="outline" onClick={handleSaveComment}>Spara kommentar</Button>
            </div>

            <div className="flex gap-2 pt-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => {
                navigate('/admin/assignments/new', { state: { copy: assignment } });
              }}>
                <Copy className="h-4 w-4 mr-1" /> Kopiera
              </Button>
              <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm"><Mail className="h-4 w-4 mr-1" /> Dela via e-post</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Dela uppdrag via e-post</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Mottagarens e-post</Label>
                      <Input type="email" value={shareEmail} onChange={e => setShareEmail(e.target.value)} placeholder="namn@example.com" />
                    </div>
                    <div className="space-y-1">
                      <Label>Meddelande (valfritt)</Label>
                      <Textarea value={shareMessage} onChange={e => setShareMessage(e.target.value)} placeholder="Hej, här är uppdragsinformation..." />
                    </div>
                    <Button onClick={async () => {
                      if (!shareEmail) return;
                      const { error } = await supabase.functions.invoke('share-assignment', {
                        body: { assignment_id: assignment.id, recipient_email: shareEmail, message: shareMessage },
                      });
                      if (error) { toast.error('Kunde inte dela uppdraget'); }
                      else { toast.success(`Uppdraget delat till ${shareEmail}`); setShareDialogOpen(false); setShareEmail(''); setShareMessage(''); }
                    }}>Skicka</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={() => {
                // Notify customer about delivery status
                const customerEmail = assignment.customer?.email;
                if (!customerEmail) { toast.error('Kunden saknar e-postadress'); return; }
                toast.success(`Leveransavisering skickad till ${customerEmail}`);
              }}>
                <Bell className="h-4 w-4 mr-1" /> Avisera kund
              </Button>
              <Button variant="destructive" size="sm" onClick={() => {
                deleteAssignment.mutate(assignment.id, {
                  onSuccess: () => navigate('/admin/assignments'),
                });
              }}>
                <Trash2 className="h-4 w-4 mr-1" /> Ta bort
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* History Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Ändringshistorik
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!logs || logs.length === 0) ? (
              <p className="text-sm text-muted-foreground">Ingen historik ännu</p>
            ) : (
              <div className="space-y-3">
                {logs.map(log => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">{ACTION_LABELS[log.action] || log.action}</p>
                      {log.old_value && log.new_value && (
                        <p className="text-muted-foreground text-xs">
                          {log.old_value} → {log.new_value}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {formatSwedishDateTime(log.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

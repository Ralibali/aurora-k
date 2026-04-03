import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
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
import { ArrowLeft, Trash2, Copy, History, Mail, Bell, X, Phone, MapPin, Calendar, Clock, User, FileText } from 'lucide-react';
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

/* ── Timeline step ── */
function TimelineStep({ label, time, completed, isLast }: {
  label: string; time?: string; completed: boolean; isLast?: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${
          completed ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
        }`} />
        {!isLast && (
          <div className={`w-0.5 flex-1 min-h-[24px] ${completed ? 'bg-blue-600' : 'bg-slate-200'}`} />
        )}
      </div>
      <div className="pb-4">
        <p className={`text-sm ${completed ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{label}</p>
        {time && <p className="text-xs text-muted-foreground font-mono mt-0.5">{time}</p>}
      </div>
    </div>
  );
}

/* ── Info row ── */
function InfoItem({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: typeof MapPin }) {
  return (
    <div className="py-3 border-b border-border last:border-0">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-2 text-sm text-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
        <span>{value}</span>
      </div>
    </div>
  );
}

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
  const [visible, setVisible] = useState(false);

  // Slide-in animation
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => navigate(-1), 300);
  };

  if (isLoading) {
    return (
      <AdminLayout title="Uppdragsdetaljer">
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!assignment) {
    return (
      <AdminLayout title="Uppdrag">
        <div className="text-center py-12 text-muted-foreground">Uppdraget hittades inte</div>
      </AdminLayout>
    );
  }

  const currentComment = comment !== null ? comment : (assignment.admin_comment || '');

  const handleDriverChange = (driverId: string) => {
    const oldDriver = assignment.driver?.full_name || 'Ingen';
    const newDriver = (drivers ?? []).find(d => d.id === driverId)?.full_name || 'Okänd';
    updateAssignment.mutate({ id: assignment.id, assigned_driver_id: driverId }, {
      onSuccess: () => {
        if (user) {
          createLog.mutate({
            assignment_id: assignment.id, user_id: user.id,
            action: 'driver_changed', old_value: oldDriver, new_value: newDriver,
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
            assignment_id: assignment.id, user_id: user.id,
            action: 'comment_updated', old_value: oldComment, new_value: currentComment || '(tom)',
          });
        }
      },
    });
  };

  const timelineSteps = [
    { label: 'Skapat', time: formatSwedishDateTime(assignment.created_at), completed: true },
    { label: 'Tilldelad', time: assignment.assigned_driver_id ? 'Tilldelad till ' + (assignment.driver?.full_name ?? '') : undefined, completed: !!assignment.assigned_driver_id },
    { label: 'Startad', time: assignment.actual_start ? formatSwedishDateTime(assignment.actual_start) : undefined, completed: !!assignment.actual_start },
    { label: 'Slutförd', time: assignment.actual_stop ? formatSwedishDateTime(assignment.actual_stop) : undefined, completed: !!assignment.actual_stop },
  ];

  return (
    <AdminLayout title="Uppdragsdetaljer">
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${visible ? 'bg-black/30' : 'bg-transparent pointer-events-none'}`}
        onClick={handleClose}
      />

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-xl bg-card shadow-2xl overflow-y-auto transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">{assignment.title}</h2>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">{assignment.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 1. Status + action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={assignment.status} />
            <PriorityBadge priority={assignment.priority} />
            {assignment.invoiced && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Fakturerad</span>
            )}
          </div>

          {/* 2. Uppdragsinfo */}
          <div className="bg-secondary/30 rounded-lg px-4">
            <InfoItem label="Kund" value={assignment.customer?.name} icon={FileText} />
            <InfoItem label="Adress" value={assignment.address} icon={MapPin} />
            <InfoItem
              label="Schemalagd tid"
              value={
                <span className="font-mono">
                  {formatSwedishDateTime(assignment.scheduled_start)}
                  {assignment.scheduled_end && ` – ${formatSwedishDateTime(assignment.scheduled_end)}`}
                </span>
              }
              icon={Calendar}
            />
            {assignment.actual_start && (
              <InfoItem label="Faktisk start" value={<span className="font-mono">{formatSwedishDateTime(assignment.actual_start)}</span>} icon={Clock} />
            )}
            {assignment.actual_stop && (
              <InfoItem label="Faktiskt stopp" value={<span className="font-mono">{formatSwedishDateTime(assignment.actual_stop)}</span>} icon={Clock} />
            )}
            {assignment.actual_start && assignment.actual_stop && (
              <InfoItem label="Varaktighet" value={<span className="font-mono">{calculateDuration(assignment.actual_start, assignment.actual_stop)}</span>} />
            )}
            {assignment.instructions && (
              <InfoItem label="Instruktioner" value={assignment.instructions} />
            )}
          </div>

          {/* 3. Tilldelad chaufför */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tilldelad chaufför</p>
            <div className="flex items-center gap-3">
              {assignment.driver ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-blue-700">
                      {assignment.driver.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{assignment.driver.full_name}</p>
                    {assignment.driver.email && (
                      <a href={`tel:${assignment.driver.email}`} className="text-xs text-primary flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" /> {assignment.driver.email}
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground italic">Ej tilldelad</span>
                </div>
              )}
            </div>
            <Select value={assignment.assigned_driver_id} onValueChange={handleDriverChange}>
              <SelectTrigger className="mt-2 h-9">
                <SelectValue placeholder="Byt chaufför..." />
              </SelectTrigger>
              <SelectContent>
                {(drivers ?? []).map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Tidslinje */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tidslinje</p>
            <div>
              {timelineSteps.map((step, i) => (
                <TimelineStep
                  key={step.label}
                  label={step.label}
                  time={step.time}
                  completed={step.completed}
                  isLast={i === timelineSteps.length - 1}
                />
              ))}
            </div>
          </div>

          {/* Cost */}
          <div>
            <Label htmlFor="cost" className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Kostnad / fakturabelopp (kr)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="cost" type="number" step="0.01" min="0" className="max-w-[200px]"
                value={costInput !== null ? costInput : ((assignment as any).cost != null ? String((assignment as any).cost) : '')}
                onChange={e => setCostInput(e.target.value)} placeholder="Valfritt"
              />
              <Button size="sm" variant="outline" onClick={() => {
                const val = costInput !== null ? costInput : '';
                updateAssignment.mutate({ id: assignment.id, cost: val ? parseFloat(val) : null } as any);
                setCostInput(null);
              }}>Spara</Button>
            </div>
          </div>

          {/* Delivery requirements */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Krav vid leverans</p>
            <div className="flex items-center justify-between">
              <Label htmlFor="req-sig" className="text-sm">Kräv mottagarsignatur</Label>
              <Switch id="req-sig" checked={assignment.require_signature}
                onCheckedChange={(checked) => updateAssignment.mutate({ id: assignment.id, require_signature: checked })} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="req-photo" className="text-sm">Kräv fraktsedelsfoto</Label>
              <Switch id="req-photo" checked={assignment.require_photo}
                onCheckedChange={(checked) => updateAssignment.mutate({ id: assignment.id, require_photo: checked })} />
            </div>
          </div>

          {/* Attachments */}
          {assignment.signature_url && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Mottagarens signatur</p>
              <img src={assignment.signature_url} alt="Signatur" className="w-full max-w-xs rounded-lg border bg-white p-2" />
            </div>
          )}
          {assignment.consignment_photo_url && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Fraktsedel</p>
              <img src={assignment.consignment_photo_url} alt="Fraktsedel" className="w-full max-w-xs rounded-lg border" />
            </div>
          )}

          {/* Driver comment */}
          {(assignment as any).driver_comment && (
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Förarkommentar</p>
              <p className="text-sm">{(assignment as any).driver_comment}</p>
            </div>
          )}

          {/* Admin comment */}
          <div className="space-y-2">
            <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Intern kommentar</Label>
            <Textarea value={currentComment} onChange={(e) => setComment(e.target.value)} placeholder="Skriv kommentar till chauffören..." />
            <Button size="sm" variant="outline" onClick={handleSaveComment}>Spara kommentar</Button>
          </div>

          {/* 5. Logg */}
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Ändringshistorik
            </p>
            {(!logs || logs.length === 0) ? (
              <p className="text-sm text-muted-foreground">Ingen historik ännu</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {logs.map(log => (
                  <div key={log.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{ACTION_LABELS[log.action] || log.action}</p>
                      {log.old_value && log.new_value && (
                        <p className="text-muted-foreground text-xs">{log.old_value} → {log.new_value}</p>
                      )}
                      <p className="text-xs text-muted-foreground/70 font-mono mt-0.5">{formatSwedishDateTime(log.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap border-t border-border pt-4">
            <Button variant="outline" size="sm" onClick={() => {
              navigate('/admin/assignments/new', { state: { copy: assignment } });
            }}>
              <Copy className="h-4 w-4 mr-1" /> Kopiera
            </Button>
            <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Mail className="h-4 w-4 mr-1" /> Dela</Button>
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
                    if (error) toast.error('Kunde inte dela uppdraget');
                    else { toast.success(`Uppdraget delat till ${shareEmail}`); setShareDialogOpen(false); setShareEmail(''); setShareMessage(''); }
                  }}>Skicka</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={() => {
              const customerEmail = assignment.customer?.email;
              if (!customerEmail) { toast.error('Kunden saknar e-postadress'); return; }
              toast.success(`Leveransavisering skickad till ${customerEmail}`);
            }}>
              <Bell className="h-4 w-4 mr-1" /> Avisera
            </Button>
            <Button variant="destructive" size="sm" onClick={() => {
              deleteAssignment.mutate(assignment.id, { onSuccess: () => navigate('/admin/assignments') });
            }}>
              <Trash2 className="h-4 w-4 mr-1" /> Ta bort
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { mockAssignments } from '@/lib/mock-data';
import { formatSwedishDateTime, calculateDuration } from '@/lib/format';
import { ArrowLeft, Trash2, Edit, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminAssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const assignment = mockAssignments.find(a => a.id === id);

  if (!assignment) {
    return <AdminLayout title="Uppdrag"><div className="text-center py-12 text-muted-foreground">Uppdraget hittades inte</div></AdminLayout>;
  }

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
                <p className="text-muted-foreground">Chaufför</p>
                <p className="font-medium">{assignment.driver?.full_name}</p>
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

            {assignment.consignment_photo_url && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Fraktsedel</p>
                <img src={assignment.consignment_photo_url} alt="Fraktsedel" className="w-full max-w-xs rounded-lg border" />
              </div>
            )}

            {/* Admin comment */}
            <div className="border-t pt-4 space-y-2">
              <Label>Intern kommentar (visas för chauffören)</Label>
              <Textarea defaultValue={assignment.admin_comment || ''} placeholder="Skriv kommentar till chauffören..." />
              <Button size="sm" variant="outline" onClick={() => toast.success('Kommentar sparad')}>Spara kommentar</Button>
            </div>

            <div className="flex gap-2 pt-2 flex-wrap">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-1" /> Redigera
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                toast.success('Uppdraget kopierat – fyll i nytt datum');
                navigate('/admin/assignments/new');
              }}>
                <Copy className="h-4 w-4 mr-1" /> Kopiera uppdrag
              </Button>
              <Button variant="destructive" size="sm" onClick={() => {
                toast.success('Uppdraget borttaget');
                navigate('/admin/assignments');
              }}>
                <Trash2 className="h-4 w-4 mr-1" /> Ta bort
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DriverLayout } from '@/components/DriverLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { useAssignment, useUpdateAssignment } from '@/hooks/useData';
import { formatSwedishDateTime, calculateDuration } from '@/lib/format';
import { ArrowLeft, Play, Camera, CheckCircle2, MapPin, Clock, FileText, Info, Navigation, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  window.open(isIos ? `maps://maps.apple.com/?q=${encoded}` : `https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
}

function ElapsedTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const update = () => {
      const ms = Date.now() - new Date(since).getTime();
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setElapsed(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [since]);

  return (
    <div className="text-center py-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Förfluten tid</p>
      <p className="text-4xl font-mono font-bold text-foreground tabular-nums">{elapsed}</p>
    </div>
  );
}

export default function DriverAssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: assignment, isLoading } = useAssignment(id);
  const updateAssignment = useUpdateAssignment();

  if (isLoading) {
    return <DriverLayout><div className="p-4 space-y-4"><Skeleton className="h-8 w-32" /><Skeleton className="h-64 w-full" /></div></DriverLayout>;
  }

  if (!assignment) {
    return <DriverLayout><div className="text-center py-12 text-muted-foreground">Uppdraget hittades inte</div></DriverLayout>;
  }

  const handleStart = () => {
    updateAssignment.mutate({
      id: assignment.id,
      status: 'active',
      actual_start: new Date().toISOString(),
    });
  };

  const handleCompleteWithPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async () => {
      const file = input.files?.[0];
      let photoUrl: string | null = null;

      if (file) {
        const path = `${assignment.id}/${Date.now()}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('consignment-notes').upload(path, file);
        if (!error) {
          const { data } = supabase.storage.from('consignment-notes').getPublicUrl(path);
          photoUrl = data.publicUrl;
        }
      }

      updateAssignment.mutate({
        id: assignment.id,
        status: 'completed',
        actual_stop: new Date().toISOString(),
        consignment_photo_url: photoUrl,
      });
      toast.success('Uppdraget slutfört!');
    };
    input.click();
  };

  const handleCompleteWithoutPhoto = () => {
    updateAssignment.mutate({
      id: assignment.id,
      status: 'completed',
      actual_stop: new Date().toISOString(),
    });
    toast.success('Uppdraget slutfört utan foto');
  };

  return (
    <DriverLayout>
      <div className="p-4 space-y-4 no-pull-refresh">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground touch-target">
          <ArrowLeft className="h-4 w-4" /> Tillbaka
        </button>

        <Card>
          <CardContent className="py-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-semibold">{assignment.title}</h2>
              <div className="flex gap-2">
                <StatusBadge status={assignment.status} />
                {assignment.priority !== 'normal' && <PriorityBadge priority={assignment.priority} />}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div><p className="text-muted-foreground">Kund</p><p className="font-medium">{assignment.customer?.name}</p></div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-muted-foreground">Adress</p>
                  <button
                    onClick={() => openMaps(assignment.address)}
                    className="font-medium text-primary hover:underline flex items-center gap-1 text-left"
                  >
                    {assignment.address}
                    <Navigation className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-muted-foreground">Schemalagd tid</p>
                  <p className="font-medium">{formatSwedishDateTime(assignment.scheduled_start)}{assignment.scheduled_end && ` – ${formatSwedishDateTime(assignment.scheduled_end)}`}</p>
                </div>
              </div>
              {assignment.instructions && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Instruktioner</p>
                  <p className="text-sm">{assignment.instructions}</p>
                </div>
              )}
              {assignment.admin_comment && (
                <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg flex gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-primary font-medium mb-1">Meddelande från admin</p>
                    <p className="text-sm">{assignment.admin_comment}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {assignment.status === 'pending' && (
          <Button onClick={handleStart} disabled={updateAssignment.isPending} className="w-full touch-target text-lg bg-success hover:bg-success/90 text-success-foreground" size="lg">
            <Play className="h-5 w-5 mr-2" /> Starta uppdrag
          </Button>
        )}

        {assignment.status === 'active' && assignment.actual_start && (
          <>
            <ElapsedTimer since={assignment.actual_start} />
            <div className="space-y-2">
              <Button onClick={handleCompleteWithPhoto} disabled={updateAssignment.isPending} className="w-full touch-target text-lg" size="lg">
                <Camera className="h-5 w-5 mr-2" /> Slutför med fraktsedelfoto
              </Button>
              <Button onClick={handleCompleteWithoutPhoto} disabled={updateAssignment.isPending} variant="outline" className="w-full touch-target" size="lg">
                <SkipForward className="h-5 w-5 mr-2" /> Slutför utan foto
              </Button>
            </div>
          </>
        )}

        {assignment.status === 'completed' && (
          <Card>
            <CardContent className="py-5 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
              <p className="font-semibold text-lg">Uppdraget slutfört</p>
              {assignment.actual_start && assignment.actual_stop && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Start: {formatSwedishDateTime(assignment.actual_start)}</p>
                  <p>Stopp: {formatSwedishDateTime(assignment.actual_stop)}</p>
                  <p className="font-medium text-foreground">Varaktighet: {calculateDuration(assignment.actual_start, assignment.actual_stop)}</p>
                </div>
              )}
              {assignment.consignment_photo_url && (
                <img src={assignment.consignment_photo_url} alt="Fraktsedel" className="w-full max-w-[200px] mx-auto rounded-lg border mt-3" />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DriverLayout>
  );
}

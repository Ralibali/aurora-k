import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffectiveDriverSettings } from '@/hooks/useDriverSettings';
import { useAuth } from '@/hooks/useAuth';
import { useDriverLocationTracker } from '@/hooks/useDriverLocationTracker';
import { DriverLayout } from '@/components/DriverLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAssignment, useDriverUpdateAssignment } from '@/hooks/useData';
import { formatSwedishDateTime, calculateDuration } from '@/lib/format';
import {
  ArrowLeft, Play, Camera, CheckCircle2, MapPin, Clock, FileText,
  Info, Navigation, SkipForward, MessageSquare, Send, Eraser, ArrowRight,
  User as UserIcon, Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  window.open(isIos ? `maps://maps.apple.com/?q=${encoded}` : `https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
}

// ─── Elapsed Timer ──────────────────────────────────────
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
    <div className="font-mono text-lg font-bold tabular-nums text-green-400">
      {elapsed}
    </div>
  );
}

// ─── Stepper ────────────────────────────────────────────
const STEPS = [
  { key: 'pending', label: 'Mottagen' },
  { key: 'active', label: 'Startad' },
  { key: 'completed', label: 'Slutförd' },
];

function HorizontalStepper({ currentStatus }: { currentStatus: string }) {
  const currentIdx = STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="flex items-center justify-between gap-1 w-full py-4">
      {STEPS.map((step, i) => {
        const isComplete = i < currentIdx || (i === currentIdx && currentStatus === 'completed');
        const isCurrent = i === currentIdx && currentStatus !== 'completed';
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-[#1E40AF] text-white ring-4 ring-blue-100 dark:ring-blue-900'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isComplete ? '✓' : i + 1}
              </div>
              <span className={`text-[11px] font-medium ${isComplete || isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 ${i < currentIdx ? 'bg-green-500' : 'bg-muted'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Signature Canvas ───────────────────────────────────
function SignatureCanvas({ onComplete, onSkip }: { onComplete: (blob: Blob) => void; onSkip: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasStrokes, setHasStrokes] = useState(false);
  const isDrawing = useRef(false);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvasRef.current!.width / rect.width),
      y: (e.clientY - rect.top) * (canvasRef.current!.height / rect.height),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    canvasRef.current!.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const pos = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasStrokes(true);
  };

  const handlePointerUp = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
    setHasStrokes(false);
  };

  const handleContinue = () => {
    canvasRef.current!.toBlob((blob) => { if (blob) onComplete(blob); }, 'image/png');
  };

  return (
    <div className="space-y-3 px-5">
      <p className="text-sm font-medium text-foreground">Mottagarens signatur</p>
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="w-full h-[200px] border rounded-lg bg-white touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={clearCanvas} className="flex-1">
          <Eraser className="h-4 w-4 mr-1" /> Rensa
        </Button>
        <Button size="sm" onClick={handleContinue} disabled={!hasStrokes} className="flex-1">
          Fortsätt <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
      <button onClick={onSkip} className="text-xs text-muted-foreground underline w-full text-center">
        Hoppa över signatur
      </button>
    </div>
  );
}

// ─── Info Row ───────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, action }: { icon: any; label: string; value: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium text-foreground">{value}</div>
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────
export default function DriverAssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: assignment, isLoading } = useAssignment(id);
  const updateAssignment = useDriverUpdateAssignment();
  const { data: driverSettings } = useEffectiveDriverSettings(user?.id);
  const [driverComment, setDriverComment] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [completionStep, setCompletionStep] = useState<'signature' | 'photo' | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);

  const requireSignature = (assignment as any)?.require_signature ?? false;
  const requirePhoto = (assignment as any)?.require_photo ?? false;

  const activeAssignmentId = assignment?.status === 'active' ? assignment.id : undefined;
  useDriverLocationTracker(user?.id, activeAssignmentId);

  useEffect(() => {
    if (assignment?.driver_comment) {
      setDriverComment(assignment.driver_comment as string);
    }
  }, [assignment]);

  if (isLoading) {
    return (
      <DriverLayout hideHeader>
        <div className="p-5 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </DriverLayout>
    );
  }

  if (!assignment) {
    return (
      <DriverLayout hideHeader>
        <div className="text-center py-16 text-muted-foreground">Uppdraget hittades inte</div>
      </DriverLayout>
    );
  }

  const handleStart = () => {
    updateAssignment.mutate({
      id: assignment.id,
      status: 'active',
      actual_start: new Date().toISOString(),
    });
  };

  const uploadSignature = async (blob: Blob): Promise<string | null> => {
    const path = `${user!.id}/${assignment.id}/signature.png`;
    const { error } = await supabase.storage.from('signatures').upload(path, blob, { upsert: true });
    if (error) { toast.error('Kunde inte ladda upp signatur'); return null; }
    const { data } = await supabase.storage.from('signatures').createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl ?? null;
  };

  const handleSignatureComplete = async (blob: Blob) => {
    const url = await uploadSignature(blob);
    if (url) {
      setSignatureUrl(url);
      if (requirePhoto) {
        setCompletionStep('photo');
      } else {
        updateAssignment.mutate({ id: assignment!.id, status: 'completed', actual_stop: new Date().toISOString(), signature_url: url });
        toast.success('Uppdraget slutfört!');
        setCompletionStep(null);
      }
    }
  };

  const handleSignatureSkip = () => {
    setSignatureUrl(null);
    if (requirePhoto) setCompletionStep('photo');
    else handlePhotoComplete(null);
  };

  const handlePhotoComplete = (photoUrl: string | null) => {
    updateAssignment.mutate({
      id: assignment.id,
      status: 'completed',
      actual_stop: new Date().toISOString(),
      consignment_photo_url: photoUrl,
      ...(signatureUrl ? { signature_url: signatureUrl } : {}),
    });
    toast.success('Uppdraget slutfört!');
    setCompletionStep(null);
  };

  const handleTakePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async () => {
      const file = input.files?.[0];
      let photoUrl: string | null = null;
      if (file) {
        const path = `${user!.id}/${assignment.id}/${Date.now()}.${file.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('consignment-notes').upload(path, file);
        if (!error) {
          const { data } = await supabase.storage.from('consignment-notes').createSignedUrl(path, 60 * 60 * 24 * 365);
          photoUrl = data?.signedUrl ?? null;
        }
      }
      handlePhotoComplete(photoUrl);
    };
    input.click();
  };

  const handleSaveComment = async () => {
    setSavingComment(true);
    updateAssignment.mutate(
      { id: assignment.id, driver_comment: driverComment || null },
      {
        onSuccess: () => { toast.success('Kommentar sparad'); setSavingComment(false); },
        onError: () => setSavingComment(false),
      },
    );
  };

  const handleInitiateComplete = () => {
    if (requireSignature) setCompletionStep('signature');
    else if (requirePhoto) setCompletionStep('photo');
    else handlePhotoComplete(null);
  };

  const statusLabel = assignment.status === 'pending' ? 'Tilldelad' : assignment.status === 'active' ? 'Pågående' : 'Slutförd';
  const statusColor = assignment.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    : assignment.status === 'active' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';

  return (
    <DriverLayout hideHeader>
      <div className="flex flex-col min-h-[calc(100vh-env(safe-area-inset-bottom,0px))]">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1" />
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-5 pb-32 space-y-5">
          {/* Title */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-2xl font-bold text-foreground leading-tight">{assignment.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(assignment.scheduled_start), 'EEEE d MMMM, HH:mm', { locale: sv })}
              {assignment.scheduled_end && ` – ${format(new Date(assignment.scheduled_end), 'HH:mm')}`}
            </p>
          </motion.div>

          {/* Stepper */}
          <HorizontalStepper currentStatus={assignment.status} />

          {/* Info rows */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-card border rounded-xl px-4"
          >
            <InfoRow icon={FileText} label="Kund" value={assignment.customer?.name ?? '–'} />
            <InfoRow
              icon={MapPin}
              label="Adress"
              value={
                <button onClick={() => openMaps(assignment.address)} className="text-primary flex items-center gap-1 text-left">
                  {assignment.address}
                  <Navigation className="h-3.5 w-3.5 shrink-0" />
                </button>
              }
            />
            <InfoRow
              icon={Clock}
              label="Schemalagd tid"
              value={`${formatSwedishDateTime(assignment.scheduled_start)}${assignment.scheduled_end ? ` – ${formatSwedishDateTime(assignment.scheduled_end)}` : ''}`}
            />
            {assignment.vehicle && (
              <InfoRow icon={Package} label="Fordon" value={(assignment as any).vehicle?.name ?? '–'} />
            )}
          </motion.div>

          {/* Instructions */}
          {assignment.instructions && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="bg-muted/50 border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Instruktioner</p>
              <p className="text-sm text-foreground">{assignment.instructions}</p>
            </motion.div>
          )}

          {/* Admin comment */}
          {assignment.admin_comment && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex gap-3">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Meddelande från admin</p>
                <p className="text-sm text-foreground">{assignment.admin_comment}</p>
              </div>
            </div>
          )}

          {/* Driver comment */}
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              Förarkommentar
            </div>
            <Textarea
              placeholder="Lämna en anteckning..."
              value={driverComment}
              onChange={(e) => setDriverComment(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
            <Button
              size="sm"
              onClick={handleSaveComment}
              disabled={savingComment || driverComment === (assignment.driver_comment ?? '')}
              className="w-full"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {savingComment ? 'Sparar...' : 'Spara kommentar'}
            </Button>
          </div>

          {/* Completion steps inline */}
          {completionStep === 'signature' && (
            <SignatureCanvas onComplete={handleSignatureComplete} onSkip={handleSignatureSkip} />
          )}
          {completionStep === 'photo' && (
            <div className="space-y-2 px-1">
              <p className="text-sm font-medium text-foreground">Fraktsedelfoto</p>
              <Button onClick={handleTakePhoto} disabled={updateAssignment.isPending} className="w-full min-h-[48px]" size="lg">
                <Camera className="h-5 w-5 mr-2" /> Ta foto av fraktsedel
              </Button>
              <Button onClick={() => handlePhotoComplete(null)} disabled={updateAssignment.isPending} variant="outline" className="w-full min-h-[48px]" size="lg">
                <SkipForward className="h-5 w-5 mr-2" /> Hoppa över foto
              </Button>
            </div>
          )}

          {/* Completed summary */}
          {assignment.status === 'completed' && (
            <div className="bg-card border rounded-xl p-5 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <p className="font-semibold text-lg text-foreground">Uppdraget slutfört</p>
              {assignment.actual_start && assignment.actual_stop && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Start: {formatSwedishDateTime(assignment.actual_start)}</p>
                  <p>Stopp: {formatSwedishDateTime(assignment.actual_stop)}</p>
                  <p className="font-medium text-foreground">Varaktighet: {calculateDuration(assignment.actual_start, assignment.actual_stop)}</p>
                </div>
              )}
              {assignment.signature_url && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Mottagarens signatur</p>
                  <img src={assignment.signature_url} alt="Signatur" className="w-full max-w-[200px] mx-auto rounded-lg border bg-white" />
                </div>
              )}
              {assignment.consignment_photo_url && (
                <img src={assignment.consignment_photo_url} alt="Fraktsedel" className="w-full max-w-[200px] mx-auto rounded-lg border mt-3" />
              )}
            </div>
          )}
        </div>

        {/* FIXED BOTTOM ACTION BAR */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t px-5 py-3 z-50"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          {assignment.status === 'pending' && (
            <button
              onClick={handleStart}
              disabled={updateAssignment.isPending}
              className="w-full bg-[#1E40AF] hover:bg-[#1E40AF]/90 text-white font-semibold rounded-xl py-4 text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 min-h-[48px]"
            >
              <Play className="h-5 w-5" />
              Starta körning
            </button>
          )}

          {assignment.status === 'active' && completionStep === null && (
            <div className="flex items-center gap-3">
              {assignment.actual_start && (
                <ElapsedTimer since={assignment.actual_start} />
              )}
              <button
                onClick={handleInitiateComplete}
                disabled={updateAssignment.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl py-4 text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 min-h-[48px]"
              >
                <CheckCircle2 className="h-5 w-5" />
                Markera slutförd
              </button>
            </div>
          )}

          {assignment.status === 'completed' && (
            <button
              onClick={() => navigate('/driver/time-report')}
              className="w-full border border-border text-foreground font-medium rounded-xl py-4 text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-all min-h-[48px]"
            >
              <Clock className="h-5 w-5" />
              Se tidrapport
            </button>
          )}
        </div>
      </div>
    </DriverLayout>
  );
}

import { useState } from 'react';
import { Camera, CheckCircle2, Loader2, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SignaturePad } from '@/components/SignaturePad';
import { saveDeliveryProof, type DeliveryProofResult } from './delivery-proof-service';

export function DeliveryProofDialog({ open, onOpenChange, assignment, userId, companyId, onComplete }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: { id: string; require_photo?: boolean | null; require_signature?: boolean | null; consignment_photo_url?: string | null; signature_url?: string | null };
  userId: string;
  companyId?: string | null;
  onComplete: (result: DeliveryProofResult) => Promise<void> | void;
}) {
  const [photo, setPhoto] = useState<File | null>(null);
  const [signature, setSignature] = useState<Blob | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (assignment.require_photo && !photo && !assignment.consignment_photo_url) return toast.error('Foto krävs');
    if (assignment.require_signature && !signature && !assignment.signature_url) return toast.error('Signatur krävs');
    if (assignment.require_signature && !recipientName.trim()) return toast.error('Ange mottagarens namn');
    setSaving(true);
    try {
      const result = await saveDeliveryProof({
        assignmentId: assignment.id,
        userId,
        companyId,
        photo,
        signature,
        existingPhotoUrl: assignment.consignment_photo_url,
        existingSignatureUrl: assignment.signature_url,
        recipientName,
        note,
        requirePhoto: assignment.require_photo,
        requireSignature: assignment.require_signature,
      });
      await onComplete(result);
      toast.success(result.queued ? 'Leveransbevis sparat offline och skickas automatiskt' : 'Leveransbevis synkat och uppdraget slutfört');
      onOpenChange(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Kunde inte spara leveransbevis');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Slutför med leveransbevis</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label className="flex gap-2"><Camera className="h-4 w-4" />Foto {assignment.require_photo && '*'}</Label><Input type="file" accept="image/*" capture="environment" onChange={event => setPhoto(event.target.files?.[0] ?? null)} /></div>
          <div className="space-y-2"><Label>Mottagarens namn {assignment.require_signature && '*'}</Label><Input value={recipientName} onChange={event => setRecipientName(event.target.value)} /></div>
          <div className="space-y-2"><Label className="flex gap-2"><PenLine className="h-4 w-4" />Signatur {assignment.require_signature && '*'}</Label><SignaturePad onChange={setSignature} /></div>
          <div className="space-y-2"><Label>Kommentar eller avvikelse</Label><Textarea value={note} onChange={event => setNote(event.target.value)} /></div>
          <Button className="h-12 w-full bg-green-600 hover:bg-green-700" disabled={saving} onClick={() => void submit()}>{saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sparar säkert…</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Slutför uppdrag</>}</Button>
          <p className="text-center text-xs text-muted-foreground">Utan internet sparas foto och signatur krypterat i webbläsarens lokala databas tills anslutningen är tillbaka.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useRef, useState } from 'react';
import { Bell, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'share' | 'customer_notification';
export function AssignmentMailActions({ assignmentId, customerEmail }: { assignmentId: string; customerEmail?: string | null }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const attempt = useRef<{ payload: string; id: string } | null>(null);
  const open = (next: Mode) => { setMode(next); setError(''); };
  const send = async () => {
    if (lock.current || !mode) return;
    lock.current = true;
    setPending(true);
    setError('');
    const payload = { assignment_id: assignmentId, mode, recipient_email: mode === 'share' ? email.trim() : undefined, message: message.trim() };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.payload !== fingerprint) attempt.current = { payload: fingerprint, id: crypto.randomUUID() };
    try {
      const { data, error: requestError } = await supabase.functions.invoke('share-assignment', { body: { ...payload, request_id: attempt.current.id } });
      if (requestError) {
        const response = 'context' in requestError && requestError.context instanceof Response ? requestError.context : null;
        const detail = response ? await response.clone().json().catch(() => null) : null;
        throw new Error(typeof detail?.error === 'string' ? detail.error : 'Utskicket kunde inte bekräftas. Kontrollera uppkopplingen och försök igen.');
      }
      if (data?.success !== true || typeof data.id !== 'string' || !data.id.trim()) throw new Error('E-posttjänsten bekräftade inte utskicket. Försök igen.');
      toast.success(`Mejlet har skickats till ${data.recipient || (mode === 'share' ? email.trim() : customerEmail)}`);
      attempt.current = null;
      setMode(null);
      setEmail('');
      setMessage('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Mejlet kunde inte skickas. Försök igen.');
    } finally { lock.current = false; setPending(false); }
  };
  return <>
    <Button variant="outline" size="sm" onClick={() => open('share')}><Mail className="mr-1 h-4 w-4" />Dela</Button>
    <Button variant="outline" size="sm" onClick={() => open('customer_notification')}><Bell className="mr-1 h-4 w-4" />Avisera</Button>
    <Dialog open={mode !== null} onOpenChange={value => { if (!value && !pending) setMode(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === 'share' ? 'Dela uppdrag via e-post' : 'Avisera kunden'}</DialogTitle><DialogDescription>Mejlet innehåller uppdragets aktuella status, adresser och planerade starttid i svensk tid.</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); void send(); }}>
          {mode === 'share' ? <div className="space-y-2"><Label htmlFor="assignment-mail-recipient">Mottagarens e-post</Label><Input id="assignment-mail-recipient" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={pending} placeholder="namn@example.com" /></div> : <div className="rounded-lg bg-muted p-3 text-sm"><p className="font-medium">Mottagare</p><p className="mt-1 break-all">{customerEmail || 'Kunden saknar e-postadress. Lägg till den i kundregistret först.'}</p></div>}
          <div className="space-y-2"><Label htmlFor="assignment-mail-message">Meddelande (valfritt)</Label><Textarea id="assignment-mail-message" maxLength={4000} value={message} onChange={event => setMessage(event.target.value)} disabled={pending} placeholder="Information till mottagaren…" /></div>
          {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error} Ditt meddelande finns kvar.</p>}
          <Button type="submit" disabled={pending || (mode === 'customer_notification' && !customerEmail?.trim())}>{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{pending ? 'Skickar…' : error ? 'Försök skicka igen' : 'Skicka mejl'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </>;
}

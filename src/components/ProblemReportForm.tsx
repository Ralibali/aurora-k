import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const reportKinds = {
  assignment: 'Problem med uppdraget',
  content: 'Olämpligt innehåll',
  person: 'Olämpligt beteende från en person',
};
type ReportKind = keyof typeof reportKinds;

export default function ProblemReportForm({
  onSubmit,
  includeAssignmentProblem = false,
  successMessage,
}: {
  onSubmit: (message: string, operationId: string) => Promise<void>;
  includeAssignmentProblem?: boolean;
  successMessage: string;
}) {
  const formId = useId();
  const initialKind = includeAssignmentProblem ? 'assignment' : 'content';
  const [kind, setKind] = useState<ReportKind>(initialKind);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sent, setSent] = useState(false);
  const lock = useRef(false);
  const operation = useRef<{ id: string; message: string } | null>(null);
  const prefix = `[Rapport: ${reportKinds[kind]}]\n`;
  const maxLength = 3000 - prefix.length;
  const tooLong = text.trim().length > maxLength;

  const report = async () => {
    if (lock.current || !text.trim() || tooLong) return;
    lock.current = true;
    setPending(true);
    setFailed(false);
    setSent(false);
    const message = prefix + text.trim();
    // Retry the same request safely; an edited report is a new operation.
    if (operation.current?.message !== message) operation.current = { id: crypto.randomUUID(), message };
    try {
      await onSubmit(message, operation.current.id);
      setText('');
      setKind(initialKind);
      setOpen(false);
      setSent(true);
      operation.current = null;
    } catch {
      setFailed(true);
    } finally {
      lock.current = false;
      setPending(false);
    }
  };

  return (
    <div className="space-y-3">
      {sent && <p role="status" className="text-sm">{successMessage}</p>}
      <Button type="button" variant="outline" disabled={pending} aria-expanded={open} aria-controls={`${formId}-form`} onClick={() => setOpen(value => !value)}>
        {open ? 'Stäng formuläret' : 'Rapportera problem'}
      </Button>
      {open && (
        <form id={`${formId}-form`} className="space-y-3" onSubmit={event => { event.preventDefault(); void report(); }}>
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-kind`}>Vad vill du rapportera?</Label>
            <select id={`${formId}-kind`} value={kind} disabled={pending} onChange={event => setKind(event.target.value as ReportKind)} className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
              {includeAssignmentProblem && <option value="assignment">{reportKinds.assignment}</option>}
              <option value="content">{reportKinds.content}</option>
              <option value="person">{reportKinds.person}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${formId}-message`}>{kind === 'person' ? 'Beskriv vem rapporten gäller och vad som hände' : kind === 'content' ? 'Beskriv det olämpliga innehållet' : 'Vad har hänt?'}</Label>
            <Textarea id={`${formId}-message`} rows={5} required maxLength={maxLength} value={text} onChange={event => setText(event.target.value)} disabled={pending} aria-describedby={`${formId}-help`} aria-invalid={tooLong || undefined} placeholder="Beskriv problemet så att den som tar emot rapporten kan undersöka det." />
          </div>
          <p id={`${formId}-help`} className="text-xs text-muted-foreground">Du behöver uppkoppling för att skicka. Vid fel finns texten kvar i formuläret tills du försöker igen. Högst {maxLength} tecken.</p>
          {tooLong && <p role="alert" className="text-sm text-destructive">Förkorta beskrivningen till högst {maxLength} tecken för den valda rapporttypen.</p>}
          {failed && <p role="alert" className="text-sm text-destructive">Rapporten kunde inte skickas. Din text finns kvar. Försök igen när du har anslutning.</p>}
          <Button type="submit" disabled={pending || !text.trim() || tooLong}>{pending ? 'Skickar…' : 'Skicka rapport'}</Button>
        </form>
      )}
    </div>
  );
}

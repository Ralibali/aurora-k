import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAssignments, useCustomers } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';
import {
  documentTypeLabels, matchAssignment, matchCustomer, normalizeDocumentFields, requiresManualReview, statusLabels,
  type AssignmentCandidate, type DocumentInboxStatus, type InboundDocument, type TransportDocumentType,
} from './document-inbox';

const fieldLabels: Array<[keyof ReturnType<typeof normalizeDocumentFields>, string]> = [
  ['orderReference', 'Order-/referensnummer'], ['customerName', 'Kund'], ['pickupAddress', 'Hämtning'],
  ['deliveryAddress', 'Leverans'], ['scheduledStart', 'Datum och tid'], ['contactName', 'Kontakt'],
  ['contactPhone', 'Telefon'], ['serviceType', 'Tjänst'], ['goods', 'Gods'], ['weightKg', 'Vikt (kg)'], ['amount', 'Belopp'],
];

export function DocumentInboxPanel() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: customers } = useCustomers();
  const { data: assignments } = useAssignments();
  const [status, setStatus] = useState<'all' | DocumentInboxStatus>('all');
  const [type, setType] = useState<'all' | TransportDocumentType>('all');
  const [open, setOpen] = useState<InboundDocument | null>(null);
  const [linkTarget, setLinkTarget] = useState('none');
  const [confirmLink, setConfirmLink] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['inbound-documents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('inbound_documents').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as InboundDocument[];
    },
  });

  const filtered = (documents ?? []).filter(doc => (status === 'all' || doc.status === status) && (type === 'all' || doc.document_type === type));
  const fields = useMemo(() => normalizeDocumentFields(open?.parsed_payload?.fields), [open]);
  const candidates = (assignments ?? []) as unknown as AssignmentCandidate[];
  const suggestion = useMemo(() => {
    if (!open) return null;
    const customer = matchCustomer(fields, (customers ?? []) as never);
    return { customer, assignment: matchAssignment(fields, customer?.customerId ?? '', candidates) };
  }, [open, fields, customers, candidates]);

  const openReview = (doc: InboundDocument) => {
    setOpen(doc);
    setLinkTarget(doc.assignment_id ?? 'none');
  };

  const update = async (patch: Record<string, unknown>, message: string) => {
    if (!open) return;
    setBusy(true);
    const { error } = await supabase.from('inbound_documents').update(patch as never).eq('id', open.id);
    setBusy(false);
    if (error) return toast.error('Dokumentet kunde inte uppdateras.');
    toast.success(message);
    await qc.invalidateQueries({ queryKey: ['inbound-documents'] });
    setOpen(null);
  };

  const viewFile = async () => {
    if (!open?.storage_path) return;
    const { data, error } = await supabase.storage.from('order-inbox').createSignedUrl(open.storage_path, 300);
    if (error || !data) return toast.error('Originalfilen kunde inte öppnas.');
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const createAssignment = () => {
    navigate('/admin/assignments/new', { state: { copy: {
      title: fields.title || fields.orderReference || 'Transportuppdrag', customer_id: suggestion?.customer?.customerId ?? '',
      service_type: fields.serviceType, pickup_address: fields.pickupAddress, delivery_address: fields.deliveryAddress,
      instructions: fields.orderReference ? `Referens: ${fields.orderReference}` : '', require_photo: true, require_signature: true,
    }, importedScheduledStart: fields.scheduledStart, source: 'document-inbox' } });
  };

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Dokumentinkorg</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Select value={status} onValueChange={value => setStatus(value as typeof status)}>
            <SelectTrigger className="w-36" aria-label="Filtrera status"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Alla statusar</SelectItem>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={type} onValueChange={value => setType(value as typeof type)}>
            <SelectTrigger className="w-40" aria-label="Filtrera dokumenttyp"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Alla typer</SelectItem>{Object.entries(documentTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {error && <p className="text-sm text-destructive">Dokumenten kunde inte hämtas.</p>}
        {!isLoading && !error && !filtered.length && <p className="py-8 text-center text-sm text-muted-foreground">Inga dokument ännu. Använd "Tolka dokument" under Order för att ladda upp PDF eller foto.</p>}
        <div className="divide-y">
          {filtered.map(doc => (
            <button key={doc.id} type="button" onClick={() => openReview(doc)} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-muted/40">
              <div className="min-w-0"><p className="truncate text-sm font-medium">{doc.filename}</p><p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleString('sv-SE')}</p></div>
              <div className="flex shrink-0 gap-2"><Badge variant="outline">{documentTypeLabels[doc.document_type]}</Badge><Badge variant={doc.status === 'error' ? 'destructive' : 'secondary'}>{statusLabels[doc.status]}</Badge><Badge variant="outline">{Math.round(doc.confidence ?? 0)}%</Badge></div>
            </button>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!open} onOpenChange={value => !value && setOpen(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>Granska dokument</DialogTitle></DialogHeader>
          {open && <div className="space-y-4">
            <div className="flex flex-wrap gap-2"><Badge variant="outline">{documentTypeLabels[open.document_type]}</Badge><Badge>{Math.round(open.confidence ?? 0)}% säkerhet</Badge><Badge variant="secondary">{open.signature_detected ? 'Signatur verkar finnas' : 'Ingen signatur hittad'}</Badge></div>
            {open.status === 'error' && <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{open.error_message ?? 'Tolkningen misslyckades.'} Filen är sparad.</p>}
            {requiresManualReview(open.confidence ?? 0, open.document_type) && open.status !== 'error' && <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">Låg säkerhet eller okänd typ. Kontrollera alla fält manuellt.</p>}
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {fieldLabels.map(([key, label]) => <div key={key} className="contents"><dt className="text-muted-foreground">{label}</dt><dd>{fields[key] === null || fields[key] === '' ? '—' : String(fields[key])}{key === 'amount' && fields.amount !== null && fields.currency ? ` ${fields.currency}` : ''}</dd></div>)}
            </dl>
            {suggestion?.customer && <p className="text-xs text-muted-foreground">Kund: {suggestion.customer.reason} ({suggestion.customer.confidence}%).</p>}
            {open.storage_path && <Button variant="outline" size="sm" onClick={() => void viewFile()}>Visa originalfil</Button>}

            {open.document_type === 'transport_order' || open.document_type === 'unknown' ? <Button className="w-full" onClick={createAssignment}>Skapa uppdrag</Button> : null}
            {open.document_type !== 'transport_order' && <div className="space-y-2">
              <p className="text-sm font-medium">Koppla till befintligt uppdrag</p>
              {suggestion?.assignment && <p className="text-xs text-muted-foreground">Förslag: {suggestion.assignment.reason} ({suggestion.assignment.confidence}%).</p>}
              <Select value={linkTarget} onValueChange={setLinkTarget}>
                <SelectTrigger aria-label="Välj uppdrag"><SelectValue placeholder="Välj uppdrag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Välj uppdrag</SelectItem>
                  {candidates.slice(0, 200).map(a => <SelectItem key={a.id} value={a.id}>{a.id === suggestion?.assignment?.assignmentId ? '★ ' : ''}{a.title ?? 'Uppdrag'}{a.scheduled_start ? ` · ${a.scheduled_start.slice(0, 10)}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button className="w-full" variant="secondary" disabled={linkTarget === 'none' || busy} onClick={() => setConfirmLink(true)}><Link2 className="mr-2 h-4 w-4" /> Koppla dokument</Button>
            </div>}
            {open.status !== 'reviewed' && open.status !== 'linked' && <Button variant="ghost" className="w-full" disabled={busy} onClick={() => void update({ status: 'reviewed' }, 'Dokumentet är markerat som granskat')}>Markera granskad</Button>}
          </div>}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmLink} onOpenChange={setConfirmLink}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Koppla dokumentet?</AlertDialogTitle><AlertDialogDescription>Dokumentet kopplas till valt uppdrag. Uppdraget i sig ändras inte.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Avbryt</AlertDialogCancel><AlertDialogAction onClick={() => void update({ assignment_id: linkTarget, status: 'linked' }, 'Dokumentet är kopplat till uppdraget')}>Koppla</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

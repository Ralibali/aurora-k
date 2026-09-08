import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { fortnox } from './fortnox-api';

type Customer = { number: string; name: string; organizationNumber: string };
export default function FortnoxExportDialog({ invoiceId, invoiceNumber, onClose }: { invoiceId: string; invoiceNumber: string; onClose: () => void }) {
  const [number, setNumber] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [total, setTotal] = useState(0);
  const [document, setDocument] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: 'customer' | 'export' | 'reconcile') => {
    setBusy(true); setError('');
    try {
      const result = await fortnox<{ customer?: Customer; total?: number; documentNumber?: string }>(action, { invoiceId, customerNumber: number.trim(), customerName: customer?.name });
      if (result.documentNumber) setDocument(result.documentNumber);
      else { setCustomer(result.customer ?? null); setTotal(result.total ?? 0); }
    } catch (err) { setError(err instanceof Error ? err.message : 'Exporten kunde inte slutföras.'); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent><DialogHeader><DialogTitle>Faktura #{invoiceNumber} till Fortnox</DialogTitle><DialogDescription>Skapa ett utkast som du granskar och bokför i Fortnox. Exporten stöder svenska kunder med SEK och vanlig svensk moms. Ingen faktura skickas till kunden här.</DialogDescription></DialogHeader>
    {document ? <p role="status" className="rounded-lg bg-primary/10 p-4">Exporten är registrerad som faktura {document} i Fortnox. Kontrollera fakturan där innan bokföring och utskick.</p> : <div className="space-y-4">
      <div className="space-y-2"><Label htmlFor="fortnox-customer">Kundnummer i Fortnox</Label><Input id="fortnox-customer" value={number} disabled={busy} onChange={e => { setNumber(e.target.value); setCustomer(null); }} placeholder="Exempel: 1001" /></div>
      <Button variant="outline" disabled={busy || !number.trim()} onClick={() => run('customer')}>Kontrollera kund och underlag</Button>
      {customer && <div className="space-y-2 rounded-lg border p-4"><p className="font-medium">{customer.name}</p><p className="text-sm">{customer.organizationNumber || 'Organisationsnummer saknas i Fortnox'} · Kund {customer.number}</p><p className="text-sm">{total.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK' })} inklusive moms</p><Button disabled={busy} onClick={() => run('export')}>{busy ? 'Arbetar…' : 'Bekräfta kund och skapa utkast'}</Button></div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button variant="ghost" disabled={busy} onClick={() => run('reconcile')}>Kontrollera tidigare export</Button>
    </div>}
  </DialogContent></Dialog>;
}

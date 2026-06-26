import { useEffect, useState } from 'react';
import { Building2, ExternalLink, Loader2, RefreshCw, Unplug } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useInvoices } from '@/hooks/useData';
import { supabase } from '@/integrations/supabase/client';

type Connection = {
  status: string;
  scopes: string[];
  token_expires_at: string;
  fortnox_company_name: string | null;
  fortnox_organization_number: string | null;
  connected_at: string;
  last_error: string | null;
};

export function FortnoxRuntime() {
  const location = useLocation();
  const visible = location.pathname === '/admin/settings' || location.pathname === '/admin/invoices';
  const { data: invoices } = useInvoices();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState('');

  const loadStatus = async () => {
    const { data, error } = await supabase.functions.invoke('fortnox-api', { body: { action: 'status' } });
    if (error) return toast.error(error.message);
    setConnection((data as { connection?: Connection | null } | null)?.connection ?? null);
  };

  useEffect(() => {
    if (visible) void loadStatus();
    const params = new URLSearchParams(location.search);
    if (params.get('fortnox') === 'connected') toast.success('Fortnox är anslutet');
    if (params.get('fortnox') === 'error') toast.error(params.get('message') || 'Fortnox kunde inte anslutas');
  }, [visible, location.search]);

  if (!visible) return null;

  const connect = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('fortnox-oauth-start', { body: { redirectAfter: location.pathname } });
    setLoading(false);
    if (error) return toast.error(error.message);
    const authorizationUrl = (data as { authorizationUrl?: string } | null)?.authorizationUrl;
    if (!authorizationUrl) return toast.error('Fortnox returnerade ingen anslutningsadress');
    window.location.assign(authorizationUrl);
  };

  const disconnect = async () => {
    const { error } = await supabase.functions.invoke('fortnox-api', { body: { action: 'disconnect' } });
    if (error) return toast.error(error.message);
    setConnection(null);
    toast.success('Fortnox är frånkopplat');
  };

  const exportInvoice = async (invoiceId: string) => {
    setSyncingId(invoiceId);
    const { data, error } = await supabase.functions.invoke('fortnox-api', { body: { action: 'export_invoice', invoiceId } });
    setSyncingId('');
    if (error) return toast.error(error.message);
    const documentNumber = (data as { documentNumber?: string } | null)?.documentNumber;
    toast.success(documentNumber ? `Fakturan skapades i Fortnox: ${documentNumber}` : 'Fakturan synkades till Fortnox');
  };

  const connected = connection?.status === 'connected';
  return <div className="fixed bottom-5 right-5 z-[80]">
    <Dialog>
      <DialogTrigger asChild><Button className="shadow-xl"><Building2 className="mr-2 h-4 w-4" />Fortnox</Button></DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Fortnox-integration</DialogTitle></DialogHeader>
        {!connected ? <div className="rounded-xl border border-dashed p-8 text-center"><Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-semibold">Anslut Fortnox</p><p className="mt-1 text-sm text-muted-foreground">Kunder och fakturor exporteras via OAuth utan att token lagras i webbläsaren.</p><Button className="mt-5" disabled={loading} onClick={() => void connect()}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}Anslut Fortnox</Button></div> : <div className="space-y-5">
          <div className="rounded-xl border border-green-200 bg-green-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-green-950">{connection.fortnox_company_name || 'Fortnox anslutet'}</p><p className="text-sm text-green-800">{connection.fortnox_organization_number}</p><div className="mt-2 flex flex-wrap gap-1">{connection.scopes.map(scope => <Badge key={scope} variant="outline" className="bg-white">{scope}</Badge>)}</div></div><Button size="sm" variant="outline" className="bg-white" onClick={() => void disconnect()}><Unplug className="mr-1 h-4 w-4" />Koppla från</Button></div></div>
          <div><div className="mb-3 flex items-center justify-between"><div><p className="font-semibold">Exportera fakturor</p><p className="text-xs text-muted-foreground">Redan synkade fakturor returnerar samma dokumentnummer.</p></div><Button size="sm" variant="ghost" onClick={() => void loadStatus()}><RefreshCw className="h-4 w-4" /></Button></div><div className="space-y-2">{(invoices ?? []).slice(0, 30).map(invoice => <div key={invoice.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">Faktura #{invoice.invoice_number}</p><p className="text-xs text-muted-foreground">{invoice.customer?.name} · {Number(invoice.total_inc_vat).toLocaleString('sv-SE')} kr</p></div><Button size="sm" disabled={syncingId === invoice.id} onClick={() => void exportInvoice(invoice.id)}>{syncingId === invoice.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Skicka'}</Button></div>)}</div></div>
        </div>}
      </DialogContent>
    </Dialog>
  </div>;
}

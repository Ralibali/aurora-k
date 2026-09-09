import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link2, MapPinned, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleMapsAvailable } from '@/lib/google-maps';
import { fortnox, FORTNOX_STATE_KEY, type FortnoxStatus } from './fortnox-api';

export default function IntegrationsTab() {
  const { companyId } = useAuth();
  const [busy, setBusy] = useState(false);
  const status = useQuery({ queryKey: ['fortnox', companyId], queryFn: () => fortnox<FortnoxStatus>('status'), enabled: !!companyId, retry: false });
  const connected = status.data?.connection?.status === 'connected';
  const act = async (action: 'connect' | 'verify' | 'disconnect') => {
    setBusy(true);
    try {
      if (action === 'connect') {
        const result = await fortnox<{ url: string; state: string }>('connect');
        const url = new URL(result.url);
        if (url.origin !== 'https://apps.fortnox.se' || url.pathname !== '/oauth-v1/auth') throw new Error('Ogiltig anslutningsadress.');
        sessionStorage.setItem(FORTNOX_STATE_KEY, result.state);
        window.location.assign(url.href);
      } else {
        await fortnox(action);
        toast.success(action === 'verify' ? 'Fortnox svarar och rätt bolag är anslutet.' : 'Fortnox har kopplats från.');
        await status.refetch();
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Kunde inte slutföra.'); }
    finally { setBusy(false); }
  };
  return <div className="space-y-5">
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Fortnox</CardTitle></CardHeader><CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">Koppla företagets Fortnox-konto och exportera granskade fakturor som utkast. Bokföring och utskick görs i Fortnox.</p>
      {status.isPending && <p role="status">Kontrollerar anslutningen…</p>}
      {status.isError && <div role="alert" className="space-y-2"><p className="text-sm">{status.error.message}</p><Button variant="outline" onClick={() => status.refetch()}>Försök igen</Button></div>}
      {status.data && <>
        <Badge variant={connected ? 'default' : 'secondary'}>{connected ? 'Anslutet' : status.data.configured ? 'Inte anslutet' : 'Väntar på konfiguration'}</Badge>
        <p className="text-sm">{status.data.company.name} · {status.data.company.organizationNumber || 'Organisationsnummer saknas'}</p>
        {!status.data.organizationValid && <p className="text-sm text-amber-700">Företagets organisationsnummer behöver rättas innan anslutningen kan godkännas. Kontakta den som ansvarar för företagskontot.</p>}
        {!status.data.configured && <p className="text-sm text-muted-foreground">Fortnox-appen behöver aktiveras för Aurora. När den är klar godkänner du åtkomsten genom att logga in hos Fortnox.</p>}
        {status.data.connection && <p className="text-sm">Fortnox: {status.data.connection.fortnox_company_name} · {status.data.connection.fortnox_organization_number}</p>}
        {status.data.connection?.last_error && <p role="alert" className="text-sm text-amber-700">{status.data.connection.last_error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy || !status.data.configured || !status.data.organizationValid} onClick={() => act('connect')}>{connected ? 'Anslut på nytt' : 'Anslut Fortnox'}</Button>
          {status.data.connection && <><Button variant="outline" disabled={busy} onClick={() => act('verify')}><RefreshCw className="mr-2 h-4 w-4" /> Kontrollera anslutning</Button><Button variant="ghost" disabled={busy} onClick={() => { if (window.confirm('Koppla från Fortnox? Tidigare exporter finns kvar och nya exporter stoppas.')) void act('disconnect'); }}>Koppla från</Button></>}
        </div>
      </>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><MapPinned className="h-5 w-5" /> Google Maps</CardTitle></CardHeader><CardContent className="space-y-3">
      <Badge variant="secondary">{mapsAvailable ? 'Konfigurerat – kontrolleras när kartan öppnas' : 'Grundkarta och navigeringslänkar tillgängliga'}</Badge>
      <p className="text-sm text-muted-foreground">Öppna uppdragets adresser i Google Maps för navigering. Med Google Maps aktiverat får du även adressökning och beräknad körväg i ruttplaneringen.</p>
      <p className="text-sm text-muted-foreground">Google Maps sköts centralt av Aurora. Företaget och förarna behöver inga egna Google-konton eller API-nycklar.</p>
      {!mapsAvailable && <p className="text-sm text-muted-foreground">Adressökning och körvägsberäkning väntar på aktivering hos Aurora. Du kan redan skriva in adresser och öppna dem i Google Maps.</p>}
    </CardContent></Card>
  </div>;
}

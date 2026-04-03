import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Code, ExternalLink, Key } from 'lucide-react';

const endpoints = [
  { method: 'GET', path: '/rest/v1/assignments', desc: 'Hämta alla uppdrag' },
  { method: 'POST', path: '/rest/v1/assignments', desc: 'Skapa nytt uppdrag' },
  { method: 'PATCH', path: '/rest/v1/assignments?id=eq.{id}', desc: 'Uppdatera ett uppdrag' },
  { method: 'GET', path: '/rest/v1/customers', desc: 'Hämta alla kunder' },
  { method: 'POST', path: '/rest/v1/customers', desc: 'Skapa ny kund' },
  { method: 'GET', path: '/rest/v1/orders', desc: 'Hämta alla beställningar' },
  { method: 'POST', path: '/rest/v1/orders', desc: 'Skapa ny beställning' },
  { method: 'GET', path: '/rest/v1/invoices', desc: 'Hämta alla fakturor' },
  { method: 'GET', path: '/rest/v1/articles', desc: 'Hämta alla artiklar' },
  { method: 'GET', path: '/rest/v1/vehicles', desc: 'Hämta alla fordon' },
  { method: 'POST', path: '/rest/v1/booking_requests', desc: 'Skapa bokningsförfrågan (publik)' },
  { method: 'GET', path: '/functions/v1/customer-portal?token={token}', desc: 'Kundportal-data' },
];

const methodColor: Record<string, string> = { GET: 'bg-blue-100 text-blue-800', POST: 'bg-green-100 text-green-800', PATCH: 'bg-yellow-100 text-yellow-800', DELETE: 'bg-red-100 text-red-800' };

export default function AdminApiDocs() {
  return (
    <AdminLayout title="API & Integrationer">
      <div className="space-y-4">
        <p className="text-muted-foreground">Öppet REST API för att integrera med Zapier, Make eller egna system.</p>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Key className="h-4 w-4" /> Autentisering</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">Alla API-anrop kräver en <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Authorization: Bearer {'<token>'}</code> header.</p>
            <p className="text-sm text-muted-foreground">Använd din inloggningstoken eller skapa en service-nyckel via inställningarna.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Code className="h-4 w-4" /> Tillgängliga endpoints</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {endpoints.map((ep, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Badge className={`${methodColor[ep.method]} font-mono text-xs min-w-[50px] justify-center`} variant="outline">{ep.method}</Badge>
                  <code className="text-xs font-mono flex-1 text-muted-foreground">{ep.path}</code>
                  <span className="text-sm">{ep.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ExternalLink className="h-4 w-4" /> Zapier / Make</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Du kan använda dessa endpoints direkt med Zapier Webhooks eller Make HTTP-moduler för att automatisera arbetsflöden som:</p>
            <ul className="list-disc list-inside text-sm mt-2 space-y-1 text-muted-foreground">
              <li>Skapa uppdrag automatiskt från formulär</li>
              <li>Synka kunder med andra system</li>
              <li>Skicka notiser vid statusändringar</li>
              <li>Exportera data till bokföringssystem</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

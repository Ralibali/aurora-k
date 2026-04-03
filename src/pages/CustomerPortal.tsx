import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, ShoppingCart, Receipt, Building2, CalendarPlus } from 'lucide-react';
import { BookingRequestForm } from '@/components/portal/BookingRequestForm';

const statusLabels: Record<string, string> = {
  pending: 'Väntande', active: 'Aktiv', in_progress: 'Pågår', completed: 'Slutförd',
  cancelled: 'Avbruten', draft: 'Utkast', sent: 'Skickad', paid: 'Betald', overdue: 'Förfallen',
};

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (s === 'completed' || s === 'paid') return 'secondary';
  if (s === 'cancelled' || s === 'overdue') return 'destructive';
  if (s === 'active' || s === 'in_progress' || s === 'sent') return 'default';
  return 'outline';
};

export default function CustomerPortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setError('Ingen åtkomsttoken angiven'); setLoading(false); return; }

    const fetchData = async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/customer-portal?token=${encodeURIComponent(token)}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Kunde inte ladda data');
        setLoading(false);
        return;
      }

      setData(await res.json());
      setLoading(false);
    };

    fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">Kontakta oss om problemet kvarstår.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { customer, assignments, orders, invoices, bookings = [] } = data;

  const handleBookingCreated = (booking: any) => {
    setData((prev: any) => ({ ...prev, bookings: [booking, ...(prev.bookings || [])] }));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <Building2 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">{customer?.name}</h1>
            <p className="text-xs text-muted-foreground">Kundportal</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        <Tabs defaultValue="assignments">
          <TabsList>
            <TabsTrigger value="assignments" className="gap-1"><ClipboardList className="h-3.5 w-3.5" /> Uppdrag</TabsTrigger>
            <TabsTrigger value="orders" className="gap-1"><ShoppingCart className="h-3.5 w-3.5" /> Beställningar</TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1"><Receipt className="h-3.5 w-3.5" /> Fakturor</TabsTrigger>
            <TabsTrigger value="booking" className="gap-1"><CalendarPlus className="h-3.5 w-3.5" /> Ny förfrågan</TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Uppdrag</TableHead>
                      <TableHead>Adress</TableHead>
                      <TableHead>Planerat</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Inga uppdrag</TableCell></TableRow>
                    )}
                    {assignments.map((a: any) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.title}</TableCell>
                        <TableCell>{a.address}</TableCell>
                        <TableCell>{new Date(a.scheduled_start).toLocaleDateString('sv-SE')}</TableCell>
                        <TableCell><Badge variant={statusVariant(a.status)}>{statusLabels[a.status] || a.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Beställning</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Inga beställningar</TableCell></TableRow>
                    )}
                    {orders.map((o: any) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.order_number}</TableCell>
                        <TableCell className="font-medium">{o.title}</TableCell>
                        <TableCell><Badge variant={statusVariant(o.status)}>{statusLabels[o.status] || o.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fakturanr</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Förfallodatum</TableHead>
                      <TableHead className="text-right">Belopp</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Inga fakturor</TableCell></TableRow>
                    )}
                    {invoices.map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">#{inv.invoice_number}</TableCell>
                        <TableCell>{inv.invoice_date}</TableCell>
                        <TableCell>{inv.due_date}</TableCell>
                        <TableCell className="text-right">{inv.total_inc_vat?.toFixed(0)} kr</TableCell>
                        <TableCell><Badge variant={statusVariant(inv.status)}>{statusLabels[inv.status] || inv.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="booking" className="mt-4">
            <BookingRequestForm token={token!} bookings={bookings} onCreated={handleBookingCreated} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAssignments, useDrivers, useCustomers, useInvoices, useSettings } from '@/hooks/useData';
import { calculateDecimalHours } from '@/lib/format';
import { ClipboardList, Clock, Building2, Receipt, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['hsl(213, 52%, 25%)', 'hsl(142, 71%, 45%)', 'hsl(32, 95%, 55%)', 'hsl(0, 72%, 51%)'];

export default function AdminStatistics() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: assignments, isLoading: loadingA } = useAssignments();
  const { data: drivers } = useDrivers();
  const { data: customers } = useCustomers();
  const { data: invoices } = useInvoices();
  const { data: settings } = useSettings();

  // Filter by selected month
  const monthAssignments = (assignments ?? []).filter(a => a.scheduled_start.startsWith(month));
  const completed = monthAssignments.filter(a => a.status === 'completed');
  const totalHours = completed.reduce((sum, a) => {
    if (!a.actual_start || !a.actual_stop) return sum;
    return sum + calculateDecimalHours(a.actual_start, a.actual_stop);
  }, 0);
  const activeCustomers = new Set(completed.map(a => a.customer_id)).size;

  const monthInvoices = (invoices ?? []).filter(i => i.invoice_date.startsWith(month));
  const invoicedAmount = monthInvoices.reduce((sum, i) => sum + i.total_inc_vat, 0);

  const hoursPerDriver = (drivers ?? []).map(d => ({
    name: d.full_name.split(' ')[0],
    fullName: d.full_name,
    timmar: +(completed.filter(a => a.assigned_driver_id === d.id).reduce((sum, a) => {
      if (!a.actual_start || !a.actual_stop) return sum;
      return sum + calculateDecimalHours(a.actual_start, a.actual_stop);
    }, 0)).toFixed(1),
    deliveries: completed.filter(a => a.assigned_driver_id === d.id).length,
  }));

  const deliveriesPerCustomer = (customers ?? []).map(c => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + '…' : c.name,
    fullName: c.name,
    value: completed.filter(a => a.customer_id === c.id).length,
  })).filter(c => c.value > 0);

  // Group deliveries per day of week
  const daysMap: Record<number, number> = {};
  completed.forEach(a => {
    const day = new Date(a.scheduled_start).getDay();
    daysMap[day] = (daysMap[day] || 0) + 1;
  });
  const dayNames = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];
  const deliveriesPerDay = dayNames.map((name, i) => ({ day: name, antal: daysMap[i] || 0 }));

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const monthLabel = month;
    const companyName = settings?.company_name || 'Företag';

    doc.setFontSize(18);
    doc.text(`Månadsrapport ${monthLabel}`, 14, 20);
    doc.setFontSize(11);
    doc.text(companyName, 14, 28);

    // Driver table
    doc.setFontSize(13);
    doc.text('Per chaufför', 14, 40);
    autoTable(doc, {
      startY: 44,
      head: [['Chaufför', 'Leveranser', 'Timmar', 'Snittid']],
      body: hoursPerDriver.filter(d => d.deliveries > 0).map(d => [
        d.fullName ?? d.name,
        String(d.deliveries),
        `${d.timmar}h`,
        d.deliveries > 0 ? `${(d.timmar / d.deliveries).toFixed(1)}h` : '-',
      ]),
    });

    // Customer table
    const afterFirst = (doc as any).lastAutoTable?.finalY ?? 80;
    doc.setFontSize(13);
    doc.text('Per kund', 14, afterFirst + 10);
    autoTable(doc, {
      startY: afterFirst + 14,
      head: [['Kund', 'Leveranser']],
      body: deliveriesPerCustomer.map(c => [c.fullName ?? c.name, String(c.value)]),
    });

    // Footer
    const afterSecond = (doc as any).lastAutoTable?.finalY ?? 140;
    doc.setFontSize(12);
    doc.text(`Totalt fakturerat: ${invoicedAmount.toFixed(0)} kr`, 14, afterSecond + 14);

    doc.save(`manadsrapport-${month}.pdf`);
  };

  return (
    <AdminLayout title="Statistik" description="Analysera leveranser, körtider och intäkter">
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-card" />
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <FileText className="h-4 w-4 mr-1" /> Exportera månadsrapport
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="stat-card-icon bg-primary/10 text-primary"><ClipboardList className="h-5 w-5" /></div>
              <div>
                {loadingA ? <Skeleton className="h-8 w-12" /> : <p className="stat-card-value font-mono">{completed.length}</p>}
                <p className="stat-card-label">Leveranser</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="stat-card-icon bg-success/10 text-success"><Clock className="h-5 w-5" /></div>
              <div>
                {loadingA ? <Skeleton className="h-8 w-12" /> : <p className="stat-card-value font-mono">{totalHours.toFixed(1)}</p>}
                <p className="stat-card-label">Körtimmar</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="stat-card-icon bg-warning/10 text-warning"><Building2 className="h-5 w-5" /></div>
              <div>
                {loadingA ? <Skeleton className="h-8 w-12" /> : <p className="stat-card-value font-mono">{activeCustomers}</p>}
                <p className="stat-card-label">Aktiva kunder</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="stat-card-icon bg-info/10 text-info"><Receipt className="h-5 w-5" /></div>
              <div>
                {loadingA ? <Skeleton className="h-8 w-12" /> : <p className="stat-card-value font-mono">{invoicedAmount.toFixed(0)}</p>}
                <p className="stat-card-label">Fakturerat (kr)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold mb-4">Leveranser per dag</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deliveriesPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="antal" fill="hsl(213, 52%, 25%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold mb-4">Timmar per chaufför</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={hoursPerDriver} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="timmar" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold mb-4">Leveranser per kund</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={deliveriesPerCustomer} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {deliveriesPerCustomer.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="p-4 border-b"><h3 className="font-semibold">Chaufförsstatistik</h3></div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chaufför</TableHead>
                  <TableHead className="text-center">Leveranser</TableHead>
                  <TableHead className="text-center">Totala timmar</TableHead>
                  <TableHead className="text-center">Snitt per leverans</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(drivers ?? []).map(d => {
                  const driverAssignments = completed.filter(a => a.assigned_driver_id === d.id);
                  const dHours = driverAssignments.reduce((sum, a) => {
                    if (!a.actual_start || !a.actual_stop) return sum;
                    return sum + calculateDecimalHours(a.actual_start, a.actual_stop);
                  }, 0);
                  const avg = driverAssignments.length > 0 ? dHours / driverAssignments.length : 0;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.full_name}</TableCell>
                      <TableCell className="text-center">{driverAssignments.length}</TableCell>
                      <TableCell className="text-center">{dHours.toFixed(1)}h</TableCell>
                      <TableCell className="text-center">{avg.toFixed(1)}h</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

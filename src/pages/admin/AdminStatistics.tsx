import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockAssignments, mockDrivers, mockCustomers, mockInvoices } from '@/lib/mock-data';
import { calculateDecimalHours } from '@/lib/format';
import { ClipboardList, Clock, Building2, Receipt, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from 'sonner';

const COLORS = ['hsl(213, 52%, 25%)', 'hsl(142, 71%, 45%)', 'hsl(32, 95%, 55%)', 'hsl(0, 72%, 51%)'];

export default function AdminStatistics() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const completed = mockAssignments.filter(a => a.status === 'completed');
  const totalHours = completed.reduce((sum, a) => {
    if (!a.actual_start || !a.actual_stop) return sum;
    return sum + calculateDecimalHours(a.actual_start, a.actual_stop);
  }, 0);
  const activeCustomers = new Set(completed.map(a => a.customer_id)).size;
  const invoicedAmount = mockInvoices.reduce((sum, i) => sum + i.total_inc_vat, 0);

  // Charts data
  const deliveriesPerDay = [
    { day: 'Mån', antal: 3 }, { day: 'Tis', antal: 5 }, { day: 'Ons', antal: 2 },
    { day: 'Tor', antal: 4 }, { day: 'Fre', antal: 6 }, { day: 'Lör', antal: 1 }, { day: 'Sön', antal: 0 },
  ];

  const hoursPerDriver = mockDrivers.map(d => ({
    name: d.full_name.split(' ')[0],
    timmar: +(completed.filter(a => a.assigned_driver_id === d.id).reduce((sum, a) => {
      if (!a.actual_start || !a.actual_stop) return sum;
      return sum + calculateDecimalHours(a.actual_start, a.actual_stop);
    }, 0)).toFixed(1),
  }));

  const deliveriesPerCustomer = mockCustomers.map(c => ({
    name: c.name.split(' ')[0],
    value: completed.filter(a => a.customer_id === c.id).length,
  })).filter(c => c.value > 0);

  return (
    <AdminLayout title="Statistik">
      <div className="space-y-6 max-w-6xl">
        {/* Month selector */}
        <div className="flex items-center gap-3">
          <input type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-card" />
          <Button variant="outline" size="sm" onClick={() => toast.info('Månadsrapport-export kommer snart')}>
            <FileText className="h-4 w-4 mr-1" /> Exportera månadsrapport
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><ClipboardList className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold">{completed.length}</p><p className="text-sm text-muted-foreground">Leveranser</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center"><Clock className="h-5 w-5 text-success" /></div>
              <div><p className="text-2xl font-bold">{totalHours.toFixed(1)}</p><p className="text-sm text-muted-foreground">Körtimmar</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><Building2 className="h-5 w-5 text-warning" /></div>
              <div><p className="text-2xl font-bold">{activeCustomers}</p><p className="text-sm text-muted-foreground">Aktiva kunder</p></div>
            </div>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Receipt className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold">{invoicedAmount.toFixed(0)}</p><p className="text-sm text-muted-foreground">Fakturerat (kr)</p></div>
            </div>
          </CardContent></Card>
        </div>

        {/* Charts */}
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
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={60} />
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

        {/* Driver stats */}
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
                {mockDrivers.map(d => {
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

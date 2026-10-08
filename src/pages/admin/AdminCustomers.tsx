import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCustomers, useAssignments, useInvoices } from '@/hooks/useData';
import { Plus, Search, Upload } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoCustomersFull } from '@/lib/demo-data';
import { CustomerImportDialog } from '@/features/customers/CustomerImportDialog';

export default function AdminCustomers() {
  const [search, setSearch] = useState('');
  const [pricingFilter, setPricingFilter] = useState<string>('all');
  const [importOpen, setImportOpen] = useState(false);
  const navigate = useNavigate();
  const { data: customers, isLoading } = useCustomers();
  const assignmentQuery = useAssignments();
  const invoiceQuery = useInvoices();
  const year = String(new Date().getFullYear());
  const jobsThisYear = (id: string) => (assignmentQuery.data ?? []).filter(a => a.customer_id === id && a.scheduled_start.startsWith(year)).length;
  const revenueThisYear = (id: string) => (invoiceQuery.data ?? []).filter(i => i.customer_id === id && i.invoice_date.startsWith(year) && ['sent','paid','overdue'].includes(i.status)).reduce((sum,i) => sum+Number(i.total_ex_vat || 0),0);
  const city = (address?: string | null) => address?.match(/\d{3}\s?\d{2}\s+([^,\n]+)/)?.[1]?.trim() || 'Ej angiven';
  const { enabled: demoEnabled } = useDemoMode();

  // Overlay demo customers when demo mode is on and the account has no real ones
  const effectiveCustomers = (demoEnabled && (customers?.length ?? 0) === 0)
    ? demoCustomersFull
    : (customers ?? []);
  const showingDemo = demoEnabled && (customers?.length ?? 0) === 0;

  const filtered = effectiveCustomers.filter((c) => {
    if (pricingFilter !== 'all' && c.pricing_type !== pricingFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) ||
        c.org_number?.toLowerCase().includes(q) ||
        c.contact_person?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <AdminLayout title="Kunder">
      <div className="space-y-5 max-w-6xl">
        {showingDemo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/40 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Demo-läge — visar exempelkunder. Klicka <strong>Ny kund</strong> för att lägga upp en riktig.
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Sök kund..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={pricingFilter} onValueChange={setPricingFilter}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Prissättning" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla pristyper</SelectItem>
              <SelectItem value="per_delivery">Per leverans</SelectItem>
              <SelectItem value="per_hour">Per timme</SelectItem>
              <SelectItem value="manual">Manuellt</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Importera CSV
          </Button>
          <Button asChild>
            <Link to="/admin/customers/new"><Plus className="h-4 w-4 mr-1" /> Ny kund</Link>
          </Button>
          <CustomerImportDialog open={importOpen} onOpenChange={setImportOpen} />
        </div>

        <div className="admin-table-card">
          <div className="p-0">
            <Table><TableHeader><TableRow><TableHead>Kund</TableHead><TableHead>Kontakt</TableHead><TableHead>Ort</TableHead><TableHead className="text-right">Uppdrag i år</TableHead><TableHead className="text-right">Omsättning i år</TableHead></TableRow></TableHeader><TableBody>
             {isLoading && [1,2,3].map(i=><TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-12 w-full" /></TableCell></TableRow>)}
             {!isLoading && filtered.map(c=><TableRow key={c.id} className="cursor-pointer" onClick={e=>{if (!(e.target as HTMLElement).closest('a,button') && !showingDemo) navigate(`/admin/customers/${c.id}`);}}>
              <TableCell><Link to={showingDemo ? '/admin/customers' : `/admin/customers/${c.id}`} className="inline-flex min-h-11 items-center font-medium">{c.name}</Link><p className="text-xs text-muted-foreground">{c.org_number || 'Org.nr saknas'}</p></TableCell>
              <TableCell><div><p>{c.contact_person || 'Kontakt saknas'}</p>{c.email && <a className="inline-flex min-h-11 items-center text-xs text-muted-foreground" href={`mailto:${c.email}`}>{c.email}</a>}{c.phone && <p><a className="inline-flex min-h-11 items-center text-xs" href={`tel:${c.phone}`}>{c.phone}</a></p>}</div></TableCell>
              <TableCell>{city(c.visit_address || c.invoice_address)}</TableCell><TableCell className="text-right">{showingDemo || assignmentQuery.isLoading || assignmentQuery.isError ? '–' : jobsThisYear(c.id)}</TableCell><TableCell className="text-right">{showingDemo || invoiceQuery.isLoading || invoiceQuery.isError ? '–' : `${revenueThisYear(c.id).toLocaleString('sv-SE')} kr`}<p className="text-xs text-muted-foreground">exkl. moms</p></TableCell>
             </TableRow>)}
             {!isLoading && filtered.length===0 && <TableRow><TableCell colSpan={5} className="py-12 text-center"><p>Inga kunder här. Lägg till din första.</p><Button className="mt-4" asChild><Link to="/admin/customers/new">Ny kund</Link></Button></TableCell></TableRow>}
            </TableBody></Table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

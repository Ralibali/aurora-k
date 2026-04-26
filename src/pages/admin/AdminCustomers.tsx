import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCustomers } from '@/hooks/useData';
import { pricingTypeLabels } from '@/lib/types';
import { Plus, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { StaggeredTableBody, StaggeredTableRow } from '@/components/StaggeredList';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoCustomersFull } from '@/lib/demo-data';

export default function AdminCustomers() {
  const [search, setSearch] = useState('');
  const [pricingFilter, setPricingFilter] = useState<string>('all');
  const navigate = useNavigate();
  const { data: customers, isLoading } = useCustomers();
  const { enabled: demoEnabled } = useDemoMode();

  // Overlay demo customers when demo mode is on and the account has no real ones
  const effectiveCustomers = (demoEnabled && (customers?.length ?? 0) === 0)
    ? (demoCustomersFull as any)
    : (customers ?? []);
  const showingDemo = demoEnabled && (customers?.length ?? 0) === 0;

  const filtered = effectiveCustomers.filter((c: any) => {
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
    <AdminLayout title="Kundregister" description="Hantera kunder och prissättning">
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
          <Button asChild>
            <Link to="/admin/customers/new"><Plus className="h-4 w-4 mr-1" /> Ny kund</Link>
          </Button>
        </div>

        <div className="admin-table-card">
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namn</TableHead>
                  <TableHead className="hidden md:table-cell">Org.nr</TableHead>
                  <TableHead className="hidden md:table-cell">Kontaktperson</TableHead>
                  <TableHead className="hidden sm:table-cell">E-post</TableHead>
                  <TableHead className="hidden sm:table-cell">Telefon</TableHead>
                  <TableHead>Prissättning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && [1, 2, 3, 4, 5].map(i => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28 rounded" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-3 w-20 rounded" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-3 w-24 rounded" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-3 w-32 rounded" /></TableCell>
                    <TableCell className="hidden sm:table-cell"><Skeleton className="h-3 w-20 rounded" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  </TableRow>
                ))}
                {!isLoading && filtered.length > 0 && (
                  <StaggeredTableBody>
                    {filtered.map((c: any) => (
                      <StaggeredTableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => !showingDemo && navigate(`/admin/customers/${c.id}`)}
                      >
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground font-mono">{c.org_number || '–'}</TableCell>
                        <TableCell className="hidden md:table-cell">{c.contact_person || '–'}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{c.email || '–'}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{c.phone || '–'}</TableCell>
                        <TableCell><span className="status-badge status-pending">{pricingTypeLabels[c.pricing_type as keyof typeof pricingTypeLabels] || c.pricing_type}</span></TableCell>
                      </StaggeredTableRow>
                    ))}
                  </StaggeredTableBody>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Inga kunder hittades</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

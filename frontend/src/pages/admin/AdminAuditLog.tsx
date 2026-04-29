import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export default function AdminAuditLog() {
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', tableFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (tableFilter && tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const actionLabel: Record<string, string> = {
    created: 'Skapad',
    updated: 'Ändrad',
    deleted: 'Borttagen',
  };

  const actionColor: Record<string, string> = {
    created: 'bg-green-500/10 text-green-500',
    updated: 'bg-blue-500/10 text-blue-500',
    deleted: 'bg-red-500/10 text-red-500',
  };

  const tableLabel: Record<string, string> = {
    assignments: 'Uppdrag',
    invoices: 'Fakturor',
    customers: 'Kunder',
  };

  const filtered = logs?.filter(log => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.table_name.includes(s) ||
      log.record_id.includes(s) ||
      (log.action && log.action.includes(s))
    );
  });

  return (
    <AdminLayout title="Ändringslogg">
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Alla ändringar i uppdrag, fakturor och kunddata loggas automatiskt för GDPR-compliance.
        </p>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök på ID eller typ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Alla tabeller" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla tabeller</SelectItem>
              <SelectItem value="assignments">Uppdrag</SelectItem>
              <SelectItem value="invoices">Fakturor</SelectItem>
              <SelectItem value="customers">Kunder</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !filtered?.length ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Inga loggposter ännu</p>
                <p className="text-sm">Ändringar i uppdrag, fakturor och kunder loggas automatiskt.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tidpunkt</TableHead>
                    <TableHead>Tabell</TableHead>
                    <TableHead>Händelse</TableHead>
                    <TableHead>Post-ID</TableHead>
                    <TableHead>Användare</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {tableLabel[log.table_name] || log.table_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColor[log.action] || ''}`}>
                          {actionLabel[log.action] || log.action}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.record_id.slice(0, 8)}…</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.user_id ? log.user_id.slice(0, 8) + '…' : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

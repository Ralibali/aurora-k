import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { mockAssignments, mockDrivers } from '@/lib/mock-data';
import { formatSwedishDateTime } from '@/lib/format';
import { Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminAssignments() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [driverFilter, setDriverFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = mockAssignments.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (driverFilter !== 'all' && a.assigned_driver_id !== driverFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.customer?.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout title="Uppdragshantering">
      <div className="space-y-4 max-w-5xl">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sök uppdrag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla statusar</SelectItem>
              <SelectItem value="pending">Ej startad</SelectItem>
              <SelectItem value="active">Pågår</SelectItem>
              <SelectItem value="completed">Klar</SelectItem>
            </SelectContent>
          </Select>
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Chaufför" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla chaufförer</SelectItem>
              {mockDrivers.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild>
            <Link to="/admin/assignments/new">
              <Plus className="h-4 w-4 mr-1" /> Nytt uppdrag
            </Link>
          </Button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Inga uppdrag hittades</p>
          )}
          {filtered.map((a) => (
            <Link key={a.id} to={`/admin/assignments/${a.id}`} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{a.title}</p>
                        <StatusBadge status={a.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {a.customer?.name} · {a.address}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatSwedishDateTime(a.scheduled_start)} · {a.driver?.full_name}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

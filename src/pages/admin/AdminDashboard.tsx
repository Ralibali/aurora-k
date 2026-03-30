import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { mockAssignments } from '@/lib/mock-data';
import { formatSwedishDateTime } from '@/lib/format';
import { ClipboardList, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const today = mockAssignments;
  const completed = today.filter(a => a.status === 'completed').length;
  const active = today.filter(a => a.status === 'active').length;

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6 max-w-5xl">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{today.length}</p>
                  <p className="text-sm text-muted-foreground">Dagens uppdrag</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completed}</p>
                  <p className="text-sm text-muted-foreground">Slutförda idag</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{active}</p>
                  <p className="text-sm text-muted-foreground">Aktiva just nu</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dagens uppdrag</h2>
          <Button asChild size="sm">
            <Link to="/admin/assignments/new">
              <Plus className="h-4 w-4 mr-1" /> Nytt uppdrag
            </Link>
          </Button>
        </div>

        {/* Assignment list */}
        <div className="space-y-2">
          {today.map((a) => (
            <Link key={a.id} to={`/admin/assignments/${a.id}`} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{a.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {a.customer?.name} · {a.driver?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatSwedishDateTime(a.scheduled_start)}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}

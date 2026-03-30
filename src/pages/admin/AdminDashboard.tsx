import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { useAssignments } from '@/hooks/useData';
import { formatSwedishDateTime } from '@/lib/format';
import { ClipboardList, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
  const { data: assignments, isLoading } = useAssignments();

  const today = new Date().toISOString().split('T')[0];
  const todayAssignments = (assignments ?? []).filter(a =>
    a.scheduled_start.startsWith(today)
  );
  const completed = todayAssignments.filter(a => a.status === 'completed').length;
  const active = todayAssignments.filter(a => a.status === 'active').length;

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6 max-w-5xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{todayAssignments.length}</p>}
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
                  {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{completed}</p>}
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
                  {isLoading ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold">{active}</p>}
                  <p className="text-sm text-muted-foreground">Aktiva just nu</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Dagens uppdrag</h2>
          <Button asChild size="sm">
            <Link to="/admin/assignments/new">
              <Plus className="h-4 w-4 mr-1" /> Nytt uppdrag
            </Link>
          </Button>
        </div>

        <div className="space-y-2">
          {isLoading && [1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          {!isLoading && todayAssignments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Inga uppdrag idag</p>
          )}
          {todayAssignments.map((a) => (
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

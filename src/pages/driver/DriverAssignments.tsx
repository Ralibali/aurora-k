import { DriverLayout } from '@/components/DriverLayout';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { useDriverAssignments } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { formatSwedishDateTime } from '@/lib/format';
import { MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

export default function DriverAssignments() {
  const { user } = useAuth();
  const { data: assignments, isLoading } = useDriverAssignments(user?.id);

  return (
    <DriverLayout>
      <div className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">Mina uppdrag</h2>
        {isLoading && [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        {!isLoading && (assignments ?? []).length === 0 && (
          <p className="text-center text-muted-foreground py-12">Inga uppdrag att visa</p>
        )}
        {(assignments ?? []).map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to={`/driver/assignment/${a.id}`}>
              <Card className="active:scale-[0.98] transition-transform touch-target">
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-base">{a.customer?.name}</p>
                    <div className="flex gap-1.5">
                      {a.priority !== 'normal' && <PriorityBadge priority={a.priority} />}
                      <StatusBadge status={a.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{a.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{formatSwedishDateTime(a.scheduled_start)}</span>
                    {a.scheduled_end && <span>– {formatSwedishDateTime(a.scheduled_end)}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </DriverLayout>
  );
}

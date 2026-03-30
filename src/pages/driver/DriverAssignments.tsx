import { useState } from 'react';
import { DriverLayout } from '@/components/DriverLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { useDriverAssignments } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { formatSwedishDateTime } from '@/lib/format';
import { MapPin, Clock, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  window.open(isIos ? `maps://maps.apple.com/?q=${encoded}` : `https://www.google.com/maps/search/?api=1&query=${encoded}`, '_blank');
}

function AssignmentCard({ a, i }: { a: any; i: number }) {
  return (
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
              <p className="font-semibold text-base">{a.customer?.name || a.title}</p>
              <div className="flex gap-1.5">
                {a.priority !== 'normal' && <PriorityBadge priority={a.priority} />}
                <StatusBadge status={a.status} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{a.address}</span>
              {a.status !== 'completed' && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openMaps(a.address); }}
                  className="text-primary hover:text-primary/80 p-1"
                  title="Navigera"
                >
                  <Navigation className="h-4 w-4" />
                </button>
              )}
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
  );
}

export default function DriverAssignments() {
  const { user } = useAuth();
  const { data: assignments, isLoading } = useDriverAssignments(user?.id);
  const [tab, setTab] = useState('active');

  const active = (assignments ?? []).filter(a => a.status !== 'completed');
  const completed = (assignments ?? []).filter(a => a.status === 'completed');

  return (
    <DriverLayout>
      <div className="p-4 space-y-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1">Aktuella ({active.length})</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">Historik ({completed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-3 mt-3">
            {isLoading && [1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
            {!isLoading && active.length === 0 && (
              <p className="text-center text-muted-foreground py-12">Inga aktuella uppdrag</p>
            )}
            {active.map((a, i) => <AssignmentCard key={a.id} a={a} i={i} />)}
          </TabsContent>
          <TabsContent value="history" className="space-y-3 mt-3">
            {isLoading && [1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
            {!isLoading && completed.length === 0 && (
              <p className="text-center text-muted-foreground py-12">Inga avklarade uppdrag</p>
            )}
            {completed.map((a, i) => <AssignmentCard key={a.id} a={a} i={i} />)}
          </TabsContent>
        </Tabs>
      </div>
    </DriverLayout>
  );
}

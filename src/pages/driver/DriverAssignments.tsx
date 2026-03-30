import { useState } from 'react';
import { DriverLayout } from '@/components/DriverLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { PriorityBadge } from '@/components/PriorityBadge';
import { useDriverAssignments } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { formatSwedishDateTime } from '@/lib/format';
import { MapPin, Clock, Navigation, ClipboardList } from 'lucide-react';
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04, duration: 0.25 }}
    >
      <Link to={`/driver/assignment/${a.id}`}>
        <Card className="active:scale-[0.98] transition-all duration-150 hover:shadow-md hover:border-primary/20">
          <CardContent className="py-4 px-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-[15px] text-foreground truncate">{a.customer?.name || a.title}</p>
              <div className="flex gap-1.5 shrink-0">
                {a.priority !== 'normal' && <PriorityBadge priority={a.priority} />}
                <StatusBadge status={a.status} />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <span className="truncate flex-1">{a.address}</span>
              {a.status !== 'completed' && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openMaps(a.address); }}
                  className="text-primary hover:text-primary/80 p-1.5 rounded-md hover:bg-primary/5 transition-colors"
                  title="Navigera"
                >
                  <Navigation className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground/80">
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
      <div className="p-4 space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full h-11">
            <TabsTrigger value="active" className="flex-1 text-sm">Aktuella ({active.length})</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 text-sm">Historik ({completed.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-3 mt-4">
            {isLoading && [1, 2, 3].map(i => <Skeleton key={i} className="h-[100px] w-full rounded-xl" />)}
            {!isLoading && active.length === 0 && (
              <div className="text-center py-16">
                <ClipboardList className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Inga aktuella uppdrag</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Nya uppdrag visas här automatiskt</p>
              </div>
            )}
            {active.map((a, i) => <AssignmentCard key={a.id} a={a} i={i} />)}
          </TabsContent>
          <TabsContent value="history" className="space-y-3 mt-4">
            {isLoading && [1, 2].map(i => <Skeleton key={i} className="h-[100px] w-full rounded-xl" />)}
            {!isLoading && completed.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground">Inga avklarade uppdrag</p>
              </div>
            )}
            {completed.map((a, i) => <AssignmentCard key={a.id} a={a} i={i} />)}
          </TabsContent>
        </Tabs>
      </div>
    </DriverLayout>
  );
}

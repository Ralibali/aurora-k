import { useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDriverAssignments, useProfile } from '@/hooks/useData';
import { useEffectiveDriverSettings } from '@/hooks/useDriverSettings';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin, Clock, Phone, List, User, Inbox, RefreshCw, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  window.open(
    isIos
      ? `maps://maps.apple.com/?q=${encoded}`
      : `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    '_blank',
  );
}

export default function DriverAssignments() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: assignments, isLoading } = useDriverAssignments(user?.id);
  const { data: driverSettings } = useEffectiveDriverSettings(user?.id);
  const showTimeReport = driverSettings?.show_time_report ?? true;
  const queryClient = useQueryClient();

  // Pull-to-refresh
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    pulling.current = false;
    setPullY(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const diff = e.touches[0].clientY - startY.current;
    if (scrollRef.current && scrollRef.current.scrollTop <= 0 && diff > 10) {
      pulling.current = true;
      setPullY(Math.min((diff - 10) * 0.5, 80));
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullY > 50 && !refreshing) {
      setRefreshing(true);
      await queryClient.invalidateQueries({ queryKey: ['assignments', 'driver', user?.id] });
      toast.success('Uppdaterat!');
      setRefreshing(false);
    }
    pulling.current = false;
    setPullY(0);
  }, [pullY, refreshing, queryClient, user?.id]);

  const now = new Date();
  const greeting = profile?.full_name
    ? `Hej, ${(profile.full_name as string).split(' ')[0]}!`
    : 'Hej!';

  const todayStr = format(now, 'yyyy-MM-dd');

  // Today's assignments sorted by time
  const todayAssignments = useMemo(() => {
    if (!assignments) return [];
    return assignments
      .filter((a: any) => a.scheduled_start.startsWith(todayStr) && a.status !== 'completed')
      .sort((a: any, b: any) => a.scheduled_start.localeCompare(b.scheduled_start));
  }, [assignments, todayStr]);

  const nextAssignment = todayAssignments[0] as any | undefined;

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {(pullY > 0 || refreshing) && (
          <div className="flex items-center justify-center" style={{ height: pullY > 0 ? pullY : 40 }}>
            <RefreshCw className={`h-5 w-5 text-primary ${refreshing ? 'animate-spin' : ''} ${pullY > 50 ? 'text-green-500' : ''}`} />
          </div>
        )}

        <div className="px-5 pt-6 pb-8 space-y-6">
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-xl font-semibold text-foreground">{greeting}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-slate-400 text-sm">
                {format(now, 'HH:mm')}
              </span>
              <span className="text-slate-400 text-sm">
                {format(now, 'EEEE d MMMM', { locale: sv })}
              </span>
            </div>
          </motion.div>

          {/* Today's assignment hero card */}
          {isLoading ? (
            <Skeleton className="h-[220px] w-full rounded-xl" />
          ) : nextAssignment ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              <Link to={`/driver/assignment/${nextAssignment.id}`}>
                <div className="bg-[#1E40AF] text-white rounded-xl p-5 space-y-3 active:scale-[0.98] transition-transform">
                  <p className="font-mono text-xs text-blue-200">
                    Uppdrag #{nextAssignment.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xl font-semibold leading-tight">
                    {nextAssignment.title}
                  </p>

                  {/* Hero pickup time */}
                  <p className="text-3xl font-bold font-mono tracking-tight">
                    {format(new Date(nextAssignment.scheduled_start), 'HH:mm')}
                    {nextAssignment.scheduled_end && (
                      <span className="text-blue-200 text-lg font-normal ml-2">
                        – {format(new Date(nextAssignment.scheduled_end), 'HH:mm')}
                      </span>
                    )}
                  </p>

                  {/* From address */}
                  <div className="flex items-start gap-2 text-blue-100 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span className="leading-snug">{nextAssignment.address}</span>
                  </div>

                  {/* Customer */}
                  {nextAssignment.customer?.name && (
                    <p className="text-blue-200 text-xs">
                      {nextAssignment.customer.name}
                    </p>
                  )}

                  {/* CTA button */}
                  <button
                    className="bg-white text-blue-700 font-semibold rounded-lg py-3 w-full text-center mt-2 active:bg-blue-50 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      // Let the Link handle navigation
                    }}
                  >
                    {nextAssignment.status === 'active' ? 'Fortsätt körning' : 'Starta körning'}
                  </button>
                </div>
              </Link>

              {/* Remaining assignments */}
              {todayAssignments.length > 1 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  + {todayAssignments.length - 1} fler uppdrag idag
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
            >
              <div className="bg-card border rounded-xl p-8 text-center space-y-3">
                <Inbox className="h-10 w-10 text-slate-300 mx-auto" />
                <p className="text-slate-500 font-medium">Inga uppdrag idag</p>
                <p className="text-slate-400 text-sm">
                  Nya uppdrag dyker upp här direkt
                </p>
              </div>
            </motion.div>
          )}

          {/* Quick actions 2x2 grid */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="grid grid-cols-2 gap-3"
          >
            {showTimeReport && (
              <Link
                to="/driver/time-report"
                className="rounded-xl p-4 flex flex-col items-center gap-2 text-sm font-medium text-foreground bg-green-50 dark:bg-green-950/30 active:scale-[0.97] transition-transform"
              >
                <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
                Tidrapport
              </Link>
            )}
            <a
              href="tel:"
              className="rounded-xl p-4 flex flex-col items-center gap-2 text-sm font-medium text-foreground bg-blue-50 dark:bg-blue-950/30 active:scale-[0.97] transition-transform"
            >
              <Phone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Kontakta kontoret
            </a>
            <Link
              to="/driver/assignments"
              className="rounded-xl p-4 flex flex-col items-center gap-2 text-sm font-medium text-foreground bg-slate-50 dark:bg-slate-800/50 active:scale-[0.97] transition-transform"
            >
              <List className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              Mina uppdrag
            </Link>
            <Link
              to="/driver/profile"
              className="rounded-xl p-4 flex flex-col items-center gap-2 text-sm font-medium text-foreground bg-slate-50 dark:bg-slate-800/50 active:scale-[0.97] transition-transform"
            >
              <User className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              Profil
            </Link>
          </motion.div>

          {/* Upcoming assignments list (rest of today) */}
          {todayAssignments.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3 }}
              className="space-y-2"
            >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Kommande idag
              </h2>
              {todayAssignments.slice(1).map((a: any) => (
                <Link key={a.id} to={`/driver/assignment/${a.id}`}>
                  <div className="bg-card border rounded-xl px-4 py-3 flex items-center gap-3 active:scale-[0.98] transition-transform">
                    <div className="text-lg font-mono font-bold text-foreground w-14 shrink-0">
                      {format(new Date(a.scheduled_start), 'HH:mm')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.address}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}

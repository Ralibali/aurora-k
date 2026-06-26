import { useMemo } from 'react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Clock, Inbox, List, Phone, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useDriverAssignments, useProfile, useSettings } from '@/hooks/useData';
import { useEffectiveDriverSettings } from '@/hooks/useDriverSettings';
import { DriverHomeAssignmentCard } from '@/features/driver/DriverHomeAssignmentCard';
import { compareRouteOrder } from '@/features/driver/route-order';

export default function DriverHomePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: assignments, isLoading } = useDriverAssignments(user?.id);
  const { data: settings } = useSettings();
  const { data: driverSettings } = useEffectiveDriverSettings(user?.id);
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');

  const todayAssignments = useMemo(() => (assignments ?? [])
    .filter(assignment => assignment.scheduled_start.startsWith(today) && assignment.status !== 'completed')
    .sort(compareRouteOrder), [assignments, today]);

  const greeting = profile?.full_name ? `Hej, ${String(profile.full_name).split(' ')[0]}!` : 'Hej!';
  const officePhone = settings?.phone?.trim();
  const nextAssignment = todayAssignments[0];

  return (
    <div className="space-y-6 px-5 pb-8 pt-6">
      <div>
        <h1 className="text-xl font-semibold">{greeting}</h1>
        <div className="mt-1 flex gap-3 text-sm text-slate-400"><span className="font-mono">{format(now, 'HH:mm')}</span><span>{format(now, 'EEEE d MMMM', { locale: sv })}</span></div>
      </div>

      {isLoading ? <Skeleton className="h-[240px] w-full rounded-xl" /> : nextAssignment ? (
        <div>
          <DriverHomeAssignmentCard assignment={nextAssignment} primary />
          {todayAssignments.length > 1 && <p className="mt-3 text-center text-xs text-muted-foreground">+ {todayAssignments.length - 1} fler uppdrag i sparad körordning</p>}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border bg-card p-8 text-center"><Inbox className="mx-auto h-10 w-10 text-slate-300" /><p className="font-medium text-slate-500">Inga uppdrag idag</p><p className="text-sm text-slate-400">Nya uppdrag dyker upp här direkt</p></div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {(driverSettings?.show_time_report ?? true) && <Link to="/driver/time-report" className="flex flex-col items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-medium"><Clock className="h-6 w-6 text-green-600" />Tidrapport</Link>}
        {officePhone ? <a href={`tel:${officePhone.replace(/\s/g, '')}`} className="flex flex-col items-center gap-2 rounded-xl bg-blue-50 p-4 text-sm font-medium"><Phone className="h-6 w-6 text-blue-600" />Kontakta kontoret</a> : <div className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground"><Phone className="h-6 w-6" />Telefon saknas</div>}
        <Link to="/driver/assignments" className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm font-medium"><List className="h-6 w-6" />Mina uppdrag</Link>
        <Link to="/driver/profile" className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm font-medium"><User className="h-6 w-6" />Profil</Link>
      </div>

      {todayAssignments.length > 1 && <div className="space-y-2"><h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Kommande idag</h2>{todayAssignments.slice(1).map((assignment, index) => <DriverHomeAssignmentCard key={assignment.id} assignment={assignment} sequence={index + 2} />)}</div>}
    </div>
  );
}

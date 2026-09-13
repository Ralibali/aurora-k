import { useEffect, useMemo, useState } from 'react';
import { Clock, Inbox, Phone, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useDriverAssignments, useProfile, useSettings } from '@/hooks/useData';
import { useEffectiveDriverSettings } from '@/hooks/useDriverSettings';
import { DriverHomeAssignmentCard } from '@/features/driver/DriverHomeAssignmentCard';
import { driverAssignmentGroups } from './assignment-flow';
import { formatStockholmTime } from '@/features/dispatch/dispatch-utils';

const filters = [
  { key: 'current', label: 'Idag & tidigare' },
  { key: 'upcoming', label: 'Kommande' },
  { key: 'open', label: 'Alla öppna' },
  { key: 'completed', label: 'Slutförda' },
  { key: 'cancelled', label: 'Avbokade' },
] as const;
type Filter = typeof filters[number]['key'];

export default function DriverHomePage() {
  const { user } = useAuth();
  const profileQuery = useProfile(user?.id);
  const assignmentsQuery = useDriverAssignments(user?.id);
  const { data: profile } = profileQuery;
  const { data: assignments, isPending, isPaused, isError, refetch } = assignmentsQuery;
  const { data: settings } = useSettings();
  const { data: driverSettings } = useEffectiveDriverSettings(user?.id);
  const [now, setNow] = useState(() => new Date());
  const [filter, setFilter] = useState<Filter>('current');
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  const groups = useMemo(() => driverAssignmentGroups(assignments ?? [], now), [assignments, now]);
  const rows = filter === 'open' ? [...groups.current, ...groups.upcoming] : groups[filter];
  const nextAssignment = groups.current[0] ?? groups.upcoming[0];
  const hasAssignments = assignments !== undefined;
  const hasProfile = profile !== undefined;
  const greeting = !hasProfile ? 'Dina uppdrag' : profile?.full_name ? `Hej, ${String(profile.full_name).split(' ')[0]}!` : 'Hej!';
  const profileStatus = profileQuery.isError
    ? hasProfile ? 'Profilen kunde inte uppdateras. Senast hämtade uppgifter visas.' : 'Din profil kunde inte hämtas.'
    : profileQuery.isPaused
      ? hasProfile ? 'Senast hämtade profil visas.' : 'Väntar på anslutning för att hämta din profil.'
      : !hasProfile && profileQuery.isPending ? 'Hämtar din profil…' : null;
  const officePhone = settings?.phone?.trim();

  return (
    <div className="space-y-6 px-5 pb-8 pt-6">
      <div>
        <h1 className="text-xl font-semibold">{greeting}</h1>
        {profileStatus && <p role={profileQuery.isError ? 'alert' : 'status'} className="mt-1 text-sm text-muted-foreground">{profileStatus}{profileQuery.isError && <Button variant="ghost" size="sm" onClick={() => void profileQuery.refetch()}>Försök hämta profilen igen</Button>}</p>}
        <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground"><span className="font-mono">{formatStockholmTime(now)}</span><span>{now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm', weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
      </div>
      {isError && <Alert variant="destructive"><AlertDescription>{hasAssignments ? 'Kunde inte uppdatera dina uppdrag. Senast hämtade uppgifter visas.' : 'Kunde inte hämta dina uppdrag.'} <Button variant="outline" size="sm" onClick={() => void refetch()}>Försök igen</Button></AlertDescription></Alert>}
      {!isError && isPaused && <Alert role="status"><AlertDescription>{hasAssignments ? 'Visar senast hämtade uppdrag. Uppdateras när anslutningen är tillbaka.' : 'Dina uppdrag har inte hämtats ännu. Väntar på anslutning.'}</AlertDescription></Alert>}
      {!hasAssignments && isPending && !isPaused && <div role="status" aria-label="Hämtar dina uppdrag"><p className="mb-2 text-sm text-muted-foreground">Hämtar dina uppdrag…</p><Skeleton className="h-[240px] w-full rounded-xl" /></div>}
      {nextAssignment && <div><h2 className="mb-2 text-sm font-semibold">Nästa körning</h2><DriverHomeAssignmentCard assignment={nextAssignment} primary /></div>}
      <div className="grid grid-cols-2 gap-3">
        {(driverSettings?.show_time_report ?? true) && <Link to="/driver/time-report" className="flex flex-col items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-medium"><Clock className="h-6 w-6 text-green-600" />Tidrapport</Link>}
        {officePhone ? <a href={`tel:${officePhone.replace(/\s/g, '')}`} className="flex flex-col items-center gap-2 rounded-xl bg-blue-50 p-4 text-sm font-medium"><Phone className="h-6 w-6 text-blue-600" />Kontakta kontoret</a> : <div className="flex flex-col items-center gap-2 rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground"><Phone className="h-6 w-6" />Telefon saknas</div>}
        <Link to="/driver/profile" className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm font-medium"><User className="h-6 w-6" />Profil</Link>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mina uppdrag</h2>
        <div className="flex gap-1 overflow-x-auto pb-2" aria-label="Filtrera mina uppdrag">{filters.map(item => <Button key={item.key} size="sm" variant={filter === item.key ? 'default' : 'outline'} aria-pressed={filter === item.key} disabled={!hasAssignments} onClick={() => setFilter(item.key)} className="shrink-0">{item.label}{hasAssignments && <span className="ml-1 font-mono">{item.key === 'open' ? groups.current.length + groups.upcoming.length : groups[item.key].length}</span>}</Button>)}</div>
        {hasAssignments && rows.length === 0 && <div className="space-y-3 rounded-xl border bg-card p-8 text-center"><Inbox className="mx-auto h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">{isPaused || isError ? 'Inga uppdrag i det senast hämtade urvalet.' : 'Inga uppdrag i detta urval.'}</p></div>}
        {rows.map(assignment => <DriverHomeAssignmentCard key={assignment.id} assignment={assignment} />)}
      </section>
    </div>
  );
}

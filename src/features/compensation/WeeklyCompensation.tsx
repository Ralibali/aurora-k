import { useState } from 'react';
import { addWeeks, startOfWeek, endOfWeek, format, getISOWeek } from 'date-fns';
import { sv } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAssignments, useDrivers } from '@/hooks/useData';
import { useObRates, usePerDiemRates } from '@/hooks/useNewFeatures';
import { calculateObBreakdown, calculatePerDiem, type SalaryAssignment } from '@/lib/salary-calculation';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

/** Display the day types chosen by the existing per-diem thresholds. */
function dayCounts(assignments: SalaryAssignment[], rates: NonNullable<ReturnType<typeof usePerDiemRates>['data']>) {
 const days = new Map<string, number>();
 for (const a of assignments) {
  if (!a.actual_start || !a.actual_stop) continue;
  const start = new Date(a.actual_start), end = new Date(a.actual_stop);
  const minutes = Math.min(7 * 24 * 60, Math.ceil((end.getTime() - start.getTime()) / 60000));
  for (let i = 0; i < minutes; i++) {
   const date = new Date(start.getTime() + i * 60000); if (date >= end) break;
   const key = format(date, 'yyyy-MM-dd'); days.set(key, (days.get(key) || 0) + 1);
  }
 }
 const sorted = rates.filter(r => r.active).sort((a,b) => b.min_hours - a.min_hours);
 let full = 0, half = 0;
 days.forEach(minutes => { const rate = sorted.find(r => minutes / 60 >= r.min_hours); if (rate?.type === 'full_day') full++; if (rate?.type === 'half_day') half++; });
 return {full, half};
}
export function WeeklyCompensation() {
 const [offset,setOffset] = useState(0);
 const aq=useAssignments(), dq=useDrivers(), oq=useObRates(), pq=usePerDiemRates();
 const start=startOfWeek(addWeeks(new Date(),offset),{weekStartsOn:1}), end=endOfWeek(start,{weekStartsOn:1});
 const loading=[aq,dq,oq,pq].some(q=>q.isLoading), failed=[aq,dq,oq,pq].some(q=>q.isError);
 const assignments=(aq.data||[]).filter(a=>a.status==='completed' && a.actual_start && a.actual_stop && new Date(a.actual_start)>=start && new Date(a.actual_start)<=end);
 const rows=(dq.data||[]).map(driver=>{const jobs=assignments.filter(a=>a.assigned_driver_id===driver.id);const ob=calculateObBreakdown(jobs,oq.data||[]);return {driver,jobs,ob,days:dayCounts(jobs,pq.data||[]),amount:ob.amount+calculatePerDiem(jobs,pq.data||[])};}).filter(r=>r.jobs.length);
 return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg">Vecka {getISOWeek(start)}</h2><div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Föregående vecka" onClick={()=>setOffset(n=>n-1)}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm">{format(start,'d MMM',{locale:sv})}–{format(end,'d MMM',{locale:sv})}</span><Button variant="outline" size="icon" aria-label="Nästa vecka" onClick={()=>setOffset(n=>n+1)}><ChevronRight className="h-4 w-4" /></Button></div></div>
 {failed ? <p role="alert" className="rounded-2xl border p-5 text-sm">Underlaget kunde inte hämtas.<Button variant="outline" className="ml-3" onClick={()=>[aq,dq,oq,pq].forEach(q=>void q.refetch())}>Försök igen</Button></p> : loading ? <Skeleton className="h-32" /> : <div className="overflow-hidden rounded-2xl border"><Table><TableHeader><TableRow><TableHead>Förare</TableHead><TableHead>Vecka</TableHead><TableHead className="text-right">OB-timmar</TableHead><TableHead className="text-right">Hel dag</TableHead><TableHead className="text-right">Halv dag</TableHead><TableHead className="text-right">Summa</TableHead></TableRow></TableHeader><TableBody>{rows.map(r=><TableRow key={r.driver.id}><TableCell className="font-medium">{r.driver.full_name}</TableCell><TableCell>{getISOWeek(start)}</TableCell><TableCell className="text-right">{r.ob.hours.toLocaleString('sv-SE',{maximumFractionDigits:2})} h</TableCell><TableCell className="text-right">{r.days.full}</TableCell><TableCell className="text-right">{r.days.half}</TableCell><TableCell className="text-right font-medium">{r.amount.toLocaleString('sv-SE',{maximumFractionDigits:2})} kr</TableCell></TableRow>)}{!rows.length && <TableRow><TableCell colSpan={6} className="py-10 text-center"><p>Ingen rapporterad tid den här veckan.</p><Button className="mt-4" variant="outline" asChild><Link to="/admin/reports">Öppna tidrapporter</Link></Button></TableCell></TableRow>}</TableBody></Table></div>}
 <p className="text-xs text-muted-foreground">Summa visar OB och traktamente enligt era sparade ersättningsnivåer.</p>
 </section>;
}

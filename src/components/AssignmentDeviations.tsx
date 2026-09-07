import {useRef,useState} from 'react';
import {AlertTriangle,CheckCircle2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {useAssignmentDeviations,useChangeDeviation,type AssignmentDeviation} from '@/lib/assignment-deviations';
import {formatSwedishDateTime} from '@/lib/format';

export default function AssignmentDeviations({assignmentId,canResolve=false,legacyComment}:{assignmentId:string;canResolve?:boolean;legacyComment?:string|null}) {
 const {data=[],isLoading,isError,refetch}=useAssignmentDeviations(assignmentId);
 const change=useChangeDeviation();const [text,setText]=useState('');const [open,setOpen]=useState(false);
 const operationId=useRef(crypto.randomUUID());const lock=useRef(false);
 const report=async()=>{if(lock.current)return;lock.current=true;try{await change.mutateAsync({type:'report',assignmentId,message:text.trim(),operationId:operationId.current});setText('');setOpen(false);operationId.current=crypto.randomUUID();}catch{/* Keep the draft and operation id for a safe retry. */}finally{lock.current=false;}};
 return <Card className="border-amber-200"><CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600"/>Avvikelser och åtgärder</CardTitle></CardHeader><CardContent className="space-y-4">
 <p className="text-sm text-muted-foreground">Beskriv vad som hänt. Administratören dokumenterar åtgärden och avslutar avvikelsen före fakturering.</p>
 {isLoading?<p role="status" className="text-sm">Hämtar avvikelser…</p>:isError?<div role="alert" className="text-sm space-y-2"><p>Avvikelserna kunde inte hämtas.</p><Button variant="outline" onClick={()=>void refetch()}>Försök igen</Button></div>:data.length===0?<p className="text-sm text-muted-foreground">Inga avvikelser registrerade i detta flöde.</p>:<ul className="space-y-3">{data.map(item=><li key={item.id}><DeviationItem deviation={item} canResolve={canResolve}/></li>)}</ul>}
 {legacyComment?.includes('AVVIKELSE')&&<p className="text-sm rounded-lg bg-amber-50 p-3 text-amber-900">Äldre avvikelsenoteringar finns i förarkommentaren. Registrera dem här om de fortfarande behöver åtgärdas.</p>}
 <Button variant="outline" disabled={change.isPending} onClick={()=>setOpen(value=>!value)}>{open?'Stäng formuläret':'Rapportera avvikelse'}</Button>
 {open&&<form className="space-y-3" onSubmit={event=>{event.preventDefault();void report();}}><Label htmlFor={`deviation-${assignmentId}`}>Vad har hänt?</Label><Textarea id={`deviation-${assignmentId}`} maxLength={3000} required value={text} onChange={event=>setText(event.target.value)} disabled={change.isPending} placeholder="Till exempel fel adress, gods som saknas eller en skada…"/><p className="text-xs text-muted-foreground">Du behöver uppkoppling för att skicka. Vid fel finns texten kvar här tills du försöker igen.</p><Button type="submit" disabled={!text.trim()||change.isPending}>{change.isPending?'Sparar…':'Spara avvikelse'}</Button></form>}
 </CardContent></Card>;
}
function DeviationItem({deviation,canResolve}:{deviation:AssignmentDeviation;canResolve:boolean}) {
 const change=useChangeDeviation();const [resolution,setResolution]=useState('');const lock=useRef(false);
 const resolved=deviation.status==='resolved';
 const save=async()=>{if(lock.current)return;lock.current=true;try{await change.mutateAsync({type:'resolve',id:deviation.id,resolution:resolution.trim()});setResolution('');}catch{/* Keep the proposed resolution for retry. */}finally{lock.current=false;}};
 return <article className={`rounded-lg border p-3 space-y-2 ${resolved?'border-green-200 bg-green-50/50':'border-amber-200 bg-amber-50/50'}`}><p className="text-sm font-medium flex gap-2 items-center">{resolved?<CheckCircle2 className="h-4 w-4"/>:<AlertTriangle className="h-4 w-4"/>}{resolved?'Åtgärdad':'Öppen avvikelse'}</p><p className="text-xs text-muted-foreground">Rapporterad {formatSwedishDateTime(deviation.created_at)}</p><p className="text-sm whitespace-pre-wrap break-words">{deviation.message}</p>
 {resolved?<div className="border-t pt-2"><p className="text-xs font-medium">Åtgärd · {formatSwedishDateTime(deviation.resolved_at!)}</p><p className="text-sm whitespace-pre-wrap break-words mt-1">{deviation.resolution}</p></div>:canResolve?<form className="border-t pt-3 space-y-2" onSubmit={event=>{event.preventDefault();void save();}}><Label htmlFor={`resolution-${deviation.id}`}>Hur har avvikelsen åtgärdats?</Label><Textarea id={`resolution-${deviation.id}`} required maxLength={3000} value={resolution} onChange={event=>setResolution(event.target.value)} disabled={change.isPending}/><Button type="submit" size="sm" disabled={!resolution.trim()||change.isPending}>{change.isPending?'Sparar…':'Spara åtgärd och avsluta'}</Button></form>:null}</article>;
}

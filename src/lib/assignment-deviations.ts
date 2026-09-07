import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type AssignmentDeviation = {
 id:string; assignment_id:string; company_id:string; reported_by:string;
 message:string; status:'open'|'resolved'; created_at:string;
 resolution:string|null; resolved_by:string|null; resolved_at:string|null;
};
// This addition remains explicit until the connected schema types are regenerated.
const client=supabase as unknown as {
 from(name:'assignment_deviations'):{select(columns:string):{
 eq(column:string,value:string):{order(column:string,options:{ascending:boolean}):Promise<{data:AssignmentDeviation[]|null;error:Error|null}>}
 }};
 rpc(name:'report_assignment_deviation'|'resolve_assignment_deviation',args:Record<string,unknown>):Promise<{data:AssignmentDeviation|null;error:Error|null}>;
};
export function useAssignmentDeviations(assignmentId?:string) {
 const {user,companyId}=useAuth();
 return useQuery({queryKey:['assignment-deviations',companyId,user?.id,assignmentId??'open'],enabled:!!companyId&&!!user,
 queryFn:async()=>{
  const q=client.from('assignment_deviations').select('*');
  const {data,error}=await (assignmentId?q.eq('assignment_id',assignmentId):q.eq('status','open')).order('created_at',{ascending:false});
  if(error)throw error;return data??[];
 },staleTime:15_000,refetchOnWindowFocus:true});
}
export function useChangeDeviation() {
 const qc=useQueryClient();
 return useMutation({mutationFn:async(input:{type:'report';assignmentId:string;message:string;operationId:string}|{type:'resolve';id:string;resolution:string})=>{
  const {data,error}=input.type==='report'?await client.rpc('report_assignment_deviation',{p_assignment_id:input.assignmentId,p_message:input.message,p_operation_id:input.operationId}):await client.rpc('resolve_assignment_deviation',{p_deviation_id:input.id,p_resolution:input.resolution});
  if(error)throw error;if(!data)throw new Error('Sparningen kunde inte bekräftas. Uppdatera vyn.');return data;
 },onSuccess:(_data,input)=>{
  void qc.invalidateQueries({queryKey:['assignment-deviations']});void qc.invalidateQueries({queryKey:['assignment_logs']});
  toast.success(input.type==='report'?'Avvikelsen är sparad och synlig för administratören.':'Avvikelsen är åtgärdad och avslutad.');
 },onError:(error:Error)=>toast.error(error.message)});
}

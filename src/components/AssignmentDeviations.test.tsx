import {beforeEach,describe,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import AssignmentDeviations from './AssignmentDeviations';
const mock=vi.hoisted(()=>({mutateAsync:vi.fn(),data:[] as unknown[]}));
vi.mock('@/lib/assignment-deviations',()=>({useAssignmentDeviations:()=>({data:mock.data,isLoading:false,isError:false,refetch:vi.fn()}),useChangeDeviation:()=>({mutateAsync:mock.mutateAsync,isPending:false})}));
beforeEach(()=>{mock.mutateAsync.mockReset();mock.data=[];});
describe('assignment deviation forms',()=>{
 it('marks a driver content report in the existing administrator report flow',async()=>{
  mock.mutateAsync.mockResolvedValue({});render(<AssignmentDeviations assignmentId="assignment-a" driverReporting/>);
  fireEvent.click(screen.getByRole('button',{name:'Rapportera problem'}));
  fireEvent.change(screen.getByLabelText('Vad vill du rapportera?'),{target:{value:'content'}});
  fireEvent.change(screen.getByLabelText('Beskriv det olämpliga innehållet'),{target:{value:'Olämplig text i instruktionerna'}});
  fireEvent.click(screen.getByRole('button',{name:'Skicka rapport'}));
  await screen.findByText('Rapporten är sparad och synlig för företagets administratör.');
  expect(mock.mutateAsync).toHaveBeenCalledWith({type:'report',assignmentId:'assignment-a',message:'[Rapport: Olämpligt innehåll]\nOlämplig text i instruktionerna',operationId:expect.any(String)});
 });
 it('keeps a failed report and its idempotency key for retry, then clears after success',async()=>{
  mock.mutateAsync.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});render(<AssignmentDeviations assignmentId="assignment-a"/>);
  fireEvent.click(screen.getByRole('button',{name:'Rapportera avvikelse'}));const input=screen.getByLabelText('Vad har hänt?');fireEvent.change(input,{target:{value:'Damaged goods'}});fireEvent.click(screen.getByRole('button',{name:'Spara avvikelse'}));
  await waitFor(()=>expect(mock.mutateAsync).toHaveBeenCalledTimes(1));expect(input).toHaveValue('Damaged goods');
  fireEvent.click(screen.getByRole('button',{name:'Spara avvikelse'}));await waitFor(()=>expect(mock.mutateAsync).toHaveBeenCalledTimes(2));expect(mock.mutateAsync.mock.calls[1][0].operationId).toBe(mock.mutateAsync.mock.calls[0][0].operationId);
  await waitFor(()=>expect(screen.queryByLabelText('Vad har hänt?')).not.toBeInTheDocument());
 });
 it('shows resolution only to the administrator and preserves the report text',()=>{
  mock.data=[{id:'deviation-a',assignment_id:'assignment-a',message:'[Rapport: Olämpligt innehåll]\nBroken box',status:'open',created_at:'2026-09-07T10:00:00Z'}];const {rerender}=render(<AssignmentDeviations assignmentId="assignment-a"/>);
  expect(screen.getByText(/\[Rapport: Olämpligt innehåll\].*Broken box/)).toBeInTheDocument();expect(screen.queryByLabelText('Hur har avvikelsen åtgärdats?')).not.toBeInTheDocument();rerender(<AssignmentDeviations assignmentId="assignment-a" canResolve/>);expect(screen.getByLabelText('Hur har avvikelsen åtgärdats?')).toBeInTheDocument();
 });
});

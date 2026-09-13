import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProblemReportForm from '@/components/ProblemReportForm';
import { supabase } from '@/integrations/supabase/client';

const supportClient = supabase as unknown as {
  rpc(name: 'report_driver_support_ticket', args: { p_message: string; p_operation_id: string }): Promise<{ data: string | null; error: { message: string } | null }>;
};

async function sendSupportReport(message: string, operationId: string) {
  const { data, error } = await supportClient.rpc('report_driver_support_ticket', { p_message: message, p_operation_id: operationId });
  if (error || !data) throw new Error('Support report was not confirmed');
}

export default function DriverSupportReport() {
  return (
    <Card id="report-problem" className="scroll-mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-5 w-5 shrink-0" /> Rapportera innehåll eller användare</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Rapporten går till Aurora Transports support. Du kan rapportera även om du inte har något uppdrag. Företagets administratörer kan också se ärendet.</p>
        <ProblemReportForm onSubmit={sendSupportReport} successMessage="Rapporten har skickats till Aurora-support." />
      </CardContent>
    </Card>
  );
}

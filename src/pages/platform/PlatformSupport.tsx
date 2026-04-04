import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlatformLayout } from '@/components/PlatformAdminLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';
import { MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Ticket {
  id: string;
  company_id: string;
  created_by: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export default function PlatformSupport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: tickets } = useQuery({
    queryKey: ['platform-support-tickets'],
    queryFn: async () => {
      const { data } = await (supabase
        .from('support_tickets' as any)
        .select('*')
        .order('created_at', { ascending: false }) as any);
      return (data || []) as Ticket[];
    },
  });

  const { data: companies } = useQuery({
    queryKey: ['platform-companies'],
    queryFn: async () => {
      const { data } = await supabase.from('companies').select('id, name');
      return data || [];
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, reply }: { ticketId: string; reply: string }) => {
      const { error } = await supabase
        .from('support_tickets' as any)
        .update({
          admin_reply: reply,
          replied_at: new Date().toISOString(),
          replied_by: user?.id,
          status: 'answered',
        })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-support-tickets'] });
      setReplyingTo(null);
      setReplyText('');
      toast.success('Svar skickat');
    },
    onError: () => toast.error('Kunde inte skicka svar'),
  });

  const closeMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase
        .from('support_tickets' as any)
        .update({ status: 'closed' })
        .eq('id', ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-support-tickets'] });
      toast.success('Ärende stängt');
    },
  });

  const getCompanyName = (companyId: string) =>
    companies?.find((c: any) => c.id === companyId)?.name || 'Okänt företag';

  const statusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'answered': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'closed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const openCount = tickets?.filter((t) => t.status === 'open').length || 0;

  return (
    <PlatformLayout title="Supportärenden" description={`${openCount} öppna ärenden`}>
      <div className="space-y-4">
        {tickets?.map((ticket) => (
          <Card key={ticket.id} className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-3">
                {statusIcon(ticket.status)}
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{ticket.subject}</h3>
                  <p className="text-xs text-muted-foreground">
                    {getCompanyName(ticket.company_id)} · {new Date(ticket.created_at).toLocaleDateString('sv-SE')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ticket.priority === 'high' ? 'destructive' : ticket.priority === 'normal' ? 'outline' : 'secondary'}>
                  {ticket.priority}
                </Badge>
                <Badge variant={ticket.status === 'open' ? 'default' : ticket.status === 'answered' ? 'secondary' : 'outline'}>
                  {ticket.status === 'open' ? 'Öppen' : ticket.status === 'answered' ? 'Besvarad' : 'Stängd'}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{ticket.message}</p>

            {ticket.admin_reply && (
              <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-100">
                <p className="text-xs font-medium text-blue-700 mb-1">Svar från Aurora Media:</p>
                <p className="text-sm text-blue-900 whitespace-pre-wrap">{ticket.admin_reply}</p>
              </div>
            )}

            {replyingTo === ticket.id ? (
              <div className="space-y-2">
                <Textarea
                  placeholder="Skriv ditt svar..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => replyMutation.mutate({ ticketId: ticket.id, reply: replyText })}
                    disabled={!replyText.trim() || replyMutation.isPending}
                  >
                    Skicka svar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyText(''); }}>
                    Avbryt
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                {ticket.status !== 'closed' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setReplyingTo(ticket.id)}>
                      Svara
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => closeMutation.mutate(ticket.id)}>
                      Stäng
                    </Button>
                  </>
                )}
              </div>
            )}
          </Card>
        ))}
        {!tickets?.length && (
          <div className="text-center py-12">
            <HeadphonesIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Inga supportärenden ännu.</p>
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}

function HeadphonesIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

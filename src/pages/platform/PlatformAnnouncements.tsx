import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlatformLayout } from '@/components/PlatformAdminLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Megaphone, Info, AlertTriangle, Sparkles } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  active: boolean;
  created_at: string;
}

export default function PlatformAnnouncements() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');

  const { data: announcements } = useQuery({
    queryKey: ['platform-announcements'],
    queryFn: async () => {
      const { data } = await (supabase
        .from('platform_announcements' as any)
        .select('*')
        .order('created_at', { ascending: false }) as any);
      return (data || []) as Announcement[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('platform_announcements' as any)
        .insert({ title, message, type, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-announcements'] });
      setShowForm(false);
      setTitle('');
      setMessage('');
      setType('info');
      toast.success('Meddelande skapat');
    },
    onError: () => toast.error('Kunde inte skapa meddelande'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('platform_announcements' as any)
        .update({ active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-announcements'] });
      toast.success('Status uppdaterad');
    },
  });

  const typeIcon = (t: string) => {
    switch (t) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'update': return <Sparkles className="h-4 w-4 text-violet-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <PlatformLayout title="Systemmeddelanden" description="Meddelanden som visas för alla kunder">
      <div className="mb-6">
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nytt meddelande
        </Button>
      </div>

      {showForm && (
        <Card className="p-5 mb-6">
          <div className="space-y-4">
            <Input placeholder="Rubrik" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Meddelande..." value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Varning</SelectItem>
                <SelectItem value="update">Uppdatering</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || !message.trim() || createMutation.isPending}>
                Publicera
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Avbryt</Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {announcements?.map((a) => (
          <Card key={a.id} className={`p-5 ${!a.active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {typeIcon(a.type)}
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{a.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(a.created_at).toLocaleDateString('sv-SE')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="outline">{a.type}</Badge>
                <Switch
                  checked={a.active}
                  onCheckedChange={(checked) => toggleMutation.mutate({ id: a.id, active: checked })}
                />
              </div>
            </div>
          </Card>
        ))}
        {!announcements?.length && (
          <div className="text-center py-12">
            <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Inga systemmeddelanden ännu.</p>
          </div>
        )}
      </div>
    </PlatformLayout>
  );
}

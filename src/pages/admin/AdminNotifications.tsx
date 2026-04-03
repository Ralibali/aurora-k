import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useNotifications, useCreateNotification } from '@/hooks/useAllFeatures';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Bell, BellRing, Info, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const typeIcons: Record<string, any> = { info: Info, warning: AlertTriangle, alert: BellRing };
const typeLabels: Record<string, string> = { info: 'Info', warning: 'Varning', alert: 'Brådskande' };

export default function AdminNotifications() {
  const { data: notifications, isLoading } = useNotifications();
  const create = useCreateNotification();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [targetRole, setTargetRole] = useState('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate({ title, message, type, target_role: targetRole === 'all' ? undefined : targetRole, created_by: user?.id || '' }, {
      onSuccess: () => { setOpen(false); setTitle(''); setMessage(''); setType('info'); setTargetRole('all'); },
    });
  };

  return (
    <AdminLayout title="Notiser & utropsmeddelanden">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">Skicka meddelanden till chaufförer och administratörer.</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nytt utrop</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nytt utrop</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Rubrik *</Label><Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="T.ex. Ändrade rutiner" /></div>
                <div className="space-y-2"><Label>Meddelande *</Label><Textarea value={message} onChange={e => setMessage(e.target.value)} required placeholder="Skriv ditt meddelande..." rows={4} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Typ</Label>
                    <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Mottagare</Label>
                    <Select value={targetRole} onValueChange={setTargetRole}><SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="all">Alla</SelectItem><SelectItem value="driver">Chaufförer</SelectItem><SelectItem value="admin">Administratörer</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Avbryt</Button><Button type="submit">Skicka</Button></div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-3">
          {isLoading ? [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />) :
          !notifications?.length ? <Card><CardContent className="py-12 text-center text-muted-foreground"><Bell className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>Inga notiser</p></CardContent></Card> :
          notifications.map(n => {
            const Icon = typeIcons[n.type] || Info;
            return (
              <Card key={n.id}>
                <CardContent className="py-4">
                  <div className="flex gap-3 items-start">
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${n.type === 'alert' ? 'text-destructive' : n.type === 'warning' ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{n.title}</p>
                        <Badge variant="outline" className="text-xs">{typeLabels[n.type] || n.type}</Badge>
                        {n.target_role && <Badge variant="secondary" className="text-xs">{n.target_role === 'driver' ? 'Chaufförer' : 'Admins'}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString('sv-SE')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}

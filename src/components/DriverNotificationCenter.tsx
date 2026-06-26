import { useEffect, useMemo, useState } from 'react';
import { Bell, BellRing, Info, AlertTriangle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useAllFeatures';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const icons = { info: Info, warning: AlertTriangle, alert: BellRing };

export function DriverNotificationCenter() {
  const { user, companyId } = useAuth();
  const { data: notifications } = useNotifications();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const visible = useMemo(() => (notifications ?? []).filter(notification => {
    const roleMatches = !notification.target_role || notification.target_role === 'driver';
    const userMatches = !notification.target_user_id || notification.target_user_id === user?.id;
    return roleMatches && userMatches;
  }), [notifications, user?.id]);

  const unread = visible.filter(notification => !notification.read_by?.includes(user?.id ?? ''));

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`driver-notifications-${companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `company_id=eq.${companyId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['notifications', companyId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [companyId, queryClient]);

  const markAllRead = async () => {
    if (!user?.id || unread.length === 0) return;
    await Promise.all(unread.map(notification => supabase
      .from('notifications')
      .update({ read_by: [...new Set([...(notification.read_by ?? []), user.id])] })
      .eq('id', notification.id)));
    queryClient.invalidateQueries({ queryKey: ['notifications', companyId] });
  };

  const handleOpen = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) void markAllRead();
  };

  return (
    <>
      <Button type="button" variant="ghost" size="icon" aria-label={`Notiser${unread.length ? `, ${unread.length} olästa` : ''}`} className="relative" onClick={() => handleOpen(true)}>
        <Bell className="h-5 w-5" />
        {unread.length > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">{Math.min(unread.length, 9)}{unread.length > 9 ? '+' : ''}</span>}
      </Button>

      <Dialog open={open} onOpenChange={handleOpen}>
        <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
          <DialogHeader><DialogTitle>Notiser från kontoret</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {visible.length === 0 && <div className="py-10 text-center text-sm text-muted-foreground"><Bell className="mx-auto mb-3 h-8 w-8 opacity-30" />Inga notiser ännu</div>}
            {visible.map(notification => {
              const Icon = icons[notification.type as keyof typeof icons] ?? Info;
              const isUnread = !notification.read_by?.includes(user?.id ?? '');
              return (
                <div key={notification.id} className={`rounded-xl border p-4 ${isUnread ? 'border-primary/30 bg-primary/5' : 'bg-card'}`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${notification.type === 'alert' ? 'text-destructive' : notification.type === 'warning' ? 'text-amber-600' : 'text-primary'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><p className="font-semibold">{notification.title}</p>{isUnread && <Badge variant="secondary" className="text-[10px]">Ny</Badge>}</div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{notification.message}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{new Date(notification.created_at).toLocaleString('sv-SE')}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

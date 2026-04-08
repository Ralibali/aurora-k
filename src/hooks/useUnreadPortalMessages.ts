import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'portal-messages-last-seen';

export function useUnreadPortalMessages() {
  const { companyId } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create a simple notification sound using Web Audio API
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not supported, silently ignore
    }
  }, []);

  const getLastSeen = useCallback(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '1970-01-01T00:00:00Z';
    } catch {
      return '1970-01-01T00:00:00Z';
    }
  }, []);

  const markAllRead = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setUnreadCount(0);
  }, []);

  // Initial count
  useEffect(() => {
    if (!companyId) return;
    const lastSeen = getLastSeen();

    const fetchCount = async () => {
      const { count, error } = await (supabase
        .from('portal_messages' as any) as any)
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('sender_type', 'customer')
        .gt('created_at', lastSeen);

      if (!error && count != null) {
        setUnreadCount(count);
      }
    };
    fetchCount();
  }, [companyId, getLastSeen]);

  // Realtime listener
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel('unread-portal-msgs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'portal_messages',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_type === 'customer') {
            setUnreadCount((c) => c + 1);
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, playNotificationSound]);

  return { unreadCount, markAllRead };
}

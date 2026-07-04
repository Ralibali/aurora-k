import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { PUBLIC_SITE_URL } from '@/lib/constants';

interface PortalChatProps {
  token: string;
  customerName: string;
}

interface Message {
  id: string;
  sender_type: 'customer' | 'admin';
  sender_name: string;
  message: string;
  created_at: string;
}

export function PortalChat({ token, customerName }: PortalChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const customerIdRef = useRef<string | null>(null);

  // Load initial messages
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.rpc('get_portal_messages', { p_token: token });
        if (error) throw error;
        setMessages((data as unknown as Message[]) || []);

        // Also get customer_id for realtime subscription
        const { data: tokenData } = await supabase.rpc('validate_customer_token', { p_token: token });
        if (tokenData && typeof tokenData === 'object' && 'customer_id' in tokenData) {
          customerIdRef.current = (tokenData as Record<string, unknown>).customer_id as string;
        }
      } catch {
        // silently handled — UI shows empty state
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // Realtime subscription
  useEffect(() => {
    if (!customerIdRef.current) return;

    const channel = supabase
      .channel('portal-chat-' + customerIdRef.current)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'portal_messages',
          filter: `customer_id=eq.${customerIdRef.current}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loading]); // re-run after loading when customerIdRef is set

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);

    try {
      const { error } = await supabase.rpc('send_portal_message', {
        p_token: token,
        p_message: newMessage.trim(),
        p_sender_name: customerName,
      });
      if (error) throw error;

      // Notify admin via email (fire and forget)
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      fetch(`https://${projectId}.supabase.co/functions/v1/notify-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          type: 'new-customer-message',
          data: {
            customerName,
            message: newMessage.trim(),
            customerUrl: `${PUBLIC_SITE_URL}/admin/customers/${customerIdRef.current}`,
          },
        }),
      }).catch(() => {});

      setNewMessage('');
    } catch {
      toast.error('Kunde inte skicka meddelandet');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-card rounded-xl border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Chatt med oss</h3>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Laddar...</div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm text-center">
            Inga meddelanden ännu.<br />Skriv ett meddelande nedan för att komma igång!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[80%] ${msg.sender_type === 'customer' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
            >
              <div
                className={`rounded-2xl px-3.5 py-2 text-sm ${
                  msg.sender_type === 'customer'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}
              >
                {msg.message}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                {msg.sender_name} · {format(new Date(msg.created_at), 'HH:mm', { locale: sv })}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 px-3 py-3 border-t">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Skriv ett meddelande..."
          className="flex-1"
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

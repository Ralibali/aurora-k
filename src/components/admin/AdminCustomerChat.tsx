import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

interface AdminCustomerChatProps {
  customerId: string;
  customerName: string;
}

interface Message {
  id: string;
  sender_type: 'customer' | 'admin';
  sender_name: string;
  message: string;
  created_at: string;
  customer_id: string;
  company_id: string;
}

export function AdminCustomerChat({ customerId, customerName }: AdminCustomerChatProps) {
  const { user, companyId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load messages
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('portal_messages')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true });
      if (!error) {
        setMessages((data as Message[]) || []);
      }
      setLoading(false);
    };
    load();
  }, [customerId]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-' + customerId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'portal_messages',
          filter: `customer_id=eq.${customerId}`,
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
  }, [customerId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !companyId) return;
    setSending(true);

    try {
      const { error } = await supabase.from('portal_messages').insert({
        customer_id: customerId,
        company_id: companyId,
        sender_type: 'admin',
        sender_name: user?.email?.split('@')[0] || 'Admin',
        message: newMessage.trim(),
      });
      if (error) throw error;
      setNewMessage('');
    } catch {
      toast.error('Kunde inte skicka meddelandet');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-card rounded-xl border">
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Chatt med {customerName}</h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Laddar...</div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm text-center">
            Inga meddelanden ännu med {customerName}.
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[80%] ${msg.sender_type === 'admin' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
            >
              <div
                className={`rounded-2xl px-3.5 py-2 text-sm ${
                  msg.sender_type === 'admin'
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

      <form onSubmit={handleSend} className="flex gap-2 px-3 py-3 border-t">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Skriv ett svar..."
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

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { fetchSupabaseFunction } from '@/lib/supabase-url';

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

export function PortalChat(props: PortalChatProps) {
  return <PortalChatSession key={props.token} {...props} />;
}

function PortalChatSession({ token, customerName }: PortalChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState('');
  const [sendError, setSendError] = useState('');
  const mounted = useRef(true);
  const reading = useRef<AbortController | null>(null);
  const writing = useRef<AbortController | null>(null);
  const requestNumber = useRef(0);

  const load = useCallback(async () => {
    reading.current?.abort();
    const controller = new AbortController();
    reading.current = controller;
    const revision = ++requestNumber.current;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const { data, error } = await supabase.rpc('get_portal_messages', { p_token: token }).abortSignal(controller.signal);
      if (error) throw error;
      if (mounted.current && revision === requestNumber.current) {
        setMessages((data as unknown as Message[]) || []);
        setLoadError('');
      }
    } catch {
      if (mounted.current && revision === requestNumber.current) setLoadError('Kunde inte hämta meddelanden. Kontrollera anslutningen eller be om en ny portallänk.');
    } finally {
      window.clearTimeout(timeout);
      if (mounted.current && revision === requestNumber.current) setLoading(false);
      if (reading.current === controller) reading.current = null;
    }
  }, [token]);

  useEffect(() => {
    mounted.current = true;
    void load();
    // Token-authorized RPC polling works for anonymous portal visitors. Direct
    // Realtime subscriptions cannot read rows protected by authenticated RLS.
    const poll = () => { if (!document.hidden && !reading.current && !writing.current) void load(); };
    const interval = window.setInterval(poll, 15_000);
    window.addEventListener('online', poll);
    document.addEventListener('visibilitychange', poll);
    return () => {
      mounted.current = false;
      requestNumber.current += 1;
      reading.current?.abort(); writing.current?.abort();
      window.clearInterval(interval);
      window.removeEventListener('online', poll);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [load]);

  useEffect(() => {
    scrollRef.current?.scrollTo?.({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = newMessage.trim();
    if (sending || !message) return;
    setSending(true); setSendError('');
    const controller = new AbortController();
    writing.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const { error } = await supabase.rpc('send_portal_message', { p_token: token, p_message: message, p_sender_name: customerName }).abortSignal(controller.signal);
      if (error) throw error;
      window.clearTimeout(timeout);
      if (!mounted.current) return;
      setNewMessage('');
      await load();
      // The saved chat message remains visible even if its email alert fails.
      void fetchSupabaseFunction('notify-admin', {}, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, type: 'new-customer-message', data: { message } }),
      }).catch(() => { if (mounted.current) toast.warning('Meddelandet är sparat i chatten, men e-postaviseringen kunde inte skickas.'); });
    } catch {
      if (mounted.current) {
        const message = controller.signal.aborted
          ? 'Bekräftelsen dröjer. Uppdatera chatten innan du försöker skicka igen.'
          : 'Kunde inte skicka meddelandet. Texten finns kvar så att du kan försöka igen.';
        setSendError(message); toast.error(message);
      }
    } finally {
      window.clearTimeout(timeout);
      if (writing.current === controller) writing.current = null;
      if (mounted.current) setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] bg-card rounded-xl border">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Chatt med oss</h3>
      </div>

      {loadError && <div role="alert" className="border-b px-4 py-2 text-sm text-destructive">{loadError} <Button size="sm" variant="ghost" onClick={() => void load()}>Försök igen</Button></div>}
      {sendError && <p role="alert" className="px-4 py-2 text-sm text-destructive">{sendError}</p>}
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
          aria-label="Meddelande"
          maxLength={4000}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Skriv ett meddelande..."
          className="flex-1"
          disabled={sending}
        />
        <Button aria-label="Skicka meddelande" type="submit" size="icon" disabled={sending || !newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

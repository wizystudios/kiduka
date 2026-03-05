import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, Send, X, Headphones, CheckCheck, Check
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { KidukaLogo } from './KidukaLogo';

interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string | null;
  sender_type: string;
  recipient_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface ChatSupportProps {
  open: boolean;
  onClose: () => void;
}

export const ChatSupport = ({ open, onClose }: ChatSupportProps) => {
  const { user, userProfile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && user?.id) {
      fetchMessages();

      const channel = supabase
        .channel('chat_realtime')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        }, (payload) => {
          const msg = payload.new as ChatMessage;
          if (msg.sender_id === user.id || msg.recipient_id === user.id) {
            setMessages(prev => [...prev, msg]);
          }
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [open, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: true })
      .limit(100);
    
    if (data) setMessages(data as ChatMessage[]);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user?.id) return;
    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        sender_id: user.id,
        sender_name: userProfile?.full_name || 'Mtumiaji',
        sender_type: 'user',
        message: newMessage.trim(),
        recipient_id: null // admin will see all
      });
      if (error) throw error;
      setNewMessage('');
    } catch {
      toast.error('Imeshindwa kutuma ujumbe');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Leo';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Jana';
    return d.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short' });
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: ChatMessage[] }[] = [];
  messages.forEach(msg => {
    const date = formatDate(msg.created_at);
    const last = groupedMessages[groupedMessages.length - 1];
    if (last?.date === date) {
      last.msgs.push(msg);
    } else {
      groupedMessages.push({ date, msgs: [msg] });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Headphones className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Msaada wa Kiduka</h3>
            <p className="text-xs opacity-80">Tupo hapa kukusaidia</p>
          </div>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <p className="font-medium">Karibu!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tuandikie ujumbe na tutakusaidia haraka.
              </p>
            </div>
          )}

          {groupedMessages.map((group, gi) => (
            <div key={gi}>
              <div className="flex justify-center mb-3">
                <Badge variant="secondary" className="text-xs rounded-full">{group.date}</Badge>
              </div>
              {group.msgs.map(msg => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      isMe 
                        ? 'bg-primary text-primary-foreground rounded-br-sm' 
                        : 'bg-card border border-border rounded-bl-sm'
                    }`}>
                      {!isMe && (
                        <p className="text-xs font-semibold text-primary mb-1">
                          {msg.sender_name || 'Admin'}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : ''}`}>
                        <span className={`text-[10px] ${isMe ? 'opacity-70' : 'text-muted-foreground'}`}>
                          {formatTime(msg.created_at)}
                        </span>
                        {isMe && (
                          msg.is_read 
                            ? <CheckCheck className="h-3 w-3 opacity-70" />
                            : <Check className="h-3 w-3 opacity-50" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border bg-background">
          <div className="flex gap-2">
            <Input
              placeholder="Andika ujumbe..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="rounded-full"
              disabled={sending}
            />
            <Button 
              size="icon" 
              className="rounded-full h-10 w-10 flex-shrink-0"
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

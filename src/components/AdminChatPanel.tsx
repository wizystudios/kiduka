import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, Send, CheckCheck, Check, User, Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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

interface ChatUser {
  id: string;
  name: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
}

export const AdminChatPanel = () => {
  const { user, userProfile } = useAuth();
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatUsers();
    
    const channel = supabase
      .channel('admin_chat_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      }, (payload) => {
        const msg = payload.new as ChatMessage;
        if (selectedUserId && (msg.sender_id === selectedUserId || msg.recipient_id === selectedUserId)) {
          setMessages(prev => [...prev, msg]);
        }
        fetchChatUsers(); // refresh sidebar
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChatUsers = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (!data) return;

    // Collect unique user IDs
    const userIds = new Set<string>();
    data.forEach(msg => {
      const userId = msg.sender_type === 'user' ? msg.sender_id : msg.recipient_id;
      if (userId && userId !== user?.id) userIds.add(userId);
    });

    // Fetch profiles for all users
    let profileMap: Record<string, { full_name: string | null; business_name: string | null }> = {};
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, business_name')
        .in('id', Array.from(userIds));
      if (profiles) {
        profiles.forEach(p => { profileMap[p.id] = { full_name: p.full_name, business_name: p.business_name }; });
      }
    }

    const userMap = new Map<string, ChatUser>();
    data.forEach(msg => {
      const userId = msg.sender_type === 'user' ? msg.sender_id : msg.recipient_id;
      if (!userId || userId === user?.id) return;
      
      if (!userMap.has(userId)) {
        const profile = profileMap[userId];
        const displayName = profile?.full_name || profile?.business_name || msg.sender_name || 'Mtumiaji';
        const businessLabel = profile?.business_name ? ` (${profile.business_name})` : '';
        userMap.set(userId, {
          id: userId,
          name: displayName + businessLabel,
          lastMessage: msg.message,
          lastTime: msg.created_at,
          unread: 0
        });
      }
      
      if (msg.sender_type === 'user' && !msg.is_read) {
        const u = userMap.get(userId)!;
        u.unread++;
      }
    });

    setChatUsers(Array.from(userMap.values()).sort((a, b) => 
      new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
    ));
  };

  const selectUser = async (userId: string) => {
    setSelectedUserId(userId);
    
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data as ChatMessage[]);

    // Mark as read
    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('sender_id', userId)
      .eq('is_read', false);

    fetchChatUsers();
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId || !user?.id) return;
    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        sender_id: user.id,
        sender_name: userProfile?.full_name || 'Admin',
        sender_type: 'admin',
        recipient_id: selectedUserId,
        message: newMessage.trim()
      });
      if (error) throw error;
      setNewMessage('');
    } catch {
      toast.error('Imeshindwa kutuma');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60000) return 'Sasa';
    if (diffMs < 3600000) return `Dak ${Math.floor(diffMs / 60000)}`;
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short' });
  };

  const filteredUsers = chatUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="rounded-3xl overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-5 w-5 text-primary" />
          Mazungumzo na Wateja
          {chatUsers.reduce((sum, u) => sum + u.unread, 0) > 0 && (
            <Badge variant="destructive" className="rounded-full">
              {chatUsers.reduce((sum, u) => sum + u.unread, 0)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex h-[500px]">
          {/* User List */}
          <div className="w-1/3 border-r border-border">
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Tafuta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-8 text-xs rounded-full"
                />
              </div>
            </div>
            <ScrollArea className="h-[450px]">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">Hakuna mazungumzo</p>
              ) : (
                filteredUsers.map(chatUser => (
                  <div 
                    key={chatUser.id}
                    className={`p-3 cursor-pointer hover:bg-muted/50 border-b border-border ${selectedUserId === chatUser.id ? 'bg-primary/5' : ''}`}
                    onClick={() => selectUser(chatUser.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="font-medium text-xs truncate">{chatUser.name}</p>
                          <span className="text-[10px] text-muted-foreground">{formatTime(chatUser.lastTime)}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">{chatUser.lastMessage}</p>
                      </div>
                      {chatUser.unread > 0 && (
                        <Badge className="h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                          {chatUser.unread}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {!selectedUserId ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Chagua mteja kuanza mazungumzo</p>
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 p-3">
                  <div className="space-y-2">
                    {messages.map(msg => {
                      const isAdmin = msg.sender_type === 'admin';
                      return (
                        <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                            isAdmin 
                              ? 'bg-primary text-primary-foreground rounded-br-sm' 
                              : 'bg-muted rounded-bl-sm'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <div className={`flex items-center gap-1 mt-1 ${isAdmin ? 'justify-end' : ''}`}>
                              <span className={`text-[10px] ${isAdmin ? 'opacity-70' : 'text-muted-foreground'}`}>
                                {formatTime(msg.created_at)}
                              </span>
                              {isAdmin && (msg.is_read ? <CheckCheck className="h-3 w-3 opacity-70" /> : <Check className="h-3 w-3 opacity-50" />)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-2 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Jibu hapa..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      className="rounded-full text-sm"
                      disabled={sending}
                    />
                    <Button size="icon" className="rounded-full flex-shrink-0" onClick={handleSend} disabled={!newMessage.trim() || sending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

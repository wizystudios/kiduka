import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { openWhatsApp, formatPhoneForWhatsApp, buildReceiptMessage, buildDebtReminderMessage, buildBulkMessage } from '@/utils/whatsappUtils';
import {
  MessageSquare, Send, Receipt, Users, Search, Phone, Clock,
  CheckCircle, XCircle, MessageCircle, ArrowUpRight
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  outstanding_balance: number | null;
}

interface WhatsAppMessageRecord {
  id: string;
  customer_name: string;
  phone_number: string;
  message: string;
  message_type: string;
  status: string;
  created_at: string;
}

export const WhatsAppManager = () => {
  const { user, userProfile } = useAuth();
  const { getEffectiveOwnerId } = usePermissions();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessageRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkMessage, setBulkMessage] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [loading, setLoading] = useState(true);

  const ownerId = getEffectiveOwnerId();

  useEffect(() => {
    if (!ownerId) return;
    fetchData();
  }, [ownerId]);

  const fetchData = async () => {
    setLoading(true);
    const [custRes, msgRes] = await Promise.all([
      supabase.from('customers').select('id, name, phone, outstanding_balance').eq('owner_id', ownerId!).not('phone', 'is', null).order('name'),
      supabase.from('whatsapp_messages').select('*').eq('owner_id', ownerId!).order('created_at', { ascending: false }).limit(50),
    ]);
    setCustomers(custRes.data || []);
    setMessages(msgRes.data || []);
    setLoading(false);
  };

  const logMessage = async (customerName: string, phoneNumber: string, message: string, messageType: string) => {
    if (!ownerId) return;
    await supabase.from('whatsapp_messages').insert({
      owner_id: ownerId,
      customer_name: customerName,
      phone_number: formatPhoneForWhatsApp(phoneNumber),
      message,
      message_type: messageType,
      status: 'sent',
    });
    fetchData();
  };

  const handleSendToCustomer = (customer: Customer, message: string, type: string) => {
    if (!customer.phone) return;
    openWhatsApp(customer.phone, message);
    logMessage(customer.name, customer.phone, message, type);
    toast({ title: 'WhatsApp imefunguliwa', description: `Ujumbe kwa ${customer.name}` });
  };

  const handleSendDebtReminder = (customer: Customer) => {
    if (!customer.phone || !customer.outstanding_balance) return;
    const msg = buildDebtReminderMessage(customer.name, customer.outstanding_balance, userProfile?.business_name || undefined);
    handleSendToCustomer(customer, msg, 'debt_reminder');
  };

  const handleSendCustomMessage = () => {
    const phone = selectedCustomer?.phone || customPhone;
    const name = selectedCustomer?.name || customPhone;
    if (!phone || !customMessage.trim()) {
      toast({ title: 'Hitilafu', description: 'Ingiza namba na ujumbe', variant: 'destructive' });
      return;
    }
    openWhatsApp(phone, customMessage);
    logMessage(name, phone, customMessage, 'general');
    setCustomMessage('');
    setSelectedCustomer(null);
    setCustomPhone('');
    toast({ title: 'WhatsApp imefunguliwa' });
  };

  const handleBulkSend = () => {
    if (!bulkMessage.trim()) return;
    const msg = buildBulkMessage(bulkMessage, userProfile?.business_name || undefined);
    const withPhone = customers.filter(c => c.phone);
    if (withPhone.length === 0) {
      toast({ title: 'Hakuna wateja wenye namba', variant: 'destructive' });
      return;
    }
    // Open first customer, log all
    openWhatsApp(withPhone[0].phone!, msg);
    withPhone.forEach(c => logMessage(c.name, c.phone!, msg, 'bulk'));
    setBulkMessage('');
    toast({ title: `Ujumbe kwa wateja ${withPhone.length}`, description: 'WhatsApp imefunguliwa kwa mteja wa kwanza. Nakili ujumbe kwa wengine.' });
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  );

  const debtors = customers.filter(c => (c.outstanding_balance || 0) > 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center justify-around border-y border-border/40 py-3">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{customers.length}</p>
          <p className="text-xs text-muted-foreground">Wateja</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{debtors.length}</p>
          <p className="text-xs text-muted-foreground">Wadaiwa</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">{messages.length}</p>
          <p className="text-xs text-muted-foreground">Ujumbe</p>
        </div>
      </div>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="send">Tuma Ujumbe</TabsTrigger>
          <TabsTrigger value="debtors">Wadaiwa</TabsTrigger>
          <TabsTrigger value="history">Historia</TabsTrigger>
        </TabsList>

        {/* Send Message Tab */}
        <TabsContent value="send" className="space-y-4 mt-4">
          {/* Quick send to phone */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Tuma kwa Namba</p>
            <div className="flex gap-2">
              <Input
                placeholder="Namba ya simu..."
                value={customPhone}
                onChange={e => { setCustomPhone(e.target.value); setSelectedCustomer(null); }}
                className="flex-1"
              />
            </div>
          </div>

          {/* Or select customer */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Au chagua mteja</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tafuta mteja..."
                className="pl-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {searchQuery && (
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg divide-y divide-border/40">
                {filteredCustomers.slice(0, 8).map(c => (
                  <button
                    key={c.id}
                    className={`w-full flex items-center justify-between p-2 text-left hover:bg-accent text-sm ${selectedCustomer?.id === c.id ? 'bg-accent' : ''}`}
                    onClick={() => { setSelectedCustomer(c); setCustomPhone(''); setSearchQuery(''); }}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground text-xs">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedCustomer && (
              <Badge variant="secondary" className="gap-1">
                <Phone className="h-3 w-3" />
                {selectedCustomer.name} - {selectedCustomer.phone}
              </Badge>
            )}
          </div>

          <Textarea
            placeholder="Andika ujumbe wako..."
            value={customMessage}
            onChange={e => setCustomMessage(e.target.value)}
            rows={3}
          />

          <Button onClick={handleSendCustomMessage} className="w-full gap-2" disabled={!(selectedCustomer?.phone || customPhone) || !customMessage.trim()}>
            <Send className="h-4 w-4" />
            Tuma kwa WhatsApp
          </Button>

          {/* Bulk */}
          <div className="border-t border-border/40 pt-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Ujumbe wa Kundi ({customers.length} wateja)
            </p>
            <Textarea
              placeholder="Ujumbe wa kundi..."
              value={bulkMessage}
              onChange={e => setBulkMessage(e.target.value)}
              rows={3}
            />
            <Button onClick={handleBulkSend} variant="outline" className="w-full gap-2" disabled={!bulkMessage.trim()}>
              <Send className="h-4 w-4" />
              Tuma kwa Wote
            </Button>
          </div>
        </TabsContent>

        {/* Debtors Tab */}
        <TabsContent value="debtors" className="mt-4">
          {debtors.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Hakuna wadaiwa</p>
          ) : (
            <div className="space-y-2">
              {debtors.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 border border-border/40 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-destructive">
                      TSh {(c.outstanding_balance || 0).toLocaleString()}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-xs"
                      onClick={() => handleSendDebtReminder(c)}
                    >
                      <MessageCircle className="h-3 w-3" />
                      Kumbusha
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Hakuna ujumbe uliotumwa</p>
          ) : (
            <div className="space-y-2">
              {messages.map(msg => (
                <div key={msg.id} className="p-3 border border-border/40 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{msg.customer_name}</span>
                    <Badge variant="outline" className="text-xs">{msg.message_type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{msg.message}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{msg.phone_number}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(msg.created_at).toLocaleDateString('sw-TZ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

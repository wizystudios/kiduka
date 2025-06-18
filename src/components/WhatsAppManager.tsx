
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageCircle, 
  Send, 
  Phone, 
  Receipt, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface WhatsAppMessage {
  id: string;
  phone_number: string;
  message: string;
  message_type: string;
  status: string;
  created_at: string;
}

export const WhatsAppManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState('general');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching WhatsApp messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!user || !phoneNumber || !messageText) {
      toast({
        title: 'Hitilafu',
        description: 'Tafadhali jaza maelezo yote',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .insert({
          owner_id: user.id,
          phone_number: phoneNumber,
          message: messageText,
          message_type: messageType,
          status: 'sent'
        });

      if (error) throw error;

      toast({
        title: 'Ujumbe Umetumwa',
        description: `Ujumbe umetumwa kwa ${phoneNumber}`,
      });

      setPhoneNumber('');
      setMessageText('');
      fetchMessages();
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kutuma ujumbe',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const sendReceiptToCustomer = async (saleId: string, customerPhone: string) => {
    if (!user) return;

    const receiptMessage = `
Ahsante kwa ununuzi wako!
Bidhaa: [Orodha ya bidhaa]
Jumla: TZS [Kiasi]
Tarehe: ${new Date().toLocaleDateString('sw-TZ')}
Tumaini utarudi tena!
    `;

    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .insert({
          owner_id: user.id,
          phone_number: customerPhone,
          message: receiptMessage,
          message_type: 'receipt',
          status: 'sent'
        });

      if (error) throw error;

      toast({
        title: 'Risiti Imetumwa',
        description: `Risiti imetumwa kwa ${customerPhone}`,
      });
    } catch (error) {
      console.error('Error sending receipt:', error);
    }
  };

  const sendLowStockAlert = async (productName: string, currentStock: number) => {
    if (!user) return;

    const alertMessage = `
🚨 ONYO LA STOCK!
Bidhaa: ${productName}
Stock iliyobaki: ${currentStock}
Tafadhali ongeza stock haraka iwezekanavyo.
    `;

    // Send to store manager or owner
    const managerPhone = '+255700000000'; // This should come from settings

    try {
      const { error } = await supabase
        .from('whatsapp_messages')
        .insert({
          owner_id: user.id,
          phone_number: managerPhone,
          message: alertMessage,
          message_type: 'stock_alert',
          status: 'sent'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending stock alert:', error);
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'receipt': return <Receipt className="h-4 w-4" />;
      case 'stock_alert': return <AlertTriangle className="h-4 w-4" />;
      case 'order': return <MessageCircle className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'default';
      case 'delivered': return 'secondary';
      case 'read': return 'outline';
      case 'failed': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      {/* Send Message Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="h-5 w-5 mr-2" />
            Tuma Ujumbe wa WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Namba ya Simu</label>
              <Input
                type="tel"
                placeholder="+255700000000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Aina ya Ujumbe</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
              >
                <option value="general">Ujumbe wa Kawaida</option>
                <option value="receipt">Risiti</option>
                <option value="promotion">Tangazo</option>
                <option value="order">Agizo</option>
                <option value="stock_alert">Onyo la Stock</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Ujumbe</label>
            <Textarea
              placeholder="Andika ujumbe wako hapa..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={4}
            />
          </div>

          <Button onClick={sendMessage} disabled={loading} className="w-full">
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Inatuma...' : 'Tuma Ujumbe'}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Vitendo vya Haraka</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="flex items-center">
              <Receipt className="h-4 w-4 mr-2" />
              Tuma Risiti
            </Button>
            <Button variant="outline" className="flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Onyo la Stock
            </Button>
            <Button variant="outline" className="flex items-center">
              <MessageCircle className="h-4 w-4 mr-2" />
              Tangazo la Bidhaa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Message History */}
      <Card>
        <CardHeader>
          <CardTitle>Historia ya Ujumbe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {messages.length > 0 ? (
              messages.map((msg) => (
                <div key={msg.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex items-start space-x-3 flex-1">
                    {getMessageTypeIcon(msg.message_type)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">{msg.phone_number}</span>
                        <Badge variant={getStatusColor(msg.status) as any}>
                          {msg.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{msg.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(msg.created_at).toLocaleString('sw-TZ')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">Hakuna ujumbe wa WhatsApp</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

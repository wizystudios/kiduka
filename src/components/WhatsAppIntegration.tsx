
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Send, 
  Receipt, 
  Package, 
  AlertTriangle,
  Users,
  ShoppingCart
} from 'lucide-react';

interface WhatsAppMessage {
  id: string;
  phone_number: string;
  message: string;
  message_type: 'receipt' | 'order' | 'inventory_alert' | 'payment_reminder' | 'general';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  created_at: string;
}

interface WhatsAppOrder {
  customer_phone: string;
  customer_name: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
  total_amount: number;
  delivery_address?: string;
  notes?: string;
}

export const WhatsAppIntegration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [pendingOrders, setPendingOrders] = useState<WhatsAppOrder[]>([]);
  const [bulkMessage, setBulkMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'customers' | 'suppliers'>('customers');
  const [loading, setLoading] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);

  useEffect(() => {
    fetchMessages();
    fetchPendingOrders();
    setupWhatsAppWebhook();
  }, [user]);

  const fetchMessages = async () => {
    // In a real implementation, this would fetch from your WhatsApp messages table
    // For now, we'll simulate with local state
    setMessages([]);
  };

  const fetchPendingOrders = async () => {
    // Simulate WhatsApp orders
    setPendingOrders([]);
  };

  const setupWhatsAppWebhook = async () => {
    // This would set up webhook endpoints for receiving WhatsApp messages
    console.log('Setting up WhatsApp webhook for order processing');
  };

  const sendWhatsAppMessage = async (phoneNumber: string, message: string, messageType: string) => {
    try {
      setLoading(true);

      // Format phone number (ensure it starts with country code)
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+255${phoneNumber}`;

      const response = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phoneNumber: formattedPhone,
          message: message,
          messageType: messageType
        }
      });

      if (response.error) throw response.error;

      toast({
        title: 'Ujumbe Umetumwa',
        description: `Ujumbe umetumwa kwa ${formattedPhone}`,
      });

      return true;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kutuma ujumbe wa WhatsApp',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendReceiptViaWhatsApp = async (saleId: string, customerPhone: string) => {
    try {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select('id, created_at, total_amount, payment_method')
        .eq('id', saleId)
        .maybeSingle();

      if (saleError) throw saleError;
      if (!sale) throw new Error('Sale not found');

      const { data: items, error: itemsError } = await supabase
        .from('sales_items')
        .select(`
          quantity,
          unit_price,
          subtotal,
          products ( name )
        `)
        .eq('sale_id', saleId);

      if (itemsError) throw itemsError;

      let receiptMessage = `🧾 RISITI YA MAUZO\n\n`;
      receiptMessage += `📅 Tarehe: ${new Date(sale.created_at).toLocaleDateString('sw-TZ')}\n`;
      receiptMessage += `🔢 Namba: ${String(sale.id).slice(0, 8)}\n\n`;
      receiptMessage += `📦 BIDHAA:\n`;

      (items || []).forEach((item: any) => {
        receiptMessage += `• ${item.products?.name}\n`;
        receiptMessage += `  ${item.quantity} × TZS ${Number(item.unit_price).toLocaleString()} = TZS ${Number(item.subtotal).toLocaleString()}\n\n`;
      });

      receiptMessage += `💰 JUMLA: TZS ${Number(sale.total_amount).toLocaleString()}\n`;
      receiptMessage += `💳 MALIPO: ${sale.payment_method || 'cash'}\n\n`;
      receiptMessage += `Asante kwa kununua! 🙏\nKaribu tena! 😊`;

      await sendWhatsAppMessage(customerPhone, receiptMessage, 'receipt');
    } catch (error) {
      console.error('Error sending receipt via WhatsApp:', error);
    }
  };

  const sendInventoryAlert = async (productName: string, currentStock: number, threshold: number) => {
    try {
      // Get supplier contacts from your database
      const { data: suppliers } = await supabase
        .from('customers')
        .select('phone, name')
        .not('phone', 'is', null);

      const alertMessage = `🚨 ONYO LA HIFADHI\n\n` +
        `📦 Bidhaa: ${productName}\n` +
        `📊 Stock ya Sasa: ${currentStock}\n` +
        `⚠️ Kiwango cha Chini: ${threshold}\n\n` +
        `Tunakuomba utume bidhaa hii haraka iwezekanavyo.\n\n` +
        `Asante! 🙏`;

      // Send to all suppliers (in real implementation, you'd have a suppliers table)
      for (const supplier of suppliers || []) {
        if (supplier.phone) {
          await sendWhatsAppMessage(supplier.phone, alertMessage, 'inventory_alert');
        }
      }
    } catch (error) {
      console.error('Error sending inventory alert:', error);
    }
  };

  const processWhatsAppOrder = (orderText: string, customerPhone: string): WhatsAppOrder | null => {
    try {
      // Simple order parsing - in production, you'd use NLP
      // Expected format: "Ninataka mkate 2, maziwa 1, sukari 1kg"
      
      const items: Array<{product_name: string; quantity: number; unit_price: number}> = [];
      let customerName = 'Mteja';

      // Extract customer name if provided
      const nameMatch = orderText.match(/jina langu ni ([a-zA-Z\s]+)/i);
      if (nameMatch) {
        customerName = nameMatch[1].trim();
      }

      // Parse items (simplified)
      const itemMatches = orderText.match(/(\w+)\s+(\d+)/g);
      if (itemMatches) {
        for (const match of itemMatches) {
          const [, productName, quantityStr] = match.match(/(\w+)\s+(\d+)/) || [];
          if (productName && quantityStr) {
            // In production, you'd look up actual product prices
            items.push({
              product_name: productName,
              quantity: parseInt(quantityStr),
              unit_price: 1000 // Default price
            });
          }
        }
      }

      if (items.length === 0) return null;

      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

      return {
        customer_phone: customerPhone,
        customer_name: customerName,
        items,
        total_amount: totalAmount
      };
    } catch (error) {
      console.error('Error parsing WhatsApp order:', error);
      return null;
    }
  };

  const confirmWhatsAppOrder = async (order: WhatsAppOrder) => {
    try {
      // Create customer if not exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', order.customer_phone)
        .single();

      let customerId = existingCustomer?.id;

      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: order.customer_name,
            phone: order.customer_phone
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          owner_id: user?.id,
          customer_id: customerId,
          total_amount: order.total_amount,
          payment_method: 'pending'
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Send confirmation message
      const confirmationMessage = `✅ AGIZO LIMEPOKEWA\n\n` +
        `📦 Bidhaa:\n${order.items.map(item => 
          `• ${item.product_name} (${item.quantity})`
        ).join('\n')}\n\n` +
        `💰 Jumla: TZS ${order.total_amount.toLocaleString()}\n` +
        `📞 Tutakupigia simu kwa maelezo zaidi.\n\n` +
        `Asante! 🙏`;

      await sendWhatsAppMessage(order.customer_phone, confirmationMessage, 'order');

      // Remove from pending orders
      setPendingOrders(prev => prev.filter(o => o !== order));

      toast({
        title: 'Agizo Limethitiwa',
        description: `Agizo la ${order.customer_name} limethitiwa`,
      });
    } catch (error) {
      console.error('Error confirming WhatsApp order:', error);
      toast({
        title: 'Hitilafu',
        description: 'Imeshindwa kuthibitisha agizo',
        variant: 'destructive'
      });
    }
  };

  const sendBulkMessage = async () => {
    if (!bulkMessage.trim()) return;

    try {
      setLoading(true);
      
      let recipients: any[] = [];

      if (targetAudience === 'customers') {
        const { data } = await supabase
          .from('customers')
          .select('phone, name')
          .not('phone', 'is', null);
        recipients = data || [];
      }

      for (const recipient of recipients) {
        if (recipient.phone) {
          await sendWhatsAppMessage(recipient.phone, bulkMessage, 'general');
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setBulkMessage('');
      toast({
        title: 'Ujumbe wa Kundi Umetumwa',
        description: `Ujumbe umetumwa kwa wateja ${recipients.length}`,
      });
    } catch (error) {
      console.error('Error sending bulk message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* WhatsApp Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>WhatsApp Business</span>
            </div>
            <Badge variant={whatsappEnabled ? 'default' : 'secondary'}>
              {whatsappEnabled ? 'Inapatikana' : 'Haijumuishwa'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-gray-600">Risiti zilizotumwa</p>
                  <p className="text-xl font-bold">0</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm text-gray-600">Maagizo yapo</p>
                  <p className="text-xl font-bold">{pendingOrders.length}</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-600">Makaghi ya hifadhi</p>
                  <p className="text-xl font-bold">0</p>
                </div>
              </div>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Maagizo Yanayosubiri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingOrders.map((order, index) => (
              <div key={index} className="border p-4 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{order.customer_name}</p>
                    <p className="text-sm text-gray-600">{order.customer_phone}</p>
                  </div>
                  <p className="text-lg font-bold text-green-600">
                    TZS {order.total_amount.toLocaleString()}
                  </p>
                </div>
                
                <div className="space-y-1 mb-3">
                  {order.items.map((item, itemIndex) => (
                    <p key={itemIndex} className="text-sm">
                      {item.product_name} × {item.quantity}
                    </p>
                  ))}
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={() => confirmWhatsAppOrder(order)}
                    size="sm"
                    className="flex-1"
                  >
                    Thibitisha Agizo
                  </Button>
                  <Button
                    onClick={() => setPendingOrders(prev => prev.filter(o => o !== order))}
                    variant="outline"
                    size="sm"
                  >
                    Kataa
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Bulk Messaging */}
      <Card>
        <CardHeader>
          <CardTitle>Tuma Ujumbe wa Kundi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button
              variant={targetAudience === 'customers' ? 'default' : 'outline'}
              onClick={() => setTargetAudience('customers')}
              size="sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Wateja
            </Button>
            <Button
              variant={targetAudience === 'suppliers' ? 'default' : 'outline'}
              onClick={() => setTargetAudience('suppliers')}
              size="sm"
            >
              <Package className="h-4 w-4 mr-2" />
              Wasambazaji
            </Button>
          </div>

          <Textarea
            placeholder="Andika ujumbe wako hapa..."
            value={bulkMessage}
            onChange={(e) => setBulkMessage(e.target.value)}
            rows={4}
          />

          <Button
            onClick={sendBulkMessage}
            disabled={!bulkMessage.trim() || loading}
            className="w-full"
          >
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
        <CardContent className="space-y-2">
          <Button
            onClick={() => sendInventoryAlert('Mkate', 5, 10)}
            variant="outline"
            className="w-full justify-start"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Tuma Onyo la Hifadhi (Mfano)
          </Button>
          
          <Button
            onClick={() => {
              // Demo: simulate receiving an order
              const demoOrder: WhatsAppOrder = {
                customer_phone: '+255123456789',
                customer_name: 'Demo Customer',
                items: [
                  { product_name: 'Mkate', quantity: 2, unit_price: 1500 },
                  { product_name: 'Maziwa', quantity: 1, unit_price: 2000 }
                ],
                total_amount: 5000
              };
              setPendingOrders(prev => [...prev, demoOrder]);
            }}
            variant="outline"
            className="w-full justify-start"
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Agizo la Demo (WhatsApp)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

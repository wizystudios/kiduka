import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Package, Truck, CheckCircle, XCircle, Clock, Phone, MapPin, Eye, RefreshCw, User, MessageSquare, Send, Receipt, Megaphone, Users
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDataAccess } from '@/hooks/useDataAccess';
import { useAuth } from '@/hooks/useAuth';
import { estimateDeliveryDays } from '@/utils/deliveryEstimation';

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  listing_id?: string;
}

export interface SokoniOrder {
  id: string;
  customer_phone: string;
  delivery_address: string;
  items: OrderItem[];
  total_amount: number;
  payment_method: string | null;
  payment_status: string;
  order_status: string;
  tracking_code?: string | null;
  linked_sale_id?: string | null;
  transaction_id?: string;
  delivery_person_name?: string | null;
  delivery_person_phone?: string | null;
  created_at: string;
  updated_at: string;
}

export const SokoniOrderManagement = () => {
  const { dataOwnerId, loading: dataLoading } = useDataAccess();
  const { user } = useAuth();
  const [orders, setOrders] = useState<SokoniOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SokoniOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [_activeTab, _setActiveTab] = useState('new');
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [whatsappMsg, setWhatsappMsg] = useState('');
  const [sendingWa, setSendingWa] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchMsg, setBatchMsg] = useState('');
  const [sendingBatch, setSendingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ sent: 0, total: 0 });
  const [sellerProfileRegion, setSellerProfileRegion] = useState<string | null>(null);

  // Fetch seller profile region for delivery estimates
  useEffect(() => {
    const fetchRegion = async () => {
      if (!dataOwnerId) return;
      const { data } = await supabase
        .from('profiles')
        .select('region')
        .eq('id', dataOwnerId)
        .single();
      if (data) setSellerProfileRegion((data as any).region || null);
    };
    fetchRegion();
  }, [dataOwnerId]);
  useEffect(() => {
    if (dataOwnerId) {
      fetchOrders();
      const channel = supabase
        .channel('sokoni_orders_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sokoni_orders', filter: `seller_id=eq.${dataOwnerId}` },
          (payload) => {
            const updatedOrder = payload.new as any;
            setOrders(prev => {
              const exists = prev.find(o => o.id === updatedOrder.id);
              if (exists) {
                return prev.map(o => o.id === updatedOrder.id ? { ...o, ...updatedOrder, items: Array.isArray(updatedOrder.items) ? updatedOrder.items : JSON.parse(updatedOrder.items || '[]') } : o);
              }
              return [{ ...updatedOrder, items: Array.isArray(updatedOrder.items) ? updatedOrder.items : JSON.parse(updatedOrder.items || '[]') }, ...prev];
            });
          }
        ).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [dataOwnerId]);

  const fetchOrders = async () => {
    if (!dataOwnerId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sokoni_orders')
        .select('*')
        .eq('seller_id', dataOwnerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setOrders((data || []).map(order => ({
        ...order,
        items: Array.isArray(order.items) ? order.items : JSON.parse(order.items as string || '[]')
      })));
    } catch {
      toast.error('Imeshindwa kupakia oda');
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.startsWith('+')) return phone;
    if (phone.startsWith('0')) return `+255${phone.slice(1)}`;
    if (phone.startsWith('255')) return `+${phone}`;
    return `+255${phone}`;
  };

  const sendWhatsAppToCustomer = async (order: SokoniOrder, message: string, messageType: string) => {
    const phone = formatPhone(order.customer_phone);
    try {
      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: { phoneNumber: phone, message, messageType }
      });

      if (user) {
        await supabase.from('whatsapp_messages').insert({
          owner_id: user.id,
          customer_name: `Sokoni - ${order.customer_phone}`,
          phone_number: phone,
          message,
          message_type: messageType,
          status: error ? 'sent_wa_link' : 'sent',
        });
      }

      if (error) {
        window.open(`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`, '_blank');
      }
      return true;
    } catch {
      window.open(`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`, '_blank');
      if (user) {
        await supabase.from('whatsapp_messages').insert({
          owner_id: user.id, customer_name: `Sokoni - ${order.customer_phone}`,
          phone_number: phone, message, message_type: messageType, status: 'sent_wa_link',
        });
      }
      return true;
    }
  };

  const buildOrderConfirmationMsg = (order: SokoniOrder) => {
    const itemsList = order.items.map(i => `• ${i.product_name} x${i.quantity} = TSh ${(i.unit_price * i.quantity).toLocaleString()}`).join('\n');
    
    // Get seller's region for delivery estimate
    let deliveryLine = '';
    if (user) {
      // Fetch seller profile region asynchronously isn't ideal here, so we use a cached approach
      // The delivery estimate will be added via the profile region stored in component
      const sellerRegion = sellerProfileRegion;
      if (sellerRegion) {
        const estimate = estimateDeliveryDays(sellerRegion, null);
        deliveryLine = `\n🚚 Makadirio ya usafirishaji: ${estimate.label}${estimate.distanceKm ? ` (~${estimate.distanceKm} km)` : ''}\n`;
      }
    }
    
    return `✅ ODA YAKO IMETHIBITISHWA!\n\n` +
      `📦 Namba: #${order.id.slice(0, 8).toUpperCase()}\n` +
      `${order.tracking_code ? `🔍 Tracking: ${order.tracking_code}\n` : ''}` +
      `\n📋 Bidhaa:\n${itemsList}\n\n` +
      `💰 Jumla: TSh ${order.total_amount.toLocaleString()}\n` +
      `📍 Anwani: ${order.delivery_address}\n` +
      deliveryLine +
      `\n🔗 Fuatilia oda: https://kiduka.lovable.app/track-order?code=${order.tracking_code || ''}\n\n` +
      `Tutakuarifu oda yako itakapokuwa njiani! 🚚\nAsante! 🙏`;
  };

  const buildDeliveringMsg = (order: SokoniOrder) => {
    return `🚚 ODA YAKO INAKUJA!\n\n` +
      `📦 Namba: #${order.id.slice(0, 8).toUpperCase()}\n` +
      `${order.tracking_code ? `🔍 Tracking: ${order.tracking_code}\n` : ''}` +
      `\n👤 Mpelekaji: ${order.delivery_person_name || 'N/A'}\n` +
      `📞 Simu: ${order.delivery_person_phone || 'N/A'}\n\n` +
      `📍 Anwani: ${order.delivery_address}\n` +
      `💰 Jumla: TSh ${order.total_amount.toLocaleString()}\n\n` +
      `Tafadhali kuwa tayari kupokea! 📦\nAsante! 🙏`;
  };

  const buildDeliveredMsg = (order: SokoniOrder) => {
    const itemsList = order.items.map(i => `• ${i.product_name} x${i.quantity} = TSh ${(i.unit_price * i.quantity).toLocaleString()}`).join('\n');
    return `🧾 RISITI - ODA IMEKAMILIKA!\n\n` +
      `📦 Namba: #${order.id.slice(0, 8).toUpperCase()}\n` +
      `📅 Tarehe: ${new Date().toLocaleDateString('sw-TZ')}\n\n` +
      `📋 Bidhaa:\n${itemsList}\n\n` +
      `💰 JUMLA: TSh ${order.total_amount.toLocaleString()}\n` +
      `💳 Malipo: ${order.payment_status === 'paid' ? 'Imelipwa ✅' : 'Inasubiri'}\n\n` +
      `Asante kwa kununua kwenye Sokoni! 🛍️\nKaribu tena! 😊`;
  };

  const buildCancelledMsg = (order: SokoniOrder) => {
    return `❌ ODA IMEGHAIRIWA\n\n` +
      `📦 Namba: #${order.id.slice(0, 8).toUpperCase()}\n` +
      `💰 Kiasi: TSh ${order.total_amount.toLocaleString()}\n\n` +
      `Samahani, oda yako imeghairiwa.\nTafadhali wasiliana nasi kwa maelezo zaidi.\nAsante! 🙏`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-primary/10 text-primary',
      confirmed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
      delivering: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      cancelled: 'bg-destructive/10 text-destructive'
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'Mpya',
      confirmed: 'Imethibitishwa',
      delivering: 'Inapelekwa',
      delivered: 'Imepelekwa',
      cancelled: 'Imeghairiwa'
    };
    return labels[status] || status;
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, extraData?: Record<string, any>) => {
    try {
      const updateData: any = { order_status: newStatus, updated_at: new Date().toISOString(), ...extraData };
      
      const { error } = await supabase
        .from('sokoni_orders')
        .update(updateData)
        .eq('id', orderId);
      if (error) throw error;

      if (newStatus === 'confirmed') {
        const current = orders.find(o => o.id === orderId);
        if (!current?.linked_sale_id) {
          const { data: saleId, error: saleError } = await supabase.rpc('process_sokoni_order_to_sale', { order_id: orderId });
          if (saleError) {
            toast.error('Oda imethibitishwa, lakini imeshindwa kuingia kwenye mauzo.');
          } else if (saleId) {
            await supabase.from('sokoni_orders').update({ linked_sale_id: saleId }).eq('id', orderId);
          }
        }
      }

      const updatedOrder = { ...(orders.find(o => o.id === orderId)!), order_status: newStatus, ...extraData, updated_at: new Date().toISOString() };
      
      setOrders(prev => prev.map(order =>
        order.id === orderId ? updatedOrder : order
      ));

      // Auto-send WhatsApp notifications on status changes
      let waMsg = '';
      let waType = 'order';
      switch (newStatus) {
        case 'confirmed':
          waMsg = buildOrderConfirmationMsg(updatedOrder);
          break;
        case 'delivering':
          waMsg = buildDeliveringMsg(updatedOrder);
          break;
        case 'delivered':
          waMsg = buildDeliveredMsg(updatedOrder);
          waType = 'receipt';
          break;
        case 'cancelled':
          waMsg = buildCancelledMsg(updatedOrder);
          break;
      }

      if (waMsg) {
        sendWhatsAppToCustomer(updatedOrder, waMsg, waType);
      }

      // Trigger push notification edge function for customer
      try {
        await supabase.functions.invoke('notify-order-status', {
          body: {
            order_id: orderId,
            old_status: orders.find(o => o.id === orderId)?.order_status,
            new_status: newStatus,
            tracking_code: updatedOrder.tracking_code,
            customer_phone: updatedOrder.customer_phone,
          },
        });
      } catch (notifyErr) {
        console.error('Push notification failed:', notifyErr);
      }

      toast.success(`Oda: "${getStatusLabel(newStatus)}"`);
      setSelectedOrder(null);
      setDeliveryName('');
      setDeliveryPhone('');
    } catch {
      toast.error('Imeshindwa kubadilisha hali ya oda');
    }
  };

  const openCustomWhatsApp = (order: SokoniOrder) => {
    setWhatsappMsg(`Habari, kuhusu oda yako #${order.id.slice(0, 8).toUpperCase()} ya TSh ${order.total_amount.toLocaleString()}:\n\n`);
    setWhatsappOpen(true);
  };

  const sendCustomWhatsApp = async () => {
    if (!selectedOrder || !whatsappMsg.trim()) return;
    setSendingWa(true);
    await sendWhatsAppToCustomer(selectedOrder, whatsappMsg, 'general');
    toast.success('Ujumbe umetumwa!');
    setSendingWa(false);
    setWhatsappOpen(false);
  };

  const sendReceiptWhatsApp = (order: SokoniOrder) => {
    const msg = buildDeliveredMsg(order);
    sendWhatsAppToCustomer(order, msg, 'receipt');
    toast.success('Risiti imetumwa kwa WhatsApp!');
  };

  // Get unique Sokoni customer phones
  const getUniqueCustomers = () => {
    const seen = new Map<string, string>();
    orders.forEach(o => {
      const phone = formatPhone(o.customer_phone);
      if (!seen.has(phone)) seen.set(phone, o.customer_phone);
    });
    return Array.from(seen.entries());
  };

  const sendBatchWhatsApp = async () => {
    if (!batchMsg.trim() || !user) return;
    const customers = getUniqueCustomers();
    if (customers.length === 0) { toast.error('Hakuna wateja wa Sokoni'); return; }

    setSendingBatch(true);
    setBatchProgress({ sent: 0, total: customers.length });

    let sentCount = 0;
    for (const [phone, rawPhone] of customers) {
      try {
        const { error } = await supabase.functions.invoke('send-whatsapp', {
          body: { phoneNumber: phone, message: batchMsg, messageType: 'general' }
        });

        await supabase.from('whatsapp_messages').insert({
          owner_id: user.id,
          customer_name: `Sokoni - ${rawPhone}`,
          phone_number: phone,
          message: batchMsg,
          message_type: 'general',
          status: error ? 'sent_wa_link' : 'sent',
        });

        if (error) {
          window.open(`https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(batchMsg)}`, '_blank');
        }
      } catch {
        // fallback
      }
      sentCount++;
      setBatchProgress({ sent: sentCount, total: customers.length });
    }

    toast.success(`Ujumbe umetumwa kwa wateja ${sentCount}!`);
    setSendingBatch(false);
    setBatchOpen(false);
    setBatchMsg('');
  };

  // Orders sorted: new first, then by date
  const sortedOrders = [...orders].sort((a, b) => {
    if (a.order_status === 'new' && b.order_status !== 'new') return -1;
    if (a.order_status !== 'new' && b.order_status === 'new') return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `Dak ${diffMins} zilizopita`;
    if (diffMins < 1440) return `Saa ${Math.floor(diffMins / 60)} zilizopita`;
    return date.toLocaleDateString('sw-TZ');
  };

  if (dataLoading || loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border rounded-3xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-primary" />
              Oda za Sokoni
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-2xl text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                onClick={() => {
                  const customers = getUniqueCustomers();
                  if (customers.length === 0) { toast.error('Hakuna wateja wa Sokoni bado'); return; }
                  setBatchMsg(`🎉 HABARI NJEMA!\n\nTuna bidhaa mpya na matoleo mazuri kwenye duka letu!\n\nTembelea Sokoni yetu leo na upate bidhaa bora kwa bei nzuri.\n\nKaribuni sana! 🛍️`);
                  setBatchOpen(true);
                }}
              >
                <Megaphone className="h-4 w-4 mr-1" />
                Tuma kwa Wote ({getUniqueCustomers().length})
              </Button>
              <Button variant="outline" size="sm" onClick={fetchOrders} className="rounded-2xl">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
              {sortedOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Hakuna oda</p>
                </div>
              ) : (
                sortedOrders.map(order => (
                  <Card key={order.id} className={`cursor-pointer hover:shadow-md transition-shadow border-border rounded-2xl ${order.order_status === 'new' ? 'ring-2 ring-primary/30' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="font-semibold text-sm">#{order.id.slice(0, 8).toUpperCase()}</span>
                            {order.order_status === 'new' && <Badge className="bg-primary text-primary-foreground text-[10px]">MPYA</Badge>}
                            <Badge className={`text-[10px] ${getStatusColor(order.order_status)}`}>{getStatusLabel(order.order_status)}</Badge>
                            <Badge className={`text-[10px] ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {order.payment_status === 'paid' ? 'Imelipwa' : 'Inasubiri'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />{order.customer_phone}
                          </p>
                          {order.tracking_code && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Tracking: <span className="font-mono font-semibold">{order.tracking_code}</span>
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="h-3 w-3 flex-shrink-0" /><span className="truncate">{order.delivery_address}</span>
                          </p>
                          {order.delivery_person_name && (
                            <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
                              <User className="h-3 w-3" />
                              {order.delivery_person_name} • {order.delivery_person_phone}
                            </p>
                          )}
                          <div className="mt-1.5">
                            <p className="text-sm">
                              {order.items.length} bidhaa • <span className="font-semibold text-primary">TSh {order.total_amount.toLocaleString()}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />{formatTime(order.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)} className="rounded-2xl h-8 w-8 p-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="rounded-2xl text-green-600 hover:text-green-700 h-8 w-8 p-0"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setSelectedOrder(order); 
                              openCustomWhatsApp(order); 
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
          </div>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder && !whatsappOpen} onOpenChange={() => { setSelectedOrder(null); setDeliveryName(''); setDeliveryPhone(''); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
          <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4 text-center border-b border-border">
            <h2 className="font-bold">Oda #{selectedOrder?.id.slice(0, 8).toUpperCase()}</h2>
            {selectedOrder && (
              <Badge className={`mt-2 ${getStatusColor(selectedOrder.order_status)}`}>
                {getStatusLabel(selectedOrder.order_status)}
              </Badge>
            )}
          </div>
          
          {selectedOrder && (
            <div className="p-4 space-y-4">
              {/* Customer */}
              <Card className="rounded-2xl">
                <CardContent className="p-3 space-y-1">
                  <p className="text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <a href={`tel:${selectedOrder.customer_phone}`} className="text-primary font-medium">{selectedOrder.customer_phone}</a>
                  </p>
                  <p className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />{selectedOrder.delivery_address}
                  </p>
                  {selectedOrder.tracking_code && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-mono font-semibold">{selectedOrder.tracking_code}</p>
                      <Button size="sm" variant="outline" className="rounded-2xl text-xs" onClick={() => { navigator.clipboard.writeText(selectedOrder.tracking_code || ''); toast.success('Imenakiliwa'); }}>Nakili</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Delivery Person Info */}
              {selectedOrder.delivery_person_name && (
                <Card className="rounded-2xl border-primary/30">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">Mpelekaji</p>
                    <p className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      {selectedOrder.delivery_person_name}
                    </p>
                    <p className="text-sm flex items-center gap-2 mt-1">
                      <Phone className="h-3 w-3" />
                      <a href={`tel:${selectedOrder.delivery_person_phone}`} className="text-primary">{selectedOrder.delivery_person_phone}</a>
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Items */}
              <div>
                <p className="font-medium text-sm mb-2">Bidhaa</p>
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm p-2 bg-muted/50 rounded-xl mb-1">
                    <span>{item.product_name} x{item.quantity}</span>
                    <span className="font-medium">TSh {(item.unit_price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-2 border-t border-border mt-2">
                  <span>Jumla</span>
                  <span className="text-primary">TSh {selectedOrder.total_amount.toLocaleString()}</span>
                </div>
              </div>

              {/* WhatsApp Quick Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 rounded-2xl text-green-600 border-green-300 hover:bg-green-50"
                  onClick={() => openCustomWhatsApp(selectedOrder)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
                {selectedOrder.order_status === 'delivered' && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 rounded-2xl text-blue-600 border-blue-300 hover:bg-blue-50"
                    onClick={() => sendReceiptWhatsApp(selectedOrder)}
                  >
                    <Receipt className="h-4 w-4 mr-1" />
                    Risiti WhatsApp
                  </Button>
                )}
              </div>

              {/* Actions - Simplified: new → confirmed → delivering → delivered */}
              <div className="space-y-2 pt-2">
                {selectedOrder.order_status === 'new' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="rounded-2xl text-destructive border-destructive" onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}>
                      <XCircle className="h-4 w-4 mr-2" />Ghairi
                    </Button>
                    <Button className="rounded-2xl" onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}>
                      <CheckCircle className="h-4 w-4 mr-2" />Kubali
                    </Button>
                  </div>
                )}
                
                {selectedOrder.order_status === 'confirmed' && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Maelezo ya Mpelekaji</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Jina</Label>
                        <Input placeholder="Jina la mpelekaji" value={deliveryName} onChange={(e) => setDeliveryName(e.target.value)} className="rounded-2xl" />
                      </div>
                      <div>
                        <Label className="text-xs">Simu</Label>
                        <Input placeholder="07xx xxx xxx" value={deliveryPhone} onChange={(e) => setDeliveryPhone(e.target.value)} className="rounded-2xl" />
                      </div>
                    </div>
                    <Button 
                      className="w-full rounded-2xl" 
                      disabled={!deliveryName || !deliveryPhone}
                      onClick={() => updateOrderStatus(selectedOrder.id, 'delivering', {
                        delivery_person_name: deliveryName,
                        delivery_person_phone: deliveryPhone
                      })}
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Peleka Sasa
                    </Button>
                  </div>
                )}
                
                {selectedOrder.order_status === 'delivering' && (
                  <Button className="w-full rounded-2xl" onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Imefika kwa Mteja
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom WhatsApp Message Dialog */}
      <Dialog open={whatsappOpen} onOpenChange={setWhatsappOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <h3 className="font-bold">Tuma WhatsApp kwa Mteja</h3>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Simu</Label>
              <p className="font-medium">{selectedOrder?.customer_phone}</p>
            </div>
            <div>
              <Label className="text-xs">Ujumbe</Label>
              <Textarea
                value={whatsappMsg}
                onChange={(e) => setWhatsappMsg(e.target.value)}
                rows={6}
                placeholder="Andika ujumbe..."
              />
            </div>
            <Button 
              onClick={sendCustomWhatsApp} 
              disabled={!whatsappMsg.trim() || sendingWa} 
              className="w-full rounded-2xl bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendingWa ? 'Inatuma...' : 'Tuma WhatsApp'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch WhatsApp Dialog */}
      <Dialog open={batchOpen} onOpenChange={(open) => { if (!sendingBatch) setBatchOpen(open); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-green-600" />
              <h3 className="font-bold">Tuma WhatsApp kwa Wateja Wote</h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Wateja {getUniqueCustomers().length} watapata ujumbe huu</span>
            </div>
            <div>
              <Label className="text-xs">Ujumbe wa Tangazo</Label>
              <Textarea
                value={batchMsg}
                onChange={(e) => setBatchMsg(e.target.value)}
                rows={8}
                placeholder="Andika ujumbe wa tangazo kwa wateja wako wote..."
                disabled={sendingBatch}
              />
            </div>
            {sendingBatch && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Inatuma...</span>
                  <span>{batchProgress.sent}/{batchProgress.total}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all" 
                    style={{ width: `${batchProgress.total > 0 ? (batchProgress.sent / batchProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
            <Button 
              onClick={sendBatchWhatsApp} 
              disabled={!batchMsg.trim() || sendingBatch} 
              className="w-full rounded-2xl bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendingBatch ? `Inatuma ${batchProgress.sent}/${batchProgress.total}...` : `Tuma kwa Wateja ${getUniqueCustomers().length}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SokoniOrderManagement;

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle,
  Clock,
  Phone,
  MapPin,
  Eye,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDataAccess } from '@/hooks/useDataAccess';

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
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export const SokoniOrderManagement = () => {
  const { dataOwnerId, loading: dataLoading } = useDataAccess();
  const [orders, setOrders] = useState<SokoniOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SokoniOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('new');

  useEffect(() => {
    if (dataOwnerId) {
      fetchOrders();
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

      // Parse items JSON properly
      const parsedOrders = (data || []).map(order => ({
        ...order,
        items: Array.isArray(order.items) ? order.items : JSON.parse(order.items as string || '[]')
      }));

      setOrders(parsedOrders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Imeshindwa kupakia oda');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-primary/10 text-primary',
      confirmed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
      preparing: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
      ready: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      cancelled: 'bg-destructive/10 text-destructive'
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      new: 'Mpya',
      confirmed: 'Imethibitishwa',
      preparing: 'Inaandaliwa',
      ready: 'Tayari',
      delivered: 'Imepelekwa',
      cancelled: 'Imeghairiwa'
    };
    return labels[status] || status;
  };

  const getPaymentStatusBadge = (status: string) => {
    if (status === 'paid') {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Imelipwa</Badge>;
    } else if (status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Inasubiri</Badge>;
    }
    return <Badge className="bg-destructive/10 text-destructive">Imeshindikana</Badge>;
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('sokoni_orders')
        .update({ order_status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(order => 
        order.id === orderId 
          ? { ...order, order_status: newStatus, updated_at: new Date().toISOString() }
          : order
      ));
      
      toast.success(`Oda imebadilishwa kuwa "${getStatusLabel(newStatus)}"`);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Imeshindwa kubadilisha hali ya oda');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'new') return order.order_status === 'new';
    if (activeTab === 'active') return ['confirmed', 'preparing', 'ready'].includes(order.order_status);
    if (activeTab === 'completed') return ['delivered', 'cancelled'].includes(order.order_status);
    return true;
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `Dakika ${diffMins} zilizopita`;
    if (diffMins < 1440) return `Saa ${Math.floor(diffMins / 60)} zilizopita`;
    return date.toLocaleDateString('sw-TZ');
  };

  if (dataLoading || loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-primary" />
              Oda za Sokoni
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchOrders}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="new" className="relative text-xs">
                Mpya
                {orders.filter(o => o.order_status === 'new').length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive text-destructive-foreground">
                    {orders.filter(o => o.order_status === 'new').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs">Zinaendelea</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs">Zimekamilika</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Hakuna oda</p>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                            <Badge className={getStatusColor(order.order_status)}>
                              {getStatusLabel(order.order_status)}
                            </Badge>
                            {getPaymentStatusBadge(order.payment_status)}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {order.customer_phone}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {order.delivery_address}
                          </p>
                          <div className="mt-2">
                            <p className="text-sm text-foreground">
                              {order.items.length} bidhaa • 
                              <span className="font-semibold text-primary ml-1">
                                TSh {order.total_amount.toLocaleString()}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(order.created_at)}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Maelezo ya Oda #{selectedOrder?.id.slice(0, 8).toUpperCase()}</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="text-sm flex items-center gap-2 text-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${selectedOrder.customer_phone}`} className="text-primary">
                    {selectedOrder.customer_phone}
                  </a>
                </p>
                <p className="text-sm flex items-center gap-2 text-foreground">
                  <MapPin className="h-4 w-4" />
                  {selectedOrder.delivery_address}
                </p>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-medium mb-2 text-foreground">Bidhaa</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-muted/50 rounded">
                      <span className="text-foreground">{item.product_name} x{item.quantity}</span>
                      <span className="font-medium text-foreground">TSh {(item.unit_price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold pt-2 border-t border-border">
                    <span className="text-foreground">Jumla</span>
                    <span className="text-primary">TSh {selectedOrder.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Njia ya Malipo</p>
                  <p className="font-medium capitalize text-foreground">{selectedOrder.payment_method || 'N/A'}</p>
                </div>
                {getPaymentStatusBadge(selectedOrder.payment_status)}
              </div>

              {selectedOrder.transaction_id && (
                <div className="text-xs text-muted-foreground">
                  Transaction ID: {selectedOrder.transaction_id}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                {selectedOrder.order_status === 'new' && (
                  <>
                    <Button 
                      variant="outline" 
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Ghairi
                    </Button>
                    <Button 
                      onClick={() => updateOrderStatus(selectedOrder.id, 'confirmed')}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Kubali
                    </Button>
                  </>
                )}
                
                {selectedOrder.order_status === 'confirmed' && (
                  <Button 
                    className="col-span-2"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                  >
                    Anza Kuandaa
                  </Button>
                )}
                
                {selectedOrder.order_status === 'preparing' && (
                  <Button 
                    className="col-span-2"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'ready')}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Tayari Kupeleka
                  </Button>
                )}
                
                {selectedOrder.order_status === 'ready' && (
                  <Button 
                    className="col-span-2"
                    onClick={() => updateOrderStatus(selectedOrder.id, 'delivered')}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Imepelekwa
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SokoniOrderManagement;
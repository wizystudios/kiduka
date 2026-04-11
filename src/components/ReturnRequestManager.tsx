import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, CheckCircle, XCircle, Package, Phone, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
import { toast } from 'sonner';

interface ReturnRequest {
  id: string;
  order_id: string | null;
  customer_phone: string;
  reason: string;
  status: string;
  refund_amount: number | null;
  refund_method: string | null;
  seller_notes: string | null;
  items: any[];
  created_at: string;
}

export const ReturnRequestManager = () => {
  const { user } = useAuth();
  const { dataOwnerId } = useDataAccess();
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sellerNotes, setSellerNotes] = useState<Record<string, string>>({});
  const [refundMethods, setRefundMethods] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (dataOwnerId) fetchRequests();
  }, [dataOwnerId]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('return_requests')
      .select('*')
      .eq('seller_id', dataOwnerId!)
      .order('created_at', { ascending: false });
    
    if (!error && data) setRequests(data as any);
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setProcessing(id);
    try {
      const update: any = { status: newStatus };
      if (sellerNotes[id]) update.seller_notes = sellerNotes[id];
      if (refundMethods[id]) update.refund_method = refundMethods[id];
      
      const { error } = await supabase.from('return_requests').update(update).eq('id', id);
      if (error) throw error;

      // If approved → restore stock
      if (newStatus === 'approved') {
        const req = requests.find(r => r.id === id);
        if (req?.items && Array.isArray(req.items)) {
          for (const item of req.items) {
            const productName = (item as any).product_name;
            const qty = (item as any).quantity || 1;
            
            // Find product by name and owner
            const { data: product } = await supabase
              .from('products')
              .select('id, stock_quantity')
              .eq('owner_id', dataOwnerId!)
              .eq('name', productName)
              .maybeSingle();
            
            if (product) {
              await supabase
                .from('products')
                .update({ stock_quantity: product.stock_quantity + qty })
                .eq('id', product.id);

              // Record inventory movement
              await supabase.from('inventory_movements').insert({
                owner_id: dataOwnerId!,
                product_id: product.id,
                movement_type: 'return',
                quantity_change: qty,
                quantity_before: product.stock_quantity,
                quantity_after: product.stock_quantity + qty,
                reason: `Bidhaa imerudishwa: ${req.reason}`,
                reference_type: 'return_request',
                reference_id: id,
              });
            }
          }
        }
      }

      toast.success(`Hali imebadilishwa kuwa ${getStatusLabel(newStatus)}`);
      fetchRequests();
    } catch (err) {
      console.error('Error updating return:', err);
      toast.error('Imeshindwa kubadilisha hali');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: 'Inasubiri',
      approved: 'Imekubaliwa',
      rejected: 'Imekataliwa',
      completed: 'Imekamilika',
    };
    return map[status] || status;
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      completed: 'outline',
    };
    return map[status] || 'secondary';
  };

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Returns ({requests.length})</span>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-32 h-8 text-xs rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Zote</SelectItem>
            <SelectItem value="pending">Inasubiri</SelectItem>
            <SelectItem value="approved">Imekubaliwa</SelectItem>
            <SelectItem value="rejected">Imekataliwa</SelectItem>
            <SelectItem value="completed">Imekamilika</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-8">Inapakia...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <RotateCcw className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Hakuna maombi ya kurudisha bidhaa</p>
        </div>
      ) : (
        filtered.map((req) => {
          const isExpanded = expandedId === req.id;
          const items = Array.isArray(req.items) ? req.items : [];
          
          return (
            <Card key={req.id} className="rounded-2xl overflow-hidden">
              <CardContent className="p-3 space-y-2">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{req.customer_phone}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={getStatusVariant(req.status)} className="text-[10px]">
                      {getStatusLabel(req.status)}
                    </Badge>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(req.created_at).toLocaleDateString('sw-TZ')}
                  </span>
                  {req.refund_amount && req.refund_amount > 0 && (
                    <span className="font-medium text-foreground">TSh {req.refund_amount.toLocaleString()}</span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">📌 {req.reason}</p>

                {isExpanded && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    {/* Items */}
                    {items.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase">Bidhaa</p>
                        {items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs bg-muted/50 rounded-xl p-2">
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {item.product_name} ×{item.quantity}
                            </span>
                            <span className="font-medium">TSh {((item.unit_price || 0) * (item.quantity || 1)).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {req.seller_notes && (
                      <p className="text-xs bg-muted/50 rounded-xl p-2">💬 {req.seller_notes}</p>
                    )}

                    {/* Actions for pending */}
                    {req.status === 'pending' && (
                      <div className="space-y-2 pt-1">
                        <Input
                          placeholder="Maoni yako (hiari)..."
                          value={sellerNotes[req.id] || ''}
                          onChange={(e) => setSellerNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                          className="text-xs h-8 rounded-xl"
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1 text-xs rounded-full" 
                            onClick={() => updateStatus(req.id, 'approved')}
                            disabled={processing === req.id}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Kubali
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="flex-1 text-xs rounded-full" 
                            onClick={() => updateStatus(req.id, 'rejected')}
                            disabled={processing === req.id}
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Kataa
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Complete refund for approved */}
                    {req.status === 'approved' && (
                      <div className="space-y-2 pt-1">
                        <Select
                          value={refundMethods[req.id] || ''}
                          onValueChange={(v) => setRefundMethods(prev => ({ ...prev, [req.id]: v }))}
                        >
                          <SelectTrigger className="h-8 text-xs rounded-xl">
                            <SelectValue placeholder="Njia ya Refund..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Taslimu</SelectItem>
                            <SelectItem value="mobile_money">M-Pesa / Tigo Pesa</SelectItem>
                            <SelectItem value="store_credit">Credit ya Duka</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button 
                          size="sm" 
                          className="w-full text-xs rounded-full" 
                          onClick={() => updateStatus(req.id, 'completed')}
                          disabled={processing === req.id || !refundMethods[req.id]}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Kamilisha Refund
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

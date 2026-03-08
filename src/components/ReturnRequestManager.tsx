import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { RotateCcw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ReturnRequest {
  id: string;
  order_id: string;
  customer_phone: string;
  reason: string;
  status: string;
  refund_amount: number;
  seller_notes: string | null;
  items: any[];
  created_at: string;
}

export const ReturnRequestManager = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('return_requests')
      .select('*')
      .eq('seller_id', user!.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) setRequests(data as any);
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: string, notes?: string) => {
    const update: any = { status: newStatus };
    if (notes) update.seller_notes = notes;
    
    await supabase.from('return_requests').update(update).eq('id', id);
    toast.success(`Hali imebadilishwa kuwa ${getStatusLabel(newStatus)}`);
    fetchRequests();
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

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
    };
    return map[status] || 'bg-muted text-muted-foreground';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-primary" />
          Returns & Refunds ({requests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Inapakia...</p>
        ) : requests.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Hakuna maombi ya kurudisha bidhaa</p>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">{req.customer_phone}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(req.created_at).toLocaleDateString('sw-TZ')}
                  </p>
                </div>
                <Badge className={`text-[10px] ${getStatusColor(req.status)}`}>
                  {getStatusLabel(req.status)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Sababu: {req.reason}</p>
              {req.refund_amount > 0 && (
                <p className="text-xs font-medium">Refund: TSh {req.refund_amount.toLocaleString()}</p>
              )}
              {req.status === 'pending' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => updateStatus(req.id, 'approved')}>
                    <CheckCircle className="h-3 w-3 mr-1" /> Kubali
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 text-xs text-destructive" onClick={() => updateStatus(req.id, 'rejected')}>
                    <XCircle className="h-3 w-3 mr-1" /> Kataa
                  </Button>
                </div>
              )}
              {req.status === 'approved' && (
                <Button size="sm" className="w-full text-xs" onClick={() => updateStatus(req.id, 'completed')}>
                  <CheckCircle className="h-3 w-3 mr-1" /> Kamilisha Refund
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

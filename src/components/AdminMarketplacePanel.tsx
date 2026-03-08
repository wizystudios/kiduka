import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Tag, RotateCcw, Star, ShoppingCart, Trash2, Pencil, 
  Eye, Search, ToggleLeft, ToggleRight, MessageSquare, Reply 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminCoupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  used_count: number;
  max_uses: number | null;
  expires_at: string | null;
  owner_id: string;
  owner_name?: string;
  business_name?: string;
}

interface AdminReturn {
  id: string;
  order_id: string | null;
  customer_phone: string;
  reason: string;
  status: string;
  refund_amount: number;
  seller_id: string;
  seller_notes: string | null;
  created_at: string;
  owner_name?: string;
  business_name?: string;
}

interface AdminReview {
  id: string;
  product_id: string;
  customer_phone: string;
  customer_name: string | null;
  rating: number;
  review_text: string | null;
  created_at: string;
  product_name?: string;
  owner_name?: string;
  reply?: { id: string; reply_text: string; created_at: string } | null;
}

interface AdminCart {
  id: string;
  customer_phone: string;
  customer_name: string | null;
  total_amount: number;
  reminder_sent: boolean;
  recovered: boolean;
  seller_id: string;
  created_at: string;
  owner_name?: string;
  business_name?: string;
}

export const AdminMarketplacePanel = () => {
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [carts, setCarts] = useState<AdminCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editReturn, setEditReturn] = useState<AdminReturn | null>(null);
  const [replyDialog, setReplyDialog] = useState<{ reviewId: string; productName: string; existingReply?: string } | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchCoupons(), fetchReturns(), fetchReviews(), fetchCarts()]);
    setLoading(false);
  };

  const enrichWithOwner = async (data: any[], ownerField: string) => {
    const ids = [...new Set(data.map(d => d[ownerField]))];
    if (ids.length === 0) return data;
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, business_name').in('id', ids);
    return data.map(d => ({
      ...d,
      owner_name: profiles?.find(p => p.id === d[ownerField])?.full_name || '-',
      business_name: profiles?.find(p => p.id === d[ownerField])?.business_name || '-',
    }));
  };

  const fetchCoupons = async () => {
    const { data } = await supabase.from('coupon_codes').select('*').order('created_at', { ascending: false });
    setCoupons(await enrichWithOwner(data || [], 'owner_id'));
  };

  const fetchReturns = async () => {
    const { data } = await supabase.from('return_requests').select('*').order('created_at', { ascending: false });
    setReturns(await enrichWithOwner(data || [], 'seller_id'));
  };

  const fetchReviews = async () => {
    const { data: reviewsData } = await supabase.from('product_reviews').select('*').order('created_at', { ascending: false }).limit(100);
    if (!reviewsData) return;

    const productIds = [...new Set(reviewsData.map(r => r.product_id))];
    const [{ data: products }, { data: replies }] = await Promise.all([
      supabase.from('products').select('id, name, owner_id').in('id', productIds),
      supabase.from('review_replies').select('*').in('review_id', reviewsData.map(r => r.id)),
    ]);

    const ownerIds = [...new Set((products || []).map(p => p.owner_id))];
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', ownerIds);

    setReviews(reviewsData.map(r => {
      const product = products?.find(p => p.id === r.product_id);
      const reply = (replies as any[])?.find((rp: any) => rp.review_id === r.id);
      return {
        ...r,
        product_name: product?.name || '-',
        owner_name: profiles?.find(p => p.id === product?.owner_id)?.full_name || '-',
        reply: reply ? { id: reply.id, reply_text: reply.reply_text, created_at: reply.created_at } : null,
      };
    }));
  };

  const fetchCarts = async () => {
    const { data } = await supabase.from('abandoned_carts').select('*').order('created_at', { ascending: false }).limit(100);
    setCarts(await enrichWithOwner(data || [], 'seller_id'));
  };

  const toggleCoupon = async (id: string, active: boolean) => {
    await supabase.from('coupon_codes').update({ is_active: !active }).eq('id', id);
    toast.success(active ? 'Coupon imezimwa' : 'Coupon imewashwa');
    fetchCoupons();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from('coupon_codes').delete().eq('id', id);
    toast.success('Coupon imefutwa');
    fetchCoupons();
  };

  const updateReturnStatus = async (id: string, status: string, notes?: string) => {
    const update: any = { status };
    if (notes) update.seller_notes = notes;
    await supabase.from('return_requests').update(update).eq('id', id);
    toast.success('Return status imebadilishwa');
    setEditReturn(null);
    fetchReturns();
  };

  const deleteReturn = async (id: string) => {
    await supabase.from('return_requests').delete().eq('id', id);
    toast.success('Return request imefutwa');
    fetchReturns();
  };

  const deleteReview = async (id: string) => {
    await supabase.from('product_reviews').delete().eq('id', id);
    toast.success('Review imefutwa');
    fetchReviews();
  };

  const deleteCart = async (id: string) => {
    await supabase.from('abandoned_carts').delete().eq('id', id);
    toast.success('Cart imefutwa');
    fetchCarts();
  };

  const markCartRecovered = async (id: string) => {
    await supabase.from('abandoned_carts').update({ recovered: true }).eq('id', id);
    toast.success('Cart imewekwa kama recovered');
    fetchCarts();
  };

  const submitAdminReply = async () => {
    if (!replyDialog || !replyText.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (replyDialog.existingReply) {
      // Update existing - find by review_id
      await supabase.from('review_replies').update({ reply_text: replyText }).eq('review_id', replyDialog.reviewId);
    } else {
      await supabase.from('review_replies').insert({
        review_id: replyDialog.reviewId,
        seller_id: user.id,
        reply_text: replyText,
      });
    }
    toast.success('Jibu limehifadhiwa');
    setReplyDialog(null);
    setReplyText('');
    fetchReviews();
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
    };
    const labels: Record<string, string> = {
      pending: 'Inasubiri', approved: 'Imekubaliwa', rejected: 'Imekataliwa', completed: 'Imekamilika',
    };
    return <Badge className={`text-[10px] ${colors[status] || 'bg-muted'}`}>{labels[status] || status}</Badge>;
  };

  if (loading) return <p className="text-center py-8 text-muted-foreground text-sm">Inapakia...</p>;

  return (
    <div className="space-y-4">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Tafuta..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      <Tabs defaultValue="coupons">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="coupons" className="text-xs gap-1"><Tag className="h-3 w-3" /> Coupons ({coupons.length})</TabsTrigger>
          <TabsTrigger value="returns" className="text-xs gap-1"><RotateCcw className="h-3 w-3" /> Returns ({returns.length})</TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs gap-1"><Star className="h-3 w-3" /> Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="carts" className="text-xs gap-1"><ShoppingCart className="h-3 w-3" /> Carts ({carts.length})</TabsTrigger>
        </TabsList>

        {/* Coupons */}
        <TabsContent value="coupons" className="space-y-2">
          {coupons.filter(c => c.code.toLowerCase().includes(searchQuery.toLowerCase())).map(c => (
            <Card key={c.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono font-bold text-sm">{c.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : `TSh ${c.discount_value.toLocaleString()}`} punguzo
                    </p>
                    <p className="text-xs text-muted-foreground">{c.business_name} • Imetumika: {c.used_count}/{c.max_uses || '∞'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleCoupon(c.id, c.is_active)}>
                      {c.is_active ? <ToggleRight className="h-4 w-4 text-green-600" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCoupon(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Returns */}
        <TabsContent value="returns" className="space-y-2">
          {returns.filter(r => r.customer_phone.includes(searchQuery)).map(r => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium">{r.customer_phone}</p>
                    <p className="text-xs text-muted-foreground">{r.business_name} • {new Date(r.created_at).toLocaleDateString('sw-TZ')}</p>
                  </div>
                  {getStatusBadge(r.status)}
                </div>
                <p className="text-xs text-muted-foreground mb-2">Sababu: {r.reason}</p>
                {r.refund_amount > 0 && <p className="text-xs font-medium mb-2">Refund: TSh {r.refund_amount.toLocaleString()}</p>}
                <div className="flex gap-1">
                  <Select onValueChange={(v) => updateReturnStatus(r.id, v)}>
                    <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Badilisha hali" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Inasubiri</SelectItem>
                      <SelectItem value="approved">Kubali</SelectItem>
                      <SelectItem value="rejected">Kataa</SelectItem>
                      <SelectItem value="completed">Kamilisha</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteReturn(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews" className="space-y-2">
          {reviews.filter(r => (r.product_name || '').toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium">{r.product_name}</p>
                    <p className="text-xs text-muted-foreground">{r.customer_name || r.customer_phone} • {r.owner_name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                {r.review_text && <p className="text-xs text-muted-foreground mb-2">{r.review_text}</p>}
                {r.reply && (
                  <div className="bg-muted/50 p-2 rounded text-xs mb-2">
                    <p className="font-medium flex items-center gap-1"><Reply className="h-3 w-3" /> Jibu la duka:</p>
                    <p className="text-muted-foreground">{r.reply.reply_text}</p>
                  </div>
                )}
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => {
                    setReplyDialog({ reviewId: r.id, productName: r.product_name || '', existingReply: r.reply?.reply_text });
                    setReplyText(r.reply?.reply_text || '');
                  }}>
                    <MessageSquare className="h-3 w-3 mr-1" /> {r.reply ? 'Hariri Jibu' : 'Jibu'}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteReview(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Abandoned Carts */}
        <TabsContent value="carts" className="space-y-2">
          {carts.filter(c => c.customer_phone.includes(searchQuery)).map(c => (
            <Card key={c.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-sm font-medium">{c.customer_name || c.customer_phone}</p>
                    <p className="text-xs text-muted-foreground">{c.business_name} • TSh {c.total_amount?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('sw-TZ')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {c.recovered ? (
                      <Badge className="bg-green-100 text-green-800 text-[10px]">Imerejeshwa</Badge>
                    ) : c.reminder_sent ? (
                      <Badge className="bg-blue-100 text-blue-800 text-[10px]">Reminder Imetumwa</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 text-[10px]">Inasubiri</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 mt-2">
                  {!c.recovered && (
                    <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => markCartRecovered(c.id)}>
                      Weka Recovered
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCart(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Reply Dialog */}
      <Dialog open={!!replyDialog} onOpenChange={() => { setReplyDialog(null); setReplyText(''); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Jibu Review - {replyDialog?.productName}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Andika jibu lako kwa mteja..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog(null)}>Ghairi</Button>
            <Button onClick={submitAdminReply} disabled={!replyText.trim()}>Hifadhi Jibu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Tag, Copy, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CouponCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export const CouponCodeManager = () => {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState<CouponCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (user) fetchCoupons();
  }, [user]);

  const fetchCoupons = async () => {
    const { data, error } = await supabase
      .from('coupon_codes')
      .select('*')
      .eq('owner_id', user!.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) setCoupons(data as any);
    setLoading(false);
  };

  const createCoupon = async () => {
    if (!newCode || !discountValue) {
      toast.error('Jaza code na thamani ya punguzo');
      return;
    }

    const { error } = await supabase.from('coupon_codes').insert({
      owner_id: user!.id,
      code: newCode.toUpperCase().trim(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      min_order_amount: minOrder ? parseFloat(minOrder) : 0,
      max_uses: maxUses ? parseInt(maxUses) : null,
      expires_at: expiresAt || null,
    });

    if (error) {
      if (error.code === '23505') toast.error('Code hii tayari ipo!');
      else toast.error('Imeshindwa kuunda coupon');
      return;
    }

    toast.success('Coupon imeundwa!');
    setDialogOpen(false);
    setNewCode('');
    setDiscountValue('');
    setMinOrder('');
    setMaxUses('');
    setExpiresAt('');
    fetchCoupons();
  };

  const toggleCoupon = async (id: string, active: boolean) => {
    await supabase.from('coupon_codes').update({ is_active: !active }).eq('id', id);
    fetchCoupons();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from('coupon_codes').delete().eq('id', id);
    toast.success('Coupon imefutwa');
    fetchCoupons();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Code "${code}" imenakiliwa!`);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="h-4 w-4 text-primary" />
            Coupon Codes
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-3 w-3 mr-1" /> Unda Coupon
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unda Coupon Mpya</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Code (mfano: KARIBU10)</label>
                  <Input 
                    value={newCode} 
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="KARIBU10"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium">Aina</label>
                    <Select value={discountType} onValueChange={setDiscountType}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Asilimia (%)</SelectItem>
                        <SelectItem value="fixed">Kiasi (TSh)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Thamani</label>
                    <Input 
                      type="number" value={discountValue} 
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === 'percentage' ? '10' : '5000'}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium">Oda ya chini (TSh)</label>
                    <Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="0" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Matumizi max</label>
                    <Input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Bila limit" className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium">Inaisha lini</label>
                  <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1" />
                </div>
                <Button className="w-full" onClick={createCoupon}>Unda Coupon</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Inapakia...</p>
        ) : coupons.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Hakuna coupon codes. Unda moja!</p>
        ) : (
          coupons.map((coupon) => (
            <div key={coupon.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="font-mono font-bold text-sm text-primary">{coupon.code}</code>
                  <Badge variant={coupon.is_active ? 'default' : 'secondary'} className="text-[10px]">
                    {coupon.is_active ? 'Hai' : 'Imezimwa'}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `TSh ${coupon.discount_value.toLocaleString()}`} punguzo
                  {coupon.max_uses ? ` • ${coupon.used_count}/${coupon.max_uses} matumizi` : ` • ${coupon.used_count} matumizi`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyCode(coupon.code)}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleCoupon(coupon.id, coupon.is_active)}>
                  {coupon.is_active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCoupon(coupon.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, ShoppingCart, Tag, Star, TrendingUp, RotateCcw, Percent } from 'lucide-react';

interface AnalyticsData {
  totalOrders: number;
  completedOrders: number;
  totalCoupons: number;
  couponUsageCount: number;
  couponConversionRate: number;
  abandonedCarts: number;
  recoveredCarts: number;
  recoveryRate: number;
  totalReviews: number;
  averageRating: number;
  topProducts: { product_id: string; product_name: string; avg_rating: number; review_count: number }[];
  totalReturns: number;
  approvedReturns: number;
  totalRevenue: number;
}

export const SokoniAnalyticsDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch all data in parallel
      const [ordersRes, couponsRes, cartsRes, reviewsRes, returnsRes] = await Promise.all([
        supabase.from('sokoni_orders').select('id, order_status, total_amount, payment_status').eq('seller_id', user.id),
        supabase.from('coupon_codes').select('id, used_count, is_active').eq('owner_id', user.id),
        supabase.from('abandoned_carts').select('id, recovered').eq('seller_id', user.id),
        supabase.from('product_reviews').select('id, product_id, rating').in('product_id', 
          (await supabase.from('products').select('id').eq('owner_id', user.id)).data?.map(p => p.id) || []
        ),
        supabase.from('return_requests').select('id, status').eq('seller_id', user.id),
      ]);

      const orders = ordersRes.data || [];
      const coupons = couponsRes.data || [];
      const carts = cartsRes.data || [];
      const reviews = reviewsRes.data || [];
      const returns = returnsRes.data || [];

      const completedOrders = orders.filter(o => o.order_status === 'delivered').length;
      const couponUsageCount = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);
      const recoveredCarts = carts.filter(c => c.recovered).length;
      const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_amount), 0);

      // Calculate top reviewed products
      const productRatings: Record<string, { total: number; count: number }> = {};
      reviews.forEach(r => {
        if (!productRatings[r.product_id]) productRatings[r.product_id] = { total: 0, count: 0 };
        productRatings[r.product_id].total += r.rating;
        productRatings[r.product_id].count += 1;
      });

      // Get product names for top reviewed
      const productIds = Object.keys(productRatings);
      let topProducts: AnalyticsData['topProducts'] = [];
      if (productIds.length > 0) {
        const { data: productsData } = await supabase.from('products').select('id, name').in('id', productIds);
        topProducts = productIds
          .map(pid => ({
            product_id: pid,
            product_name: productsData?.find(p => p.id === pid)?.name || 'Bidhaa',
            avg_rating: productRatings[pid].total / productRatings[pid].count,
            review_count: productRatings[pid].count,
          }))
          .sort((a, b) => b.avg_rating - a.avg_rating || b.review_count - a.review_count)
          .slice(0, 5);
      }

      setData({
        totalOrders: orders.length,
        completedOrders,
        totalCoupons: coupons.length,
        couponUsageCount,
        couponConversionRate: coupons.length > 0 ? (coupons.filter(c => (c.used_count || 0) > 0).length / coupons.length) * 100 : 0,
        abandonedCarts: carts.length,
        recoveredCarts,
        recoveryRate: carts.length > 0 ? (recoveredCarts / carts.length) * 100 : 0,
        totalReviews: reviews.length,
        averageRating: reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0,
        topProducts,
        totalReturns: returns.length,
        approvedReturns: returns.filter(r => r.status === 'approved').length,
        totalRevenue,
      });
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-4"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const metrics = [
    { label: 'Mapato', value: `TSh ${data.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600' },
    { label: 'Oda Zote', value: data.totalOrders, icon: ShoppingCart, sub: `${data.completedOrders} zimekamilika` },
    { label: 'Coupon Conversion', value: `${data.couponConversionRate.toFixed(0)}%`, icon: Tag, sub: `${data.couponUsageCount} zimetumika` },
    { label: 'Cart Recovery', value: `${data.recoveryRate.toFixed(0)}%`, icon: BarChart3, sub: `${data.recoveredCarts}/${data.abandonedCarts} zimeokolewa` },
    { label: 'Reviews', value: data.totalReviews, icon: Star, sub: `⭐ ${data.averageRating.toFixed(1)} wastani` },
    { label: 'Returns', value: data.totalReturns, icon: RotateCcw, sub: `${data.approvedReturns} zimeidhinishwa` },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {metrics.map((m, i) => (
          <Card key={i}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <m.icon className={`h-3.5 w-3.5 ${m.color || 'text-muted-foreground'}`} />
                <span className="text-xs text-muted-foreground">{m.label}</span>
              </div>
              <p className={`text-lg font-bold ${m.color || ''}`}>{m.value}</p>
              {m.sub && <p className="text-xs text-muted-foreground">{m.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {data.topProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" /> Bidhaa Zinazopendwa Zaidi
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="space-y-2">
              {data.topProducts.map((p, i) => (
                <div key={p.product_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs w-5 h-5 flex items-center justify-center p-0">
                      {i + 1}
                    </Badge>
                    <span className="text-sm truncate max-w-[160px]">{p.product_name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>⭐ {p.avg_rating.toFixed(1)}</span>
                    <span>({p.review_count})</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

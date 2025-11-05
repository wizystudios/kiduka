import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Percent, Plus, Trash2, Edit2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Discount {
  id: string;
  name: string;
  discount_type: 'percentage' | 'fixed';
  value: number;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
}

export const DiscountsPage = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    start_date: '',
    end_date: '',
    active: true
  });

  useEffect(() => {
    fetchDiscounts();
  }, [user?.id]);

  const fetchDiscounts = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDiscounts((data || []) as Discount[]);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      toast.error('Imeshindwa kupakia punguzo');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const discountData = {
        owner_id: user.id,
        name: formData.name,
        discount_type: formData.discount_type,
        value: parseFloat(formData.value),
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        active: formData.active
      };

      if (editingDiscount) {
        const { error } = await supabase
          .from('discounts')
          .update(discountData)
          .eq('id', editingDiscount.id)
          .eq('owner_id', user.id);
        if (error) throw error;
        toast.success('Punguzo limesasishwa!');
      } else {
        const { error } = await supabase
          .from('discounts')
          .insert([discountData]);
        if (error) throw error;
        toast.success('Punguzo limeongezwa!');
      }

      setDialogOpen(false);
      resetForm();
      fetchDiscounts();
    } catch (error) {
      console.error('Error saving discount:', error);
      toast.error('Imeshindwa kuhifadhi punguzo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta punguzo hili?')) return;

    try {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', id)
        .eq('owner_id', user!.id);

      if (error) throw error;
      toast.success('Punguzo limefutwa!');
      fetchDiscounts();
    } catch (error) {
      console.error('Error deleting discount:', error);
      toast.error('Imeshindwa kufuta punguzo');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      discount_type: 'percentage',
      value: '',
      start_date: '',
      end_date: '',
      active: true
    });
    setEditingDiscount(null);
  };

  const openEditDialog = (discount: Discount) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      discount_type: discount.discount_type,
      value: discount.value.toString(),
      start_date: discount.start_date || '',
      end_date: discount.end_date || '',
      active: discount.active
    });
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Punguzo za Bei</h1>
          <p className="text-sm text-muted-foreground">Dhibiti punguzo za bidhaa zako</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ongeza Punguzo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDiscount ? 'Hariri Punguzo' : 'Ongeza Punguzo Jipya'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Jina la Punguzo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="discount_type">Aina ya Punguzo</Label>
                <Select
                  value={formData.discount_type}
                  onValueChange={(value: 'percentage' | 'fixed') => 
                    setFormData({ ...formData, discount_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Asilimia (%)</SelectItem>
                    <SelectItem value="fixed">Kiasi (TZS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="value">
                  Thamani {formData.discount_type === 'percentage' ? '(%)' : '(TZS)'}
                </Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Tarehe ya Kuanza</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">Tarehe ya Kuisha</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Ghairi
                </Button>
                <Button type="submit">
                  {editingDiscount ? 'Sasisha' : 'Ongeza'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {discounts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Percent className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Bado hujaweka punguzo lolote</p>
            </CardContent>
          </Card>
        ) : (
          discounts.map((discount) => (
            <Card key={discount.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-3">
                  <Percent className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{discount.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {discount.discount_type === 'percentage'
                        ? `${discount.value}% punguzo`
                        : `TZS ${discount.value.toLocaleString()} punguzo`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(discount)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(discount.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant={discount.active ? "default" : "secondary"}>
                    {discount.active ? 'Inatumika' : 'Haitumiki'}
                  </Badge>
                  {discount.start_date && (
                    <span className="text-muted-foreground">
                      Kuanzia: {format(new Date(discount.start_date), 'dd/MM/yyyy')}
                    </span>
                  )}
                  {discount.end_date && (
                    <span className="text-muted-foreground">
                      Hadi: {format(new Date(discount.end_date), 'dd/MM/yyyy')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

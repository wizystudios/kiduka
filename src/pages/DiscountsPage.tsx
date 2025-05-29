import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Percent, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Discount {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
  created_at: string;
}

export const DiscountsPage = () => {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [discountData, setDiscountData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type assertion to fix the type mismatch
      const typedDiscounts = (data || []).map(discount => ({
        ...discount,
        type: discount.type as 'percentage' | 'fixed'
      }));
      
      setDiscounts(typedDiscounts);
    } catch (error) {
      console.error('Error fetching discounts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load discounts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiscount = async () => {
    if (!discountData.code.trim() || discountData.value <= 0) {
      toast({
        title: 'Error',
        description: 'Code and value are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (editingDiscount) {
        const { error } = await supabase
          .from('discounts')
          .update({
            code: discountData.code.toUpperCase(),
            type: discountData.type,
            value: discountData.value,
            active: discountData.active
          })
          .eq('id', editingDiscount.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Discount updated successfully' });
      } else {
        const { error } = await supabase
          .from('discounts')
          .insert({
            code: discountData.code.toUpperCase(),
            type: discountData.type,
            value: discountData.value,
            active: discountData.active
          });

        if (error) throw error;
        toast({ title: 'Success', description: 'Discount created successfully' });
      }

      setDiscountData({ code: '', type: 'percentage', value: 0, active: true });
      setEditingDiscount(null);
      setDialogOpen(false);
      fetchDiscounts();
    } catch (error: any) {
      console.error('Error saving discount:', error);
      if (error.code === '23505') {
        toast({
          title: 'Error',
          description: 'Discount code already exists',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save discount',
          variant: 'destructive'
        });
      }
    }
  };

  const handleEditDiscount = (discount: Discount) => {
    setDiscountData({
      code: discount.code,
      type: discount.type,
      value: discount.value,
      active: discount.active
    });
    setEditingDiscount(discount);
    setDialogOpen(true);
  };

  const handleDeleteDiscount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;

    try {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setDiscounts(discounts.filter(d => d.id !== id));
      toast({ title: 'Success', description: 'Discount deleted successfully' });
    } catch (error) {
      console.error('Error deleting discount:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete discount',
        variant: 'destructive'
      });
    }
  };

  const toggleDiscountStatus = async (discount: Discount) => {
    try {
      const { error } = await supabase
        .from('discounts')
        .update({ active: !discount.active })
        .eq('id', discount.id);

      if (error) throw error;
      
      setDiscounts(discounts.map(d => 
        d.id === discount.id ? { ...d, active: !d.active } : d
      ));
      
      toast({ 
        title: 'Success', 
        description: `Discount ${!discount.active ? 'activated' : 'deactivated'}` 
      });
    } catch (error) {
      console.error('Error toggling discount:', error);
      toast({
        title: 'Error',
        description: 'Failed to update discount status',
        variant: 'destructive'
      });
    }
  };

  const filteredDiscounts = discounts.filter(discount =>
    discount.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Discount Management</h2>
          <p className="text-gray-600">Create and manage discount codes</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                setDiscountData({ code: '', type: 'percentage', value: 0, active: true });
                setEditingDiscount(null);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Discount
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingDiscount ? 'Edit Discount' : 'Create New Discount'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="code">Discount Code *</Label>
                <Input
                  id="code"
                  value={discountData.code}
                  onChange={(e) => setDiscountData({...discountData, code: e.target.value.toUpperCase()})}
                  placeholder="SAVE10"
                />
              </div>
              <div>
                <Label htmlFor="type">Discount Type</Label>
                <Select value={discountData.type} onValueChange={(value: 'percentage' | 'fixed') => setDiscountData({...discountData, type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="value">
                  Value * {discountData.type === 'percentage' ? '(%)' : '(Amount)'}
                </Label>
                <Input
                  id="value"
                  type="number"
                  step={discountData.type === 'percentage' ? '0.01' : '1'}
                  min="0"
                  max={discountData.type === 'percentage' ? '100' : undefined}
                  value={discountData.value}
                  onChange={(e) => setDiscountData({...discountData, value: parseFloat(e.target.value) || 0})}
                  placeholder={discountData.type === 'percentage' ? '10' : '1000'}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="active">Active</Label>
                <Switch
                  id="active"
                  checked={discountData.active}
                  onCheckedChange={(checked) => setDiscountData({...discountData, active: checked})}
                />
              </div>
              <Button onClick={handleSaveDiscount} className="w-full bg-green-600 hover:bg-green-700">
                {editingDiscount ? 'Update Discount' : 'Create Discount'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search discount codes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-4">
        {filteredDiscounts.map((discount) => (
          <Card key={discount.id} className="hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${discount.type === 'percentage' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {discount.type === 'percentage' ? 
                      <Percent className={`h-6 w-6 ${discount.type === 'percentage' ? 'text-blue-600' : 'text-green-600'}`} /> :
                      <DollarSign className="h-6 w-6 text-green-600" />
                    }
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{discount.code}</h3>
                    <p className="text-sm text-gray-600">
                      {discount.type === 'percentage' ? `${discount.value}% off` : `$${discount.value} off`}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(discount.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Badge variant={discount.active ? "default" : "secondary"}>
                    {discount.active ? 'Active' : 'Inactive'}
                  </Badge>
                  
                  <div className="flex space-x-1">
                    <Switch
                      checked={discount.active}
                      onCheckedChange={() => toggleDiscountStatus(discount)}
                    />
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => handleEditDiscount(discount)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteDiscount(discount.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredDiscounts.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Percent className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No discounts found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Start by creating your first discount code"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Discount
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

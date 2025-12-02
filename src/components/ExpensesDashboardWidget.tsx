import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Wallet, Plus, TrendingDown } from 'lucide-react';

interface ExpenseCategory {
  name: string;
  amount: number;
  count: number;
}

export const ExpensesDashboardWidget = () => {
  const [expenses, setExpenses] = useState<ExpenseCategory[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    payment_method: 'cash'
  });

  useEffect(() => {
    fetchTodaysExpenses();
  }, [user?.id]);

  const fetchTodaysExpenses = async () => {
    if (!user?.id) return;

    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('expenses')
        .select('category, amount')
        .eq('owner_id', user.id)
        .gte('expense_date', startOfDay.toISOString().split('T')[0])
        .lt('expense_date', endOfDay.toISOString().split('T')[0]);

      if (error) throw error;

      // Group by category
      const categoryMap = new Map<string, { amount: number; count: number }>();
      let total = 0;

      data?.forEach((expense) => {
        const amount = Number(expense.amount);
        total += amount;

        const existing = categoryMap.get(expense.category) || { amount: 0, count: 0 };
        categoryMap.set(expense.category, {
          amount: existing.amount + amount,
          count: existing.count + 1
        });
      });

      const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count
      }));

      setExpenses(categories);
      setTotalExpenses(total);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('expenses')
        .insert([{
          owner_id: user.id,
          category: formData.category,
          amount: parseFloat(formData.amount),
          description: formData.description,
          payment_method: formData.payment_method
        }]);

      if (error) throw error;

      toast.success('Matumizi yameongezwa!');
      setDialogOpen(false);
      setFormData({
        category: '',
        amount: '',
        description: '',
        payment_method: 'cash'
      });
      fetchTodaysExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Imeshindwa kuongeza matumizi');
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = [
    'Rent',
    'Utilities',
    'Salaries',
    'Supplies',
    'Transport',
    'Marketing',
    'Maintenance',
    'Other'
  ];

  return (
    <>
      <Card className="border-red-200">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-red-700 text-sm">
              <TrendingDown className="h-4 w-4 mr-2" />
              Matumizi Leo
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDialogOpen(true)}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Ongeza
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-2">
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Jumla:</span>
              <span className="text-lg font-bold text-red-600">
                TZS {totalExpenses.toLocaleString()}
              </span>
            </div>
          </div>

          {expenses.length > 0 ? (
            <div className="space-y-2">
              {expenses.slice(0, 3).map((expense, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 bg-red-50 rounded border-l-2 border-l-red-400"
                >
                  <div>
                    <p className="text-xs font-medium">{expense.name}</p>
                    <p className="text-xs text-gray-600">{expense.count} miamala</p>
                  </div>
                  <span className="text-sm font-bold text-red-600">
                    TZS {expense.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 text-center py-2">
              Hakuna matumizi leo
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ongeza Matumizi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuickAdd} className="space-y-4">
            <div>
              <Label htmlFor="category">Aina</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chagua aina" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Kiasi (TZS)</Label>
              <Input
                id="amount"
                type="number"
                step="any"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Maelezo</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Eleza matumizi..."
                required
              />
            </div>

            <div>
              <Label htmlFor="payment_method">Njia ya Malipo</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Taslimu</SelectItem>
                  <SelectItem value="mobile_money">Pesa za Simu</SelectItem>
                  <SelectItem value="bank">Benki</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <Wallet className="h-4 w-4 mr-2" />
              Ongeza Matumizi
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

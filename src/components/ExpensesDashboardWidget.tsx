import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Wallet, Plus, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';

interface ExpenseCategory {
  name: string;
  amount: number;
  count: number;
}

export const ExpensesDashboardWidget = () => {
  const [expenses, setExpenses] = useState<ExpenseCategory[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
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
      setFormData({ category: '', amount: '', description: '', payment_method: 'cash' });
      fetchTodaysExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Imeshindwa kuongeza matumizi');
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Transport', 'Marketing', 'Maintenance', 'Other'];

  return (
    <>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
          <CollapsibleTrigger className="flex items-center gap-2 flex-1">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="text-xs font-medium">Matumizi</span>
            <span className="text-sm font-bold text-red-600">TZS {totalExpenses.toLocaleString()}</span>
            {expanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
          </CollapsibleTrigger>
          <Button size="sm" variant="ghost" onClick={() => setDialogOpen(true)} className="h-6 w-6 p-0 ml-1">
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        
        <CollapsibleContent>
          <div className="mt-1 p-2 bg-red-50/50 dark:bg-red-950/50 rounded-lg space-y-1">
            {expenses.length > 0 ? (
              expenses.slice(0, 3).map((expense, index) => (
                <div key={index} className="flex justify-between items-center p-1.5 bg-background rounded text-xs">
                  <span>{expense.name} ({expense.count})</span>
                  <span className="font-medium text-red-600">TZS {expense.amount.toLocaleString()}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-1">Hakuna matumizi leo</p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ongeza Matumizi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuickAdd} className="space-y-3">
            <div>
              <Label>Aina</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger><SelectValue placeholder="Chagua aina" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kiasi (TZS)</Label>
              <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
            </div>
            <div>
              <Label>Maelezo</Label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Eleza matumizi..." required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              <Wallet className="h-4 w-4 mr-2" />
              Ongeza
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

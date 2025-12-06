import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
// PageHeader removed for cleaner UI
import { format } from 'date-fns';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  payment_method: string | null;
  created_at: string;
}

const expenseCategories = [
  'Rent/Kodi',
  'Utilities/Umeme na Maji',
  'Salaries/Mishahara',
  'Transport/Usafiri',
  'Marketing/Matangazo',
  'Supplies/Vifaa',
  'Maintenance/Matengenezo',
  'Other/Nyinginezo'
];

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'cash'
  });

  useEffect(() => {
    fetchExpenses();
  }, [user?.id]);

  const fetchExpenses = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('owner_id', user.id)
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Imeshindwa kupakia matumizi');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
          description: formData.description || null,
          expense_date: formData.expense_date,
          payment_method: formData.payment_method
        }]);

      if (error) throw error;

      toast.success('Matumizi yamehifadhiwa');
      setFormData({
        category: '',
        amount: '',
        description: '',
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        payment_method: 'cash'
      });
      setShowForm(false);
      fetchExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Imeshindwa kuhifadhi matumizi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta matumizi haya?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Matumizi yamefutwa');
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Imeshindwa kufuta matumizi');
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="page-container p-4 pb-24 md:p-6 space-y-4">

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Jumla ya Matumizi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">TZS {totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Matumizi Mwezi Huu</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              TZS {expenses.filter(e => 
                new Date(e.expense_date).getMonth() === new Date().getMonth()
              ).reduce((sum, exp) => sum + exp.amount, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Idadi ya Matumizi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{expenses.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setShowForm(!showForm)} className="flex-1">
          <Plus className="h-4 w-4 mr-2" />
          Ongeza Matumizi
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Matumizi Mapya</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Aina ya Matumizi</Label>
                <Select 
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chagua aina" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Kiasi (TZS)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Maelezo</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Maelezo ya ziada..."
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tarehe</Label>
                  <Input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Njia ya Malipo</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({...formData, payment_method: value})}
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
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  Hifadhi
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                  className="flex-1"
                >
                  Ghairi
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historia ya Matumizi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Inapakia...</p>
          ) : expenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Hakuna matumizi yaliyorekodiwa
            </p>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <div 
                  key={expense.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{expense.category}</p>
                    {expense.description && (
                      <p className="text-sm text-muted-foreground">{expense.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(expense.expense_date), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">
                      TZS {expense.amount.toLocaleString()}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(expense.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
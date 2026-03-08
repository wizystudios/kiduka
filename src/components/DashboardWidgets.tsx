import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDataAccess } from '@/hooks/useDataAccess';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  TrendingDown,
  ShoppingCart,
  Package,
  Plus,
  Wallet,
  ChevronRight,
  Activity,
  LogIn,
  Edit,
  Trash2,
  UserPlus,
  Banknote,
  ClipboardCheck,
  Users,
  MessageCircle,
  Send
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  category: string | null;
}

interface ExpenseCategory {
  name: string;
  amount: number;
  count: number;
}

// Stock Alert Widget
export const StockAlertWidget = () => {
  const navigate = useNavigate();
  const { dataOwnerId, isReady } = useDataAccess();
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isReady && dataOwnerId) fetchLowStock();
  }, [isReady, dataOwnerId]);

  const fetchLowStock = async () => {
    if (!dataOwnerId) return;
    const { data } = await supabase
      .from('products')
      .select('id, name, stock_quantity, low_stock_threshold, category')
      .eq('owner_id', dataOwnerId)
      .order('stock_quantity', { ascending: true });

    const lowStock = data?.filter(p => p.stock_quantity <= (p.low_stock_threshold || 10)) || [];
    setLowStockProducts(lowStock);
  };

  const getStockLevel = (product: LowStockProduct) => {
    if (product.stock_quantity === 0) return { label: 'Imeisha', color: 'bg-red-500 text-white' };
    const percentage = (product.stock_quantity / (product.low_stock_threshold || 10)) * 100;
    if (percentage <= 25) return { label: 'Hatari', color: 'bg-red-100 text-red-800' };
    if (percentage <= 50) return { label: 'Chini', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Angalia', color: 'bg-orange-100 text-orange-800' };
  };

  if (lowStockProducts.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="flex-1 h-10 justify-between bg-yellow-50 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-950 dark:border-yellow-800"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-xs font-medium">Stock Ndogo</span>
          </div>
          <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">
            {lowStockProducts.length}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Stock Ndogo ({lowStockProducts.length})
          </SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-2 overflow-y-auto max-h-[50vh]">
          {lowStockProducts.map((product) => {
            const level = getStockLevel(product);
            return (
              <div key={product.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium text-sm">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.category || 'Hakuna kategoria'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">{product.stock_quantity}</span>
                  <Badge className={level.color}>{level.label}</Badge>
                </div>
              </div>
            );
          })}
        </div>
        <Button className="w-full" onClick={() => { navigate('/products'); setOpen(false); }}>
          <Package className="h-4 w-4 mr-2" />
          Tazama Bidhaa Zote
        </Button>
      </SheetContent>
    </Sheet>
  );
};

// Expenses Widget
export const ExpensesWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<ExpenseCategory[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    payment_method: 'cash'
  });

  useEffect(() => {
    if (user?.id) fetchExpenses();
  }, [user?.id]);

  const fetchExpenses = async () => {
    if (!user?.id) return;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const { data } = await supabase
      .from('expenses')
      .select('category, amount')
      .eq('owner_id', user.id)
      .gte('expense_date', startOfDay.toISOString().split('T')[0]);

    const categoryMap = new Map<string, { amount: number; count: number }>();
    let total = 0;

    data?.forEach((expense) => {
      const amount = Number(expense.amount);
      total += amount;
      const existing = categoryMap.get(expense.category) || { amount: 0, count: 0 };
      categoryMap.set(expense.category, { amount: existing.amount + amount, count: existing.count + 1 });
    });

    setExpenses(Array.from(categoryMap.entries()).map(([name, data]) => ({ name, ...data })));
    setTotalExpenses(total);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      setLoading(true);
      const { error } = await supabase.from('expenses').insert([{
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
      fetchExpenses();
    } catch (error) {
      toast.error('Imeshindwa kuongeza matumizi');
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Transport', 'Marketing', 'Maintenance', 'Other'];

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="flex-1 h-10 justify-between bg-red-50 border-red-200 hover:bg-red-100 dark:bg-red-950 dark:border-red-800"
          >
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium">Matumizi</span>
            </div>
            <span className="text-xs font-bold text-red-600">TZS {totalExpenses.toLocaleString()}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Matumizi Leo
              </span>
              <span className="text-red-600 font-bold">TZS {totalExpenses.toLocaleString()}</span>
            </SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-2 overflow-y-auto max-h-[40vh]">
            {expenses.length > 0 ? expenses.map((expense, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium text-sm">{expense.name}</p>
                  <p className="text-xs text-muted-foreground">{expense.count} miamala</p>
                </div>
                <span className="font-bold text-red-600">TZS {expense.amount.toLocaleString()}</span>
              </div>
            )) : (
              <p className="text-center text-muted-foreground py-4">Hakuna matumizi leo</p>
            )}
          </div>
          <div className="space-y-2">
            <Button className="w-full" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ongeza Matumizi
            </Button>
            <Button variant="outline" className="w-full" onClick={() => { navigate('/expenses'); setOpen(false); }}>
              Tazama Yote
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ongeza Matumizi</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-3">
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

// Transactions Widget
export const TransactionsWidget = () => {
  const navigate = useNavigate();
  const { dataOwnerId, isReady } = useDataAccess();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isReady && dataOwnerId) fetchTransactions();
  }, [isReady, dataOwnerId]);

  const fetchTransactions = async () => {
    if (!dataOwnerId) return;
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const { data } = await supabase
      .from('sales')
      .select('id, total_amount, payment_method, created_at')
      .eq('owner_id', dataOwnerId)
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    setTransactions(data || []);
    setTotal(data?.reduce((sum, s) => sum + Number(s.total_amount), 0) || 0);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="flex-1 h-10 justify-between bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-950 dark:border-blue-800"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium">Miamala</span>
          </div>
          <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">
            {transactions.length}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
              Miamala Leo
            </span>
            <span className="text-green-600 font-bold">TZS {total.toLocaleString()}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-2 overflow-y-auto max-h-[50vh]">
          {transactions.length > 0 ? transactions.map((tx) => (
            <div key={tx.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium text-sm">TZS {Number(tx.total_amount).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {tx.payment_method || 'Cash'} • {new Date(tx.created_at).toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <Badge variant="secondary" className="text-green-600">Imelipwa</Badge>
            </div>
          )) : (
            <p className="text-center text-muted-foreground py-4">Hakuna miamala leo</p>
          )}
        </div>
        <Button className="w-full" onClick={() => { navigate('/sales'); setOpen(false); }}>
          Tazama Mauzo Yote
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </SheetContent>
    </Sheet>
  );
};

// Products Widget
export const ProductsWidget = () => {
  const navigate = useNavigate();
  const { dataOwnerId, isReady } = useDataAccess();
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isReady && dataOwnerId) fetchProducts();
  }, [isReady, dataOwnerId]);

  const fetchProducts = async () => {
    if (!dataOwnerId) return;
    const { data } = await supabase
      .from('products')
      .select('id, name, stock_quantity, price, category')
      .eq('owner_id', dataOwnerId)
      .order('updated_at', { ascending: false })
      .limit(10);

    setProducts(data || []);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="flex-1 h-10 justify-between bg-purple-50 border-purple-200 hover:bg-purple-100 dark:bg-purple-950 dark:border-purple-800"
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium">Bidhaa</span>
          </div>
          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300">
            {products.length}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Bidhaa za Hivi Karibuni
          </SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-2 overflow-y-auto max-h-[50vh]">
          {products.map((product) => (
            <div key={product.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <div>
                <p className="font-medium text-sm">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.category || 'Hakuna kategoria'}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm">TZS {Number(product.price).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Stock: {product.stock_quantity}</p>
              </div>
            </div>
          ))}
        </div>
        <Button className="w-full" onClick={() => { navigate('/products'); setOpen(false); }}>
          Tazama Bidhaa Zote
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </SheetContent>
    </Sheet>
  );
};

// Activity icon mapper
const getActivityIcon = (type: string) => {
  switch (type) {
    case 'login': case 'logout': return LogIn;
    case 'sale_create': case 'sale_complete': return ShoppingCart;
    case 'product_add': case 'product_edit': return Package;
    case 'product_delete': return Trash2;
    case 'expense_add': return Wallet;
    case 'loan_create': case 'loan_payment': return Banknote;
    case 'assistant_add': case 'assistant_remove': return UserPlus;
    case 'inventory_adjustment': return ClipboardCheck;
    case 'settings_change': return Edit;
    default: return Activity;
  }
};

const getActivityColor = (type: string) => {
  if (type.includes('sale')) return 'text-green-600 bg-green-50';
  if (type.includes('product')) return 'text-purple-600 bg-purple-50';
  if (type.includes('expense')) return 'text-red-600 bg-red-50';
  if (type.includes('loan')) return 'text-lime-600 bg-lime-50';
  if (type.includes('login') || type.includes('logout')) return 'text-blue-600 bg-blue-50';
  if (type.includes('assistant')) return 'text-indigo-600 bg-indigo-50';
  if (type.includes('inventory')) return 'text-yellow-600 bg-yellow-50';
  return 'text-muted-foreground bg-muted';
};

const timeAgo = (date: string) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'sasa hivi';
  if (seconds < 3600) return `dk ${Math.floor(seconds / 60)}`;
  if (seconds < 86400) return `saa ${Math.floor(seconds / 3600)}`;
  return `siku ${Math.floor(seconds / 86400)}`;
};

// Loans Widget
export const LoansWidget = () => {
  const navigate = useNavigate();
  const { dataOwnerId, isReady } = useDataAccess();
  const [activeLoans, setActiveLoans] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [upcomingLoans, setUpcomingLoans] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isReady && dataOwnerId) fetchLoans();
  }, [isReady, dataOwnerId]);

  const fetchLoans = async () => {
    if (!dataOwnerId) return;
    const { data } = await supabase
      .from('micro_loans')
      .select('id, customer_name, balance, due_date, status, phone')
      .eq('owner_id', dataOwnerId)
      .eq('status', 'active')
      .order('due_date', { ascending: true })
      .limit(10);

    const loans = data || [];
    setActiveLoans(loans.length);
    setTotalBalance(loans.reduce((s, l) => s + Number(l.balance || 0), 0));
    setUpcomingLoans(loans);
  };

  const getDueStatus = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
    if (days < 0) return { label: 'Imepita', color: 'bg-destructive text-destructive-foreground' };
    if (days <= 3) return { label: `Siku ${days}`, color: 'bg-yellow-100 text-yellow-800' };
    return { label: `Siku ${days}`, color: 'bg-muted text-muted-foreground' };
  };

  if (activeLoans === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="flex-1 h-10 justify-between bg-lime-50 border-lime-200 hover:bg-lime-100 dark:bg-lime-950 dark:border-lime-800"
        >
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-lime-600" />
            <span className="text-xs font-medium">Mikopo</span>
          </div>
          <Badge variant="outline" className="text-xs bg-lime-100 text-lime-800 border-lime-300">
            {activeLoans}
          </Badge>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-lime-600" />
              Mikopo Hai
            </span>
            <span className="text-lime-700 font-bold">TZS {totalBalance.toLocaleString()}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="py-4 space-y-2 overflow-y-auto max-h-[50vh]">
          {upcomingLoans.map((loan) => {
            const due = getDueStatus(loan.due_date);
            return (
              <div key={loan.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium text-sm">{loan.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{loan.phone || 'Hakuna simu'}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="font-bold text-sm">TZS {Number(loan.balance).toLocaleString()}</p>
                    <Badge className={`text-[10px] ${due.color}`}>{due.label}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Button className="w-full" onClick={() => { navigate('/micro-loans'); setOpen(false); }}>
          Tazama Mikopo Yote
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </SheetContent>
    </Sheet>
  );
};

// Recent Activities Widget
export const RecentActivitiesWidget = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchActivities = async () => {
      const { data } = await supabase
        .from('user_activities')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setActivities(data || []);
      setLoading(false);
    };
    fetchActivities();
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-auto p-2 flex flex-col items-start gap-1 col-span-2">
          <div className="flex items-center gap-1 w-full">
            <Activity className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold">Shughuli</span>
            <Badge variant="secondary" className="ml-auto text-[9px] h-4 px-1">{activities.length}</Badge>
          </div>
          {loading ? (
            <p className="text-[10px] text-muted-foreground">Inapakia...</p>
          ) : activities.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">Hakuna shughuli</p>
          ) : (
            <p className="text-[10px] text-muted-foreground truncate w-full">{activities[0]?.description}</p>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle className="text-sm">Shughuli za Hivi Karibuni</SheetTitle>
        </SheetHeader>
        <div className="space-y-2 mt-3 overflow-y-auto max-h-[55vh]">
          {activities.map((a) => {
            const Icon = getActivityIcon(a.activity_type);
            const colors = getActivityColor(a.activity_type);
            const [textColor, bgColor] = colors.split(' ');
            return (
              <div key={a.id} className="flex items-start gap-2 p-2 rounded-md border">
                <div className={`p-1 rounded-full ${bgColor} shrink-0`}>
                  <Icon className={`h-3 w-3 ${textColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{a.description}</p>
                  <p className="text-[10px] text-muted-foreground">{timeAgo(a.created_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <Button className="w-full mt-3" variant="outline" onClick={() => navigate('/notifications')}>
          Tazama Zote
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </SheetContent>
    </Sheet>
  );
};

// ===== DEBTORS WIDGET =====
interface Debtor {
  id: string;
  name: string;
  phone: string | null;
  outstanding_balance: number;
}

export const DebtorsWidget = () => {
  const { user } = useAuth();
  const { dataOwnerId, isReady } = useDataAccess();
  const navigate = useNavigate();
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);

  useEffect(() => {
    if (isReady && dataOwnerId) {
      fetchDebtors();
      const interval = setInterval(fetchDebtors, 30000);
      return () => clearInterval(interval);
    }
  }, [isReady, dataOwnerId]);

  const fetchDebtors = async () => {
    if (!dataOwnerId) return;
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, outstanding_balance')
      .eq('owner_id', dataOwnerId)
      .gt('outstanding_balance', 0)
      .order('outstanding_balance', { ascending: false })
      .limit(10);
    if (data) {
      setDebtors(data);
      setTotalDebt(data.reduce((sum, d) => sum + (d.outstanding_balance || 0), 0));
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="h-auto p-2 flex flex-col items-start w-full border-l-2 border-l-destructive">
          <div className="flex items-center gap-1 w-full">
            <Users className="h-3 w-3 text-destructive" />
            <span className="text-[10px] text-muted-foreground">Wadaiwa</span>
          </div>
          <p className="text-sm font-bold text-destructive">
            {debtors.length > 0 ? `${debtors.length} (TZS ${totalDebt.toLocaleString()})` : '0'}
          </p>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-destructive" />
            Wateja Wenye Madeni
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-2 mt-4">
          {debtors.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Hakuna wateja wenye madeni</p>
          ) : (
            debtors.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-2 border rounded-md">
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  {d.phone && <p className="text-[10px] text-muted-foreground">{d.phone}</p>}
                </div>
                <Badge variant="destructive" className="text-xs">
                  TZS {d.outstanding_balance.toLocaleString()}
                </Badge>
              </div>
            ))
          )}
        </div>
        <Button className="w-full mt-3" variant="outline" onClick={() => navigate('/customers')}>
          Tazama Wateja Wote
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </SheetContent>
    </Sheet>
  );
};

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, TrendingUp, TrendingDown, Wallet, Users, Delete, RefreshCw, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CalculatorProps {
  onClose?: () => void;
  isOpen?: boolean;
}

export const Calculator = ({ onClose, isOpen = true }: CalculatorProps) => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [newNumber, setNewNumber] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
    totalDebt: 0,
    productCosts: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id && showStats) {
      fetchStats();
    }
  }, [user?.id, showStats]);

  const fetchStats = async () => {
    if (!user?.id) return;
    setLoadingStats(true);
    
    try {
      // Fetch revenue from sales
      const { data: sales } = await supabase
        .from('sales')
        .select('total_amount')
        .eq('owner_id', user.id);
      
      // Fetch quick sales from customer_transactions
      const { data: quickSales } = await supabase
        .from('customer_transactions')
        .select('total_amount')
        .eq('owner_id', user.id)
        .eq('transaction_type', 'sale');

      // Fetch expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('owner_id', user.id);

      // Fetch customer debts
      const { data: customers } = await supabase
        .from('customers')
        .select('outstanding_balance')
        .eq('owner_id', user.id);

      // Fetch product costs (cost_price * stock_quantity)
      const { data: products } = await supabase
        .from('products')
        .select('cost_price, stock_quantity')
        .eq('owner_id', user.id);

      const totalSales = (sales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0);
      const totalQuickSales = (quickSales?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0);
      const totalRevenue = totalSales + totalQuickSales;
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const totalDebt = customers?.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0) || 0;
      const productCosts = products?.reduce((sum, p) => sum + ((p.cost_price || 0) * (p.stock_quantity || 0)), 0) || 0;

      setStats({
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalRevenue - totalExpenses,
        totalDebt,
        productCosts
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleNumber = (num: string) => {
    if (newNumber) {
      setDisplay(num);
      setNewNumber(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const handleDecimal = () => {
    if (newNumber) {
      setDisplay('0.');
      setNewNumber(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleOperation = (op: string) => {
    const currentValue = parseFloat(display);
    
    if (previousValue === null) {
      setPreviousValue(currentValue);
    } else if (operation) {
      const result = calculate(previousValue, currentValue, operation);
      setDisplay(String(result));
      setPreviousValue(result);
    }
    
    setOperation(op);
    setNewNumber(true);
  };

  const calculate = (prev: number, current: number, op: string): number => {
    switch (op) {
      case '+': return prev + current;
      case '-': return prev - current;
      case '×': return prev * current;
      case '÷': return current !== 0 ? prev / current : 0;
      default: return current;
    }
  };

  const handleEquals = () => {
    if (operation && previousValue !== null) {
      const result = calculate(previousValue, parseFloat(display), operation);
      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setNewNumber(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setNewNumber(true);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
      setNewNumber(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-background rounded-3xl p-4 animate-in zoom-in duration-200 shadow-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button
              variant={showStats ? "default" : "outline"}
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className="rounded-full text-xs"
            >
              {showStats ? 'Kikokotoo' : 'Takwimu'}
            </Button>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {showStats ? (
          /* Stats View */
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-500/10 p-3 rounded-2xl">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-muted-foreground">Mapato</span>
                </div>
                <p className="text-sm font-bold text-green-600">
                  TZS {stats.revenue.toLocaleString()}
                </p>
              </div>
              <div className="bg-red-500/10 p-3 rounded-2xl">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-muted-foreground">Matumizi</span>
                </div>
                <p className="text-sm font-bold text-red-600">
                  TZS {stats.expenses.toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-500/10 p-3 rounded-2xl">
                <div className="flex items-center gap-1 mb-1">
                  <Wallet className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Faida</span>
                </div>
                <p className={`text-sm font-bold ${stats.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  TZS {stats.profit.toLocaleString()}
                </p>
              </div>
              <div className="bg-orange-500/10 p-3 rounded-2xl">
                <div className="flex items-center gap-1 mb-1">
                  <Users className="h-3 w-3 text-orange-600" />
                  <span className="text-xs text-muted-foreground">Madeni</span>
                </div>
                <p className="text-sm font-bold text-orange-600">
                  TZS {stats.totalDebt.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-2xl">
              <div className="flex items-center gap-1 mb-1">
                <Package className="h-3 w-3 text-purple-600" />
                <span className="text-xs text-muted-foreground">Gharama za Bidhaa (Stock)</span>
              </div>
              <p className="text-sm font-bold text-purple-600">
                TZS {stats.productCosts.toLocaleString()}
              </p>
            </div>
            <Button 
              onClick={fetchStats} 
              variant="outline" 
              className="w-full rounded-xl"
              disabled={loadingStats}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingStats ? 'animate-spin' : ''}`} />
              {loadingStats ? 'Inapakia...' : 'Sasisha Takwimu'}
            </Button>
          </div>
        ) : (
          /* Calculator View */
          <>
            {/* Display */}
            <div className="bg-muted/50 rounded-2xl p-4 mb-4">
              <div className="text-right">
                <div className="text-xs text-muted-foreground h-4 mb-1">
                  {previousValue !== null && operation && `${previousValue.toLocaleString()} ${operation}`}
                </div>
                <div className="text-3xl font-light truncate">
                  {parseFloat(display).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {/* Row 1 */}
              <Button 
                variant="secondary" 
                className="h-12 text-base rounded-2xl font-medium"
                onClick={handleClear}
              >
                C
              </Button>
              <Button 
                variant="secondary" 
                className="h-12 text-base rounded-2xl"
                onClick={handleBackspace}
              >
                <Delete className="h-4 w-4" />
              </Button>
              <Button 
                variant="secondary" 
                className="h-12 text-base rounded-2xl"
                onClick={() => handleOperation('÷')}
              >
                ÷
              </Button>
              <Button 
                className="h-12 text-base rounded-2xl bg-primary"
                onClick={() => handleOperation('×')}
              >
                ×
              </Button>

              {/* Row 2 */}
              <Button variant="outline" className="h-12 text-lg rounded-2xl" onClick={() => handleNumber('7')}>7</Button>
              <Button variant="outline" className="h-12 text-lg rounded-2xl" onClick={() => handleNumber('8')}>8</Button>
              <Button variant="outline" className="h-12 text-lg rounded-2xl" onClick={() => handleNumber('9')}>9</Button>
              <Button className="h-12 text-base rounded-2xl bg-primary" onClick={() => handleOperation('-')}>−</Button>

              {/* Row 3 */}
              <Button variant="outline" className="h-12 text-lg rounded-2xl" onClick={() => handleNumber('4')}>4</Button>
              <Button variant="outline" className="h-12 text-lg rounded-2xl" onClick={() => handleNumber('5')}>5</Button>
              <Button variant="outline" className="h-12 text-lg rounded-2xl" onClick={() => handleNumber('6')}>6</Button>
              <Button className="h-12 text-base rounded-2xl bg-primary" onClick={() => handleOperation('+')}>+</Button>

              {/* Row 4 */}
              <Button variant="outline" className="h-12 text-lg rounded-2xl" onClick={() => handleNumber('1')}>1</Button>
              <Button variant="outline" className="h-12 text-lg rounded-2xl" onClick={() => handleNumber('2')}>2</Button>
              <Button variant="outline" className="h-12 text-lg rounded-2xl" onClick={() => handleNumber('3')}>3</Button>
              <Button className="h-12 text-base rounded-2xl bg-green-600 hover:bg-green-700 row-span-2" onClick={handleEquals}>=</Button>

              {/* Row 5 */}
              <Button variant="outline" className="h-12 text-lg rounded-2xl col-span-2" onClick={() => handleNumber('0')}>0</Button>
              <Button variant="outline" className="h-12 text-lg rounded-2xl" onClick={handleDecimal}>.</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

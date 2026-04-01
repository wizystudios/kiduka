import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen, Plus, TrendingUp, TrendingDown, ArrowUpDown,
  DollarSign, Receipt, FileText, Calendar
} from 'lucide-react';

interface IncomeRecord {
  id: string;
  amount: number;
  source: string;
  category: string;
  income_date: string;
  description: string | null;
  payment_method: string | null;
  created_at: string;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  expense_date: string;
  description: string | null;
  payment_method: string | null;
}

interface JournalEntry {
  id: string;
  entry_date: string;
  description: string;
  total_debit: number;
  total_credit: number;
  reference_type: string | null;
  created_at: string;
}

const INCOME_CATEGORIES = ['sales', 'services', 'interest', 'rent', 'other'];
const EXPENSE_CATEGORIES = ['Bidhaa/Stock', 'Kodi', 'Umeme', 'Maji', 'Mishahara', 'Usafiri', 'Matengenezo', 'Simu/Internet', 'Vifaa', 'Mengineyo'];

export default function BookkeepingPage() {
  const { getEffectiveOwnerId } = usePermissions();
  const { toast } = useToast();
  const ownerId = getEffectiveOwnerId();

  const [income, setIncome] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncomeDialog, setShowIncomeDialog] = useState(false);
  const [showJournalDialog, setShowJournalDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dateFilter, setDateFilter] = useState<'week' | 'month' | 'year'>('month');

  const [incomeForm, setIncomeForm] = useState({ amount: 0, source: '', category: 'sales', income_date: new Date().toISOString().split('T')[0], description: '', payment_method: '' });
  const [journalForm, setJournalForm] = useState({ entry_date: new Date().toISOString().split('T')[0], description: '', debit_account: '', credit_account: '', amount: 0 });

  useEffect(() => { if (ownerId) fetchData(); }, [ownerId]);

  const fetchData = async () => {
    setLoading(true);
    const [incRes, expRes, jrnRes] = await Promise.all([
      supabase.from('income_records').select('*').eq('owner_id', ownerId!).order('income_date', { ascending: false }).limit(100),
      supabase.from('expenses').select('*').eq('owner_id', ownerId!).order('expense_date', { ascending: false }).limit(100),
      supabase.from('journal_entries').select('*').eq('owner_id', ownerId!).order('entry_date', { ascending: false }).limit(100),
    ]);
    setIncome((incRes.data as any[]) || []);
    setExpenses(expRes.data || []);
    setJournals((jrnRes.data as any[]) || []);
    setLoading(false);
  };

  const getDateRange = () => {
    const now = new Date();
    const start = new Date();
    if (dateFilter === 'week') start.setDate(now.getDate() - 7);
    else if (dateFilter === 'month') start.setMonth(now.getMonth() - 1);
    else start.setFullYear(now.getFullYear() - 1);
    return start.toISOString().split('T')[0];
  };

  const filteredIncome = useMemo(() => {
    const start = getDateRange();
    return income.filter(i => i.income_date >= start);
  }, [income, dateFilter]);

  const filteredExpenses = useMemo(() => {
    const start = getDateRange();
    return expenses.filter(e => e.expense_date >= start);
  }, [expenses, dateFilter]);

  const totalIncome = filteredIncome.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  const handleSaveIncome = async () => {
    if (!incomeForm.source.trim() || !incomeForm.amount || !ownerId) return;
    setSubmitting(true);
    await supabase.from('income_records').insert({
      owner_id: ownerId,
      ...incomeForm,
    });

    // Auto-create journal entry
    await supabase.from('journal_entries').insert({
      owner_id: ownerId,
      entry_date: incomeForm.income_date,
      description: `Mapato: ${incomeForm.source}`,
      total_debit: incomeForm.amount,
      total_credit: incomeForm.amount,
      reference_type: 'income',
    });

    toast({ title: 'Mapato yameongezwa' });
    setShowIncomeDialog(false);
    setIncomeForm({ amount: 0, source: '', category: 'sales', income_date: new Date().toISOString().split('T')[0], description: '', payment_method: '' });
    setSubmitting(false);
    fetchData();
  };

  const handleSaveJournal = async () => {
    if (!journalForm.description.trim() || !journalForm.amount || !ownerId) return;
    setSubmitting(true);
    await supabase.from('journal_entries').insert({
      owner_id: ownerId,
      entry_date: journalForm.entry_date,
      description: journalForm.description,
      total_debit: journalForm.amount,
      total_credit: journalForm.amount,
    });
    toast({ title: 'Journal entry imeundwa' });
    setShowJournalDialog(false);
    setJournalForm({ entry_date: new Date().toISOString().split('T')[0], description: '', debit_account: '', credit_account: '', amount: 0 });
    setSubmitting(false);
    fetchData();
  };

  const categoryLabel = (c: string) => {
    const map: Record<string, string> = { sales: 'Mauzo', services: 'Huduma', interest: 'Riba', rent: 'Kodi', other: 'Mengineyo' };
    return map[c] || c;
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Uhasibu
          </h1>
          <p className="text-sm text-muted-foreground">Mapato, matumizi, na journal entries</p>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="flex items-center justify-around border-y border-border/40 py-3 mb-4">
        <div className="text-center">
          <p className="text-lg font-bold text-primary">TSh {totalIncome.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center"><TrendingUp className="h-3 w-3" /> Mapato</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-destructive">TSh {totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center"><TrendingDown className="h-3 w-3" /> Matumizi</p>
        </div>
        <div className="text-center">
          <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
            TSh {netProfit.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">Faida/Hasara</p>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex gap-1 mb-4">
        {(['week', 'month', 'year'] as const).map(f => (
          <Button key={f} size="sm" variant={dateFilter === f ? 'default' : 'outline'} onClick={() => setDateFilter(f)} className="text-xs">
            {f === 'week' ? 'Wiki' : f === 'month' ? 'Mwezi' : 'Mwaka'}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="income">Mapato</TabsTrigger>
          <TabsTrigger value="expenses">Matumizi</TabsTrigger>
          <TabsTrigger value="journal">Ledger</TabsTrigger>
        </TabsList>

        {/* Income Tab */}
        <TabsContent value="income" className="mt-4 space-y-3">
          <Button size="sm" className="w-full gap-1" onClick={() => setShowIncomeDialog(true)}>
            <Plus className="h-4 w-4" /> Ongeza Mapato
          </Button>

          {filteredIncome.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Hakuna mapato katika kipindi hiki</p>
          ) : (
            filteredIncome.map(i => (
              <div key={i.id} className="p-3 border border-border/40 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{i.source}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">{categoryLabel(i.category)}</Badge>
                    <span>{new Date(i.income_date).toLocaleDateString('sw-TZ')}</span>
                  </div>
                </div>
                <span className="font-bold text-primary">+TSh {i.amount.toLocaleString()}</span>
              </div>
            ))
          )}
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="mt-4 space-y-3">
          <Button size="sm" className="w-full gap-1" variant="outline" onClick={() => window.location.href = '/expenses'}>
            <Receipt className="h-4 w-4" /> Fungua Matumizi
          </Button>

          {filteredExpenses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Hakuna matumizi katika kipindi hiki</p>
          ) : (
            filteredExpenses.map(e => (
              <div key={e.id} className="p-3 border border-border/40 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{e.category}</p>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    {e.description && <span>{e.description}</span>}
                    <span>{new Date(e.expense_date).toLocaleDateString('sw-TZ')}</span>
                  </div>
                </div>
                <span className="font-bold text-destructive">-TSh {e.amount.toLocaleString()}</span>
              </div>
            ))
          )}
        </TabsContent>

        {/* Journal/Ledger Tab */}
        <TabsContent value="journal" className="mt-4 space-y-3">
          <Button size="sm" className="w-full gap-1" onClick={() => setShowJournalDialog(true)}>
            <Plus className="h-4 w-4" /> Journal Entry
          </Button>

          {/* P&L Summary */}
          <div className="p-4 border border-border/40 rounded-lg space-y-2">
            <h3 className="font-bold text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Taarifa ya Faida na Hasara</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Mapato Jumla</span><span className="font-bold text-primary">TSh {totalIncome.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Matumizi Jumla</span><span className="font-bold text-destructive">TSh {totalExpenses.toLocaleString()}</span></div>
              <div className="border-t border-border/40 pt-1 flex justify-between font-bold">
                <span>{netProfit >= 0 ? 'Faida' : 'Hasara'}</span>
                <span className={netProfit >= 0 ? 'text-primary' : 'text-destructive'}>TSh {Math.abs(netProfit).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {journals.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Hakuna journal entries</p>
          ) : (
            journals.map(j => (
              <div key={j.id} className="p-3 border border-border/40 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{j.description}</span>
                  <span className="text-xs text-muted-foreground">{new Date(j.entry_date).toLocaleDateString('sw-TZ')}</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-primary">Debit: TSh {j.total_debit.toLocaleString()}</span>
                  <span className="text-destructive">Credit: TSh {j.total_credit.toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Income Dialog */}
      <Dialog open={showIncomeDialog} onOpenChange={setShowIncomeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Ongeza Mapato</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Chanzo *</Label><Input value={incomeForm.source} onChange={e => setIncomeForm(f => ({ ...f, source: e.target.value }))} placeholder="Mauzo ya dukani..." /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Kiasi (TSh) *</Label><Input type="number" value={incomeForm.amount || ''} onChange={e => setIncomeForm(f => ({ ...f, amount: Number(e.target.value) }))} /></div>
              <div>
                <Label className="text-xs">Aina</Label>
                <select className="w-full border rounded-md p-2 text-sm bg-background" value={incomeForm.category} onChange={e => setIncomeForm(f => ({ ...f, category: e.target.value }))}>
                  {INCOME_CATEGORIES.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                </select>
              </div>
            </div>
            <div><Label className="text-xs">Tarehe</Label><Input type="date" value={incomeForm.income_date} onChange={e => setIncomeForm(f => ({ ...f, income_date: e.target.value }))} /></div>
            <div><Label className="text-xs">Njia ya Malipo</Label><Input value={incomeForm.payment_method} onChange={e => setIncomeForm(f => ({ ...f, payment_method: e.target.value }))} placeholder="Taslimu, M-Pesa..." /></div>
            <div><Label className="text-xs">Maelezo</Label><Textarea value={incomeForm.description} onChange={e => setIncomeForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIncomeDialog(false)}>Ghairi</Button>
            <Button onClick={handleSaveIncome} disabled={!incomeForm.source.trim() || !incomeForm.amount || submitting}>
              {submitting ? 'Inahifadhi...' : 'Hifadhi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Journal Dialog */}
      <Dialog open={showJournalDialog} onOpenChange={setShowJournalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Journal Entry Mpya</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Maelezo *</Label><Input value={journalForm.description} onChange={e => setJournalForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Kiasi (TSh) *</Label><Input type="number" value={journalForm.amount || ''} onChange={e => setJournalForm(f => ({ ...f, amount: Number(e.target.value) }))} /></div>
              <div><Label className="text-xs">Tarehe</Label><Input type="date" value={journalForm.entry_date} onChange={e => setJournalForm(f => ({ ...f, entry_date: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJournalDialog(false)}>Ghairi</Button>
            <Button onClick={handleSaveJournal} disabled={!journalForm.description.trim() || !journalForm.amount || submitting}>
              {submitting ? 'Inaunda...' : 'Unda'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Calculator, Loader2 } from 'lucide-react';

interface Item { key: string; label: string; qty: number; unit: number; amount: number }
const tsh = (n: number) => `TSh ${Number(n || 0).toLocaleString()}`;

/** Fee calculator: current bill and what-if preview, both priced by the database. */
export const BranchFeeCalculator = () => {
  const navigate = useNavigate();
  const [bill, setBill] = useState<any>(null);
  const [v, setV] = useState({ staff: 1, products: 0, customers: 0, branches: 0, branchStaff: 0 });
  const [preview, setPreview] = useState<{ plan: string; total: number; items: Item[] } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.rpc('get_my_billing' as any).then(({ data }) => {
      const b = data as any;
      setBill(b);
      if (b?.usage) setV({ staff: b.usage.hq_staff, products: b.usage.products, customers: b.usage.customers, branches: b.usage.branches, branchStaff: 0 });
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      supabase.rpc('preview_business_billing' as any, {
        p_staff: v.staff, p_products: v.products, p_customers: v.customers, p_branches: v.branches, p_branch_staff: v.branchStaff,
      }).then(({ data }) => setPreview(data as any));
    }, 250);
    return () => clearTimeout(t);
  }, [v, open]);

  if (!bill) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>;

  const rows: { k: keyof typeof v; label: string; max: number; step: number; min: number }[] = [
    { k: 'staff', label: 'Wafanyakazi duka kuu (pamoja na wewe)', max: 30, step: 1, min: 1 },
    { k: 'branches', label: 'Matawi', max: 20, step: 1, min: 0 },
    { k: 'branchStaff', label: 'Wafanyakazi wa matawi (jumla)', max: 60, step: 1, min: 0 },
    { k: 'products', label: 'Bidhaa', max: 2000, step: 10, min: 0 },
    { k: 'customers', label: 'Wateja', max: 3000, step: 10, min: 0 },
  ];

  return (
    <section className="space-y-3 border-y border-border/50 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Ada ya mwezi huu</p>
          <p className="text-2xl font-black tracking-tight text-primary">{tsh(bill.amount_due)}</p>
          <p className="text-[11px] text-muted-foreground">{bill.is_paid ? 'Umelipia' : 'Bado hujalipa'} · Bure: wafanyakazi {bill.free_limits.staff}, bidhaa {bill.free_limits.products}, wateja {bill.free_limits.customers}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button size="sm" className="rounded-full" onClick={() => navigate('/subscription')}>Lipa sasa</Button>
          <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setOpen(o => !o)}>
            <Calculator className="h-4 w-4 mr-1" />Kikokotoo
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-4 pt-2">
          {rows.map(r => (
            <div key={r.k} className="space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">{r.label}</span><span className="font-semibold">{v[r.k]}</span></div>
              <Slider min={r.min} max={r.max} step={r.step} value={[v[r.k]]} onValueChange={([n]) => setV(p => ({ ...p, [r.k]: n }))} />
            </div>
          ))}
          {preview && (
            <div className="divide-y divide-border/50">
              {preview.plan === 'free' ? (
                <p className="py-2 text-sm text-muted-foreground">Mpango wa bure — TSh 0</p>
              ) : preview.items.map(i => (
                <div key={i.key} className="flex justify-between py-1.5 text-sm">
                  <span className="text-muted-foreground">{i.label}{i.qty > 1 ? ` × ${i.qty}` : ''}</span>
                  <span className="font-semibold">{tsh(i.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 text-sm font-bold"><span>Makadirio kwa mwezi</span><span className="text-primary">{tsh(preview.total)}</span></div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface BillingItem { key: string; label: string; qty: number; unit: number; amount: number }
interface Billing {
  usage: { products: number; customers: number; hq_staff: number; branches: number };
  free_limits: { staff: number; products: number; customers: number };
  paid_limits: { staff: number; products: number; customers: number; branches: number };
  items: BillingItem[];
  total: number;
  amount_due: number;
  is_paid: boolean;
}

const tsh = (n: number) => `TSh ${Number(n || 0).toLocaleString()}`;

/** Live bill computed by the database from real usage — the only source of what an owner pays. */
export const BillingSummary = () => {
  const [b, setB] = useState<Billing | null>(null);

  useEffect(() => {
    supabase.rpc('get_my_billing' as any).then(({ data }) => setB(data as unknown as Billing));
  }, []);

  if (!b) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const limits = b.is_paid ? b.paid_limits : b.free_limits;
  const rows = [
    { label: 'Wafanyakazi', used: b.usage.hq_staff, max: limits.staff },
    { label: 'Bidhaa', used: b.usage.products, max: limits.products },
    { label: 'Wateja', used: b.usage.customers, max: limits.customers },
  ];

  return (
    <section className="space-y-4">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Bili ya mwezi huu</p>
        <p className="text-3xl font-black tracking-tight">{tsh(b.amount_due)}</p>
        <p className="text-xs text-muted-foreground">{b.is_paid ? 'Mpango uliolipiwa' : 'Uko kwenye mpango wa bure'}</p>
      </div>

      <div className="flex items-center justify-around border-y border-border/50 py-2">
        {rows.map((r) => (
          <div key={r.label} className="text-center">
            <p className={`text-lg font-bold ${r.used > r.max ? 'text-destructive' : 'text-foreground'}`}>
              {r.used}<span className="text-xs font-normal text-muted-foreground">/{r.max}</span>
            </p>
            <p className="text-[10px] text-muted-foreground">{r.label}</p>
          </div>
        ))}
      </div>

      <div className="divide-y divide-border/50">
        {b.items.map((i) => (
          <div key={i.key} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0 text-muted-foreground">
              {i.label}{i.qty > 1 ? ` × ${i.qty}` : ''}
            </span>
            <span className="shrink-0 font-semibold">{tsh(i.amount)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between py-2 text-sm font-bold">
          <span>Jumla</span><span className="text-primary">{tsh(b.total)}</span>
        </div>
      </div>
    </section>
  );
};

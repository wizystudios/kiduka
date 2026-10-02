import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/BackButton';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Settings = Record<string, number>;

const GROUPS: { title: string; fields: { key: string; label: string }[] }[] = [
  { title: 'Mpango wa bure', fields: [
    { key: 'free_staff_limit', label: 'Wafanyakazi (pamoja na mwenye duka)' },
    { key: 'free_product_limit', label: 'Bidhaa' },
    { key: 'free_customer_limit', label: 'Wateja' },
  ] },
  { title: 'Duka kuu (mwezi)', fields: [
    { key: 'base_fee', label: 'Ada (TSh)' },
    { key: 'base_staff_limit', label: 'Wafanyakazi' },
    { key: 'base_product_limit', label: 'Bidhaa' },
    { key: 'base_customer_limit', label: 'Wateja' },
  ] },
  { title: 'Tawi (kila moja, mwezi)', fields: [
    { key: 'branch_fee', label: 'Ada (TSh)' },
    { key: 'branch_staff_limit', label: 'Wafanyakazi kwa tawi' },
  ] },
  { title: 'Ziada', fields: [
    { key: 'extra_staff_fee', label: 'Kila mfanyakazi wa ziada (TSh)' },
    { key: 'extra_product_block', label: 'Bidhaa kwa kila kifurushi' },
    { key: 'extra_product_block_fee', label: 'Ada ya kifurushi cha bidhaa (TSh)' },
    { key: 'extra_customer_block', label: 'Wateja kwa kila kifurushi' },
    { key: 'extra_customer_block_fee', label: 'Ada ya kifurushi cha wateja (TSh)' },
    { key: 'sokoni_fee', label: 'Sokoni Marketplace (TSh)' },
  ] },
];

/** Super-admin editor for the single billing price row. Malipo reads these via the database bill. */
export default function BillingPlansPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('billing_settings' as any).select('*').eq('id', 1).single().then(({ data }) => setS(data as any));
  }, []);

  const save = async () => {
    if (!s) return;
    const payload: Settings = {};
    for (const g of GROUPS) for (const f of g.fields) {
      const n = Number(s[f.key]);
      if (!Number.isFinite(n) || n < 0 || (f.key.endsWith('_block') && n < 1)) { toast.error(`Thamani si sahihi: ${f.label}`); return; }
      payload[f.key] = n;
    }
    setSaving(true);
    const { error } = await supabase.from('billing_settings' as any).update({ ...payload, updated_at: new Date().toISOString() }).eq('id', 1);
    setSaving(false);
    if (error) toast.error('Imeshindwa kuhifadhi: ' + error.message); else toast.success('Bei za mipango zimehifadhiwa');
  };

  if (!s) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center gap-2"><BackButton /><h1 className="text-lg font-bold">Mipango ya Malipo</h1></div>
      {GROUPS.map(g => (
        <section key={g.title} className="space-y-3 border-b border-border/50 pb-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.fields.map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <Input type="number" min={0} className="rounded-2xl" value={s[f.key] ?? 0}
                  onChange={e => setS({ ...s, [f.key]: e.target.value as any })} />
              </div>
            ))}
          </div>
        </section>
      ))}
      <Button className="w-full rounded-full" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hifadhi bei'}
      </Button>
    </div>
  );
}

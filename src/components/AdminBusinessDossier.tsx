import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Key, Phone, Mail, Building2, Users, CreditCard, ShoppingCart, Package, Pencil } from 'lucide-react';

interface Props {
  ownerId: string | null;
  onClose: () => void;
  onPassword: (userId: string, name: string) => void;
  onEditContact: (userId: string, name: string, email: string, phone: string) => void;
}

const fmt = (n: number) => `TSh ${Math.round(n || 0).toLocaleString()}`;

export const AdminBusinessDossier = ({ ownerId, onClose, onPassword, onEditContact }: Props) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ownerId) { setData(null); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const [owner, biz, branches, sub, sales, products] = await Promise.all([
        supabase.from('profiles').select('id,full_name,email,phone,business_name,created_at').eq('id', ownerId).maybeSingle(),
        supabase.from('businesses').select('id,name,tin_number,region,district,is_active').eq('created_by', ownerId).limit(1).maybeSingle(),
        supabase.from('business_branches').select('id,branch_name,region,is_active,subscription_status').eq('owner_id', ownerId).is('deleted_at', null),
        supabase.from('user_subscriptions').select('status,trial_ends_at,current_period_end,payment_amount,calculated_fee').eq('user_id', ownerId).maybeSingle(),
        supabase.from('sales').select('total_amount,created_at').eq('owner_id', ownerId).gte('created_at', since).limit(5000),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId).eq('is_archived', false),
      ]);
      let staff: any[] = [];
      const [{ data: members }, { data: links }] = await Promise.all([
        biz.data?.id ? supabase.from('business_members').select('user_id,role,is_active').eq('business_id', biz.data.id) : Promise.resolve({ data: [] as any[] }),
        supabase.from('assistant_permissions').select('assistant_id,is_active').eq('owner_id', ownerId),
      ]);
      const byId = new Map<string, any>();
      (links || []).forEach((l: any) => byId.set(l.assistant_id, { user_id: l.assistant_id, role: 'msaidizi', is_active: l.is_active }));
      (members || []).filter((m: any) => m.user_id !== ownerId).forEach((m: any) => byId.set(m.user_id, { ...byId.get(m.user_id), ...m }));
      const ids = [...byId.keys()];
      if (ids.length) {
        const { data: profs } = await supabase.from('profiles').select('id,full_name,email,phone').in('id', ids);
        staff = ids.map((id) => ({ ...byId.get(id), ...(profs || []).find((p) => p.id === id) }));
      }
      if (cancelled) return;
      const salesRows = sales.data || [];
      setData({
        owner: owner.data, biz: biz.data, branches: branches.data || [], sub: sub.data, staff,
        sales30: salesRows.reduce((s, r: any) => s + Number(r.total_amount || 0), 0),
        salesCount: salesRows.length, productCount: products.count || 0,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [ownerId]);

  const o = data?.owner;
  const wa = (p?: string) => p ? `https://wa.me/${p.replace(/\D/g, '').replace(/^0/, '255')}` : '';

  return (
    <Sheet open={!!ownerId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />{data?.biz?.name || o?.business_name || 'Biashara'}</SheetTitle>
          <SheetDescription>Jalada kamili la biashara</SheetDescription>
        </SheetHeader>
        {loading || !data ? <p className="py-10 text-center text-sm text-muted-foreground">Inapakia…</p> : (
          <div className="mt-4 space-y-5">
            <section className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-3xl bg-muted/50 p-3"><ShoppingCart className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-sm font-bold">{fmt(data.sales30)}</p><p className="text-[10px] text-muted-foreground">Mauzo siku 30 ({data.salesCount})</p></div>
              <div className="rounded-3xl bg-muted/50 p-3"><Package className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-sm font-bold">{data.productCount}</p><p className="text-[10px] text-muted-foreground">Bidhaa</p></div>
              <div className="rounded-3xl bg-muted/50 p-3"><Users className="mx-auto h-4 w-4 text-primary" /><p className="mt-1 text-sm font-bold">{data.staff.length}</p><p className="text-[10px] text-muted-foreground">Wasaidizi</p></div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Mmiliki</h3>
              <div className="rounded-3xl border border-border p-3">
                <p className="font-medium">{o?.full_name || '—'}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{o?.email}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{o?.phone || 'Hakuna simu'}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="secondary" className="h-8 rounded-full text-xs" onClick={() => onPassword(o.id, o.full_name || o.email)}><Key className="mr-1 h-3 w-3" />Nenosiri</Button>
                  <Button size="sm" variant="secondary" className="h-8 rounded-full text-xs" onClick={() => onEditContact(o.id, o.full_name || o.email, o.email || '', o.phone || '')}><Pencil className="mr-1 h-3 w-3" />Email/Simu</Button>
                  {o?.phone && <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" asChild><a href={wa(o.phone)} target="_blank" rel="noreferrer">WhatsApp</a></Button>}
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Wasaidizi ({data.staff.length})</h3>
              {data.staff.length === 0 ? <p className="text-xs text-muted-foreground">Hakuna wasaidizi</p> : data.staff.map((s: any) => (
                <div key={s.user_id} className="rounded-3xl border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{s.full_name || s.email}</p>
                    <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-[10px]">{s.role}{s.is_active ? '' : ' · amezimwa'}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{s.email} · {s.phone || 'Hakuna simu'}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="secondary" className="h-8 rounded-full text-xs" onClick={() => onPassword(s.user_id, s.full_name || s.email)}><Key className="mr-1 h-3 w-3" />Nenosiri</Button>
                    <Button size="sm" variant="secondary" className="h-8 rounded-full text-xs" onClick={() => onEditContact(s.user_id, s.full_name || s.email, s.email || '', s.phone || '')}><Pencil className="mr-1 h-3 w-3" />Email/Simu</Button>
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Matawi ({data.branches.length})</h3>
              {data.branches.length === 0 ? <p className="text-xs text-muted-foreground">Hakuna matawi</p> : data.branches.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between rounded-3xl border border-border p-3 text-sm">
                  <span className="truncate">{b.branch_name} <span className="text-xs text-muted-foreground">{b.region || ''}</span></span>
                  <Badge variant={b.is_active ? 'default' : 'secondary'} className="text-[10px]">{b.is_active ? 'Hai' : 'Imezimwa'}</Badge>
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <h3 className="flex items-center gap-1 text-sm font-semibold"><CreditCard className="h-4 w-4" />Usajili</h3>
              {data.sub ? (
                <div className="rounded-3xl border border-border p-3 text-sm">
                  <Badge className="text-[10px]">{data.sub.status}</Badge>
                  <p className="mt-1 text-xs text-muted-foreground">Ada: {fmt(data.sub.calculated_fee || data.sub.payment_amount)} / mwezi</p>
                  <p className="text-xs text-muted-foreground">Inaisha: {new Date(data.sub.current_period_end || data.sub.trial_ends_at).toLocaleDateString('sw-TZ')}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Washa au sitisha kupitia Fedha → Usajili & Malipo.</p>
                </div>
              ) : <p className="text-xs text-muted-foreground">Hakuna usajili</p>}
            </section>

            {data.biz && (
              <section className="space-y-1 text-xs text-muted-foreground">
                <h3 className="text-sm font-semibold text-foreground">Taarifa za biashara</h3>
                <p>TIN: {data.biz.tin_number || 'Haijawekwa'}</p>
                <p>Eneo: {[data.biz.region, data.biz.district].filter(Boolean).join(', ') || 'Halijawekwa'}</p>
              </section>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import {
  Building2, CheckCircle2, XCircle, CreditCard, Users, Store, Scale, ShoppingCart, Package,
  Activity, KeyRound, Phone, Mail, Pencil, Key, FileText, LogOut, Trash2, LayoutDashboard, Plus,
} from 'lucide-react';
import { AdminBranchesPanel } from './AdminBranchesPanel';
import { AdminCompliancePanel } from './AdminCompliancePanel';
import { AdminUserActivities } from './AdminUserActivities';
import { AdminAssistantPermissions } from './AdminAssistantPermissions';

type Section = 'overview' | 'people' | 'branches' | 'billing' | 'compliance' | 'sales' | 'products' | 'activity' | 'permissions';

interface Props {
  ownerId: string;
  reloadToken?: unknown;
  onExit: () => void;
  onDelete: (ownerId: string, name: string) => void;
  onDossier: (ownerId: string) => void;
  onPassword: (userId: string, name: string) => void;
  onEditContact: (userId: string, name: string, email: string, phone: string) => void;
  onActivate: (subId: string) => void;
  onSuspend: (subId: string) => void;
  onEditFee: (sub: any) => void;
}

const fmt = (n: number) => `TSh ${Math.round(n || 0).toLocaleString()}`;
const dateTz = (d?: string | null) => (d ? new Date(d).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const wa = (p?: string | null) => (p ? `https://wa.me/${p.replace(/\D/g, '').replace(/^0/, '255')}` : '');

const SUB_LABEL: Record<string, string> = { active: 'Hai', trial: 'Majaribio', expired: 'Imeisha', pending: 'Inasubiri', cancelled: 'Imesitishwa' };

export const AdminBusinessWorkspace = (p: Props) => {
  const [section, setSection] = useState<Section>('overview');
  const [d, setD] = useState<any>(null);
  const [addingBranch, setAddingBranch] = useState(false);

  useEffect(() => { setSection('overview'); setAddingBranch(false); }, [p.ownerId]);

  useEffect(() => {
    let cancelled = false;
    setD(null);
    (async () => {
      const id = p.ownerId;
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const [owner, biz, branches, sub, sales, products, productCount, comp, contract, links, customers] = await Promise.all([
        supabase.from('profiles').select('id,full_name,email,phone,business_name,created_at').eq('id', id).maybeSingle(),
        supabase.from('businesses').select('id,name,tin_number,region,district,is_active').eq('created_by', id).limit(1).maybeSingle(),
        supabase.from('business_branches').select('id').eq('owner_id', id).is('deleted_at', null),
        supabase.from('user_subscriptions').select('*').eq('user_id', id).maybeSingle(),
        supabase.from('sales').select('id,total_amount,created_at,payment_method').eq('owner_id', id).gte('created_at', since).order('created_at', { ascending: false }).limit(2000),
        supabase.from('products').select('id,name,price,stock_quantity,low_stock_threshold').eq('owner_id', id).eq('is_archived', false).order('created_at', { ascending: false }).limit(50),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('owner_id', id).eq('is_archived', false),
        supabase.from('business_compliance').select('*').eq('owner_id', id).maybeSingle(),
        supabase.from('business_contracts').select('*').eq('owner_id', id).maybeSingle(),
        supabase.from('assistant_permissions').select('assistant_id,is_active').eq('owner_id', id),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('owner_id', id),
      ]);
      const ids = [...new Set((links.data || []).map((l: any) => l.assistant_id))];
      const { data: profs } = ids.length
        ? await supabase.from('profiles').select('id,full_name,email,phone').in('id', ids)
        : { data: [] as any[] };
      const staff = ids.map((sid) => ({
        ...(profs || []).find((x: any) => x.id === sid),
        id: sid,
        is_active: (links.data || []).find((l: any) => l.assistant_id === sid)?.is_active,
      }));
      if (cancelled) return;
      setD({
        owner: owner.data, biz: biz.data, branchCount: (branches.data || []).length, sub: sub.data,
        sales: sales.data || [], products: products.data || [], productCount: productCount.count || 0,
        comp: comp.data, contract: contract.data, staff, customerCount: customers.count || 0,
      });
    })();
    return () => { cancelled = true; };
  }, [p.ownerId, p.reloadToken]);

  const chart = useMemo(() => {
    const days: { date: string; revenue: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dt = new Date(Date.now() - i * 864e5);
      days.push({ date: dt.toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short' }), revenue: 0 });
    }
    (d?.sales || []).forEach((s: any) => {
      const key = new Date(s.created_at).toLocaleDateString('sw-TZ', { day: '2-digit', month: 'short' });
      const row = days.find((x) => x.date === key);
      if (row) row.revenue += Number(s.total_amount || 0);
    });
    return days;
  }, [d]);

  const name = d?.biz?.name || d?.owner?.business_name || d?.owner?.full_name || 'Biashara';

  if (!d) {
    return <div className="rounded-3xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Inapakia taarifa za biashara…</div>;
  }

  const sales30 = d.sales.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
  const subStatus = d.sub?.status || 'none';
  const subActive = subStatus === 'active' || subStatus === 'trial';
  const subEnd = d.sub?.current_period_end || d.sub?.trial_ends_at;
  const compDone = !!d.comp?.completed_at || !!(d.comp?.tin_number && d.comp?.nida_number && d.comp?.business_license);
  const contractSigned = d.contract?.status === 'signed' && d.contract?.agreed_terms;
  const blocked = d.comp?.block_mode && d.comp.block_mode !== 'none';

  const checks = [
    { label: 'Usajili', ok: subActive, value: subActive ? `${SUB_LABEL[subStatus] || subStatus} hadi ${dateTz(subEnd)}` : 'Haujalipwa', go: 'billing' as Section },
    { label: 'Sheria (TIN, NIDA, Leseni)', ok: compDone, value: compDone ? 'Kamili' : 'Hazijakamilika', go: 'compliance' as Section },
    { label: 'Mkataba', ok: contractSigned, value: contractSigned ? 'Umesainiwa' : 'Haujasainiwa', go: 'compliance' as Section },
    { label: 'Bidhaa', ok: d.productCount > 0, value: d.productCount > 0 ? `${d.productCount} bidhaa` : 'Hakuna bidhaa bado', go: 'products' as Section },
    { label: 'Mauzo siku 30', ok: d.sales.length > 0, value: d.sales.length > 0 ? `${d.sales.length} · ${fmt(sales30)}` : 'Hakuna mauzo bado', go: 'sales' as Section },
  ];

  const nav: { key: Section; label: string; icon: any; count?: number }[] = [
    { key: 'overview', label: 'Muhtasari', icon: LayoutDashboard },
    { key: 'people', label: 'Watu', icon: Users, count: d.staff.length + 1 },
    { key: 'branches', label: 'Matawi', icon: Store, count: d.branchCount },
    { key: 'billing', label: 'Usajili', icon: CreditCard },
    { key: 'compliance', label: 'Sheria', icon: Scale },
    { key: 'sales', label: 'Mauzo', icon: ShoppingCart, count: d.sales.length },
    { key: 'products', label: 'Bidhaa', icon: Package, count: d.productCount },
    { key: 'permissions', label: 'Ruhusa', icon: KeyRound },
    { key: 'activity', label: 'Shughuli', icon: Activity },
  ];

  const Person = ({ x, role }: { x: any; role: string }) => (
    <div className="rounded-3xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{x?.full_name || x?.email || '—'}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><Mail className="h-3 w-3 shrink-0" />{x?.email || '—'}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><Phone className="h-3 w-3 shrink-0" />{x?.phone || 'Hakuna simu'}</p>
        </div>
        <Badge variant={x?.is_active === false ? 'secondary' : 'default'} className="shrink-0 text-[10px]">{role}{x?.is_active === false ? ' · amezimwa' : ''}</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" className="h-9 rounded-full" onClick={() => p.onPassword(x.id, x.full_name || x.email)}><Key className="mr-1 h-3.5 w-3.5" />Nenosiri</Button>
        <Button size="sm" variant="secondary" className="h-9 rounded-full" onClick={() => p.onEditContact(x.id, x.full_name || x.email, x.email || '', x.phone || '')}><Pencil className="mr-1 h-3.5 w-3.5" />Email/Simu</Button>
        {x?.phone && <Button size="sm" variant="outline" className="h-9 rounded-full" asChild><a href={wa(x.phone)} target="_blank" rel="noreferrer">WhatsApp</a></Button>}
      </div>
    </div>
  );

  const Empty = ({ text, children }: { text: string; children?: React.ReactNode }) => (
    <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
  );

  const Mark = ({ ok }: { ok: boolean }) => ok
    ? <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
    : <XCircle className="h-5 w-5 shrink-0 text-destructive" />;

  return (
    <div className="space-y-4">
      {/* Business header */}
      <div className="rounded-3xl border border-border bg-card p-4 md:flex md:items-center md:justify-between md:gap-4 md:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Building2 className="h-6 w-6" /></div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold md:text-xl">{name}</h3>
            <p className="truncate text-xs text-muted-foreground">{d.owner?.full_name} · {[d.biz?.region, d.biz?.district].filter(Boolean).join(', ') || 'Eneo halijawekwa'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant={subActive ? 'default' : 'destructive'} className="text-[10px]">{subActive ? `Usajili: ${SUB_LABEL[subStatus] || subStatus}` : 'Usajili haujalipwa'}</Badge>
              <Badge variant="secondary" className="text-[10px]">{d.branchCount === 0 ? 'Haina matawi' : `Matawi ${d.branchCount}`}</Badge>
              {blocked && <Badge variant="destructive" className="text-[10px]">Imezuiwa</Badge>}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 md:mt-0 md:flex md:shrink-0">
          <Button size="sm" className="h-10 rounded-full" onClick={() => p.onDossier(p.ownerId)}><FileText className="mr-1 h-4 w-4" />Jalada</Button>
          <Button size="sm" variant="outline" className="h-10 rounded-full" onClick={p.onExit}><LogOut className="mr-1 h-4 w-4" />Toka</Button>
          <Button size="sm" variant="ghost" className="h-10 rounded-full text-destructive hover:text-destructive" onClick={() => p.onDelete(p.ownerId, name)}><Trash2 className="mr-1 h-4 w-4" />Futa</Button>
        </div>
      </div>

      <div className="md:grid md:grid-cols-[220px_1fr] md:gap-4">
        {/* Section navigation: horizontal chips on phone, list on desktop */}
        <nav className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 md:mx-0 md:mb-0 md:flex-col md:overflow-visible md:px-0">
          {nav.map((n) => (
            <button key={n.key} type="button" onClick={() => setSection(n.key)}
              className={cn('flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors md:h-11 md:w-full md:rounded-2xl',
                section === n.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40')}>
              <n.icon className="h-4 w-4" /><span>{n.label}</span>
              {n.count !== undefined && <span className={cn('ml-auto rounded-full px-1.5 text-[10px]', section === n.key ? 'bg-primary-foreground/20' : 'bg-muted')}>{n.count}</span>}
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-4">
          {section === 'overview' && (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  { l: 'Mapato siku 30', v: fmt(sales30), go: 'sales' },
                  { l: 'Bidhaa', v: d.productCount, go: 'products' },
                  { l: 'Watu', v: d.staff.length + 1, go: 'people' },
                  { l: 'Wateja', v: d.customerCount, go: 'sales' },
                ].map((k) => (
                  <button key={k.l} type="button" onClick={() => setSection(k.go as Section)} className="rounded-3xl border border-border bg-card p-4 text-left transition hover:border-primary/40">
                    <p className="truncate text-xl font-bold">{k.v}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{k.l}</p>
                  </button>
                ))}
              </div>

              <div className="rounded-3xl border border-border bg-card p-4">
                <p className="mb-3 text-sm font-semibold">Hali ya biashara</p>
                <div className="divide-y divide-border">
                  {checks.map((c) => (
                    <button key={c.label} type="button" onClick={() => setSection(c.go)} className="flex w-full items-center gap-3 py-3 text-left">
                      <Mark ok={c.ok} />
                      <span className="flex-1 text-sm font-medium">{c.label}</span>
                      <span className={cn('text-right text-xs', c.ok ? 'text-muted-foreground' : 'text-destructive')}>{c.value}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card p-4">
                <p className="mb-3 text-sm font-semibold">Mauzo siku 14 zilizopita</p>
                {d.sales.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{name} bado haijarekodi mauzo.</p>
                ) : (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chart}>
                        <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} interval={1} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </>
          )}

          {section === 'people' && (
            <>
              <p className="text-xs text-muted-foreground">Mmiliki 1 na wasaidizi {d.staff.length}. Badili nenosiri au mawasiliano moja kwa moja.</p>
              <Person x={d.owner} role="Mmiliki" />
              {d.staff.length === 0 ? <Empty text="Biashara hii haina wasaidizi." /> : d.staff.map((s: any) => <Person key={s.id} x={s} role="Msaidizi" />)}
            </>
          )}

          {section === 'branches' && (
            d.branchCount === 0 && !addingBranch ? (
              <Empty text={`${name} haina matawi. Ina duka kuu pekee.`}>
                <Button className="rounded-full" onClick={() => setAddingBranch(true)}><Plus className="mr-1 h-4 w-4" />Ongeza tawi</Button>
              </Empty>
            ) : <AdminBranchesPanel ownerId={p.ownerId} />
          )}

          {section === 'billing' && (
            <div className="rounded-3xl border border-border bg-card p-4">
              {!d.sub ? <p className="text-sm text-muted-foreground">Hakuna rekodi ya usajili kwa biashara hii.</p> : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Usajili wa biashara</p>
                    <Badge variant={subActive ? 'default' : 'destructive'}>{SUB_LABEL[subStatus] || subStatus}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Ada ya mwezi</p><p className="font-bold">{fmt(d.sub.calculated_fee || d.sub.payment_amount)}</p></div>
                    <div className="rounded-2xl bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Inaisha</p><p className="font-bold">{dateTz(subEnd)}</p></div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Ada inatozwa kwa biashara, si kwa kila mtumiaji.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {subStatus === 'active'
                      ? <Button variant="destructive" className="rounded-full" onClick={() => p.onSuspend(d.sub.id)}>Sitisha usajili</Button>
                      : <Button className="rounded-full" onClick={() => p.onActivate(d.sub.id)}>Washa usajili</Button>}
                    <Button variant="outline" className="rounded-full" onClick={() => p.onEditFee(d.sub)}><Pencil className="mr-1 h-4 w-4" />Badili ada</Button>
                  </div>
                </>
              )}
            </div>
          )}

          {section === 'compliance' && (
            <>
              <div className="rounded-3xl border border-border bg-card p-4">
                <p className="mb-2 text-sm font-semibold">Taarifa za kisheria</p>
                <div className="divide-y divide-border text-sm">
                  {[
                    { l: 'TIN', v: d.comp?.tin_number },
                    { l: 'NIDA', v: d.comp?.nida_number },
                    { l: 'Leseni ya biashara', v: d.comp?.business_license },
                  ].map((r) => (
                    <div key={r.l} className="flex items-center gap-3 py-3">
                      <Mark ok={!!r.v} /><span className="flex-1">{r.l}</span>
                      <span className={cn('text-xs', r.v ? 'text-muted-foreground' : 'text-destructive')}>{r.v || 'Haijawekwa'}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 py-3">
                    <Mark ok={!!contractSigned} /><span className="flex-1">Mkataba</span>
                    <span className="text-xs text-muted-foreground">{contractSigned ? `Umesainiwa ${dateTz(d.contract?.signed_at)}` : 'Haujasainiwa'}</span>
                  </div>
                  <div className="flex items-center gap-3 py-3">
                    <Mark ok={!blocked} /><span className="flex-1">Hali ya akaunti</span>
                    <span className="text-xs text-muted-foreground">{blocked ? `Imezuiwa${d.comp?.block_until ? ` hadi ${dateTz(d.comp.block_until)}` : ''}` : 'Iko wazi'}</span>
                  </div>
                </div>
              </div>
              <p className="px-1 text-xs font-semibold text-muted-foreground">Vitendo: zuia/fungua akaunti au tuma mkataba upya</p>
              <AdminCompliancePanel ownerId={p.ownerId} compact />
            </>
          )}

          {section === 'sales' && (
            d.sales.length === 0 ? <Empty text={`${name} haijarekodi mauzo siku 30 zilizopita.`} /> : (
              <div className="rounded-3xl border border-border bg-card p-2">
                {d.sales.slice(0, 30).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-sm">
                    <span className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString('sw-TZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-xs text-muted-foreground">{s.payment_method || '—'}</span>
                    <span className="font-semibold">{fmt(s.total_amount)}</span>
                  </div>
                ))}
              </div>
            )
          )}

          {section === 'products' && (
            d.products.length === 0 ? <Empty text={`${name} bado haijaweka bidhaa.`} /> : (
              <div className="rounded-3xl border border-border bg-card p-2">
                {d.products.map((x: any) => {
                  const low = (x.stock_quantity || 0) <= (x.low_stock_threshold ?? 5);
                  return (
                    <div key={x.id} className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-sm">
                      <span className="min-w-0 flex-1 truncate font-medium">{x.name}</span>
                      <span className={cn('text-xs', low ? 'text-destructive' : 'text-muted-foreground')}>Stock {x.stock_quantity ?? 0}</span>
                      <span className="w-24 text-right font-semibold">{fmt(x.price)}</span>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {section === 'permissions' && (d.staff.length === 0
            ? <Empty text="Hakuna wasaidizi, hivyo hakuna ruhusa za kusimamia." />
            : <AdminAssistantPermissions ownerId={p.ownerId} />)}

          {section === 'activity' && <AdminUserActivities userIds={[p.ownerId, ...d.staff.map((s: any) => s.id)]} />}
        </div>
      </div>
    </div>
  );
};

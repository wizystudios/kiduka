import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MasterDetailLayout } from '@/components/MasterDetailLayout';
import { toast } from 'sonner';
import { Plus, Save, Search, Store, Trash2 } from 'lucide-react';

const FEATURES = [
  { key: 'products', label: 'Bidhaa' },
  { key: 'sales', label: 'Mauzo, Ankara, Malipo' },
  { key: 'inventory', label: 'Stoo' },
  { key: 'customers', label: 'Wateja, Mikopo' },
  { key: 'expenses', label: 'Matumizi' },
  { key: 'reports', label: 'Ripoti, Uhasibu' },
];
const ALL_ON = Object.fromEntries(FEATURES.map((f) => [f.key, true]));

type Row = {
  id?: string; owner_id: string; branch_name: string; branch_type: string;
  region: string | null; district: string | null; street: string | null;
  is_active: boolean; features: Record<string, boolean>;
  subscription_amount: number; subscription_status: string;
};
type Owner = { id: string; business_name: string | null; email: string | null };

export function AdminBranchesPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [sel, setSel] = useState<Row | null>(null);
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: b }, { data: o }] = await Promise.all([
      supabase.from('business_branches').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, business_name, email').not('business_name', 'is', null).order('business_name'),
    ]);
    setRows((b as any[] || []).map((r) => ({ ...r, features: { ...ALL_ON, ...(r.features || {}) } })));
    setOwners((o as Owner[]) || []);
  };
  useEffect(() => { load(); }, []);

  const ownerName = (id: string) => owners.find((o) => o.id === id)?.business_name || 'Biashara';
  const list = useMemo(() => rows.filter((r) => {
    const t = q.trim().toLowerCase();
    return !t || r.branch_name.toLowerCase().includes(t) || ownerName(r.owner_id).toLowerCase().includes(t);
  }), [rows, q, owners]);

  const save = async () => {
    if (!sel) return;
    if (!sel.owner_id || !sel.branch_name.trim()) return toast.error('Chagua biashara na andika jina la tawi');
    setSaving(true);
    const payload = {
      owner_id: sel.owner_id, branch_name: sel.branch_name.trim(), branch_type: sel.branch_type,
      region: sel.region, district: sel.district, street: sel.street, is_active: sel.is_active,
      features: sel.features, subscription_amount: Number(sel.subscription_amount) || 0,
      subscription_status: sel.subscription_status,
    };
    const res = sel.id
      ? await supabase.from('business_branches').update(payload).eq('id', sel.id).select('*').maybeSingle()
      : await supabase.from('business_branches').insert(payload).select('*').maybeSingle();
    setSaving(false);
    if (res.error || !res.data) return toast.error(res.error?.message || 'Haikuhifadhiwa');
    toast.success('Tawi limehifadhiwa');
    await load();
    setSel({ ...(res.data as any), features: { ...ALL_ON, ...((res.data as any).features || {}) } });
  };

  const remove = async () => {
    if (!sel?.id || !confirm(`Futa tawi "${sel.branch_name}"?`)) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from('business_branches')
      .update({ deleted_at: new Date().toISOString(), deleted_by: u.user?.id, is_active: false, delete_reason: 'Imefutwa na msimamizi' })
      .eq('id', sel.id);
    if (error) return toast.error(error.message);
    toast.success('Tawi limefutwa');
    setSel(null); load();
  };

  const set = (patch: Partial<Row>) => setSel((p) => (p ? { ...p, ...patch } : p));

  const detail = sel && (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold">{sel.branch_name || 'Tawi jipya'}</h2>
        <p className="text-xs text-muted-foreground">{sel.owner_id ? ownerName(sel.owner_id) : 'Chagua biashara'}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Biashara kuu</Label>
          <Select value={sel.owner_id} onValueChange={(v) => set({ owner_id: v })} disabled={!!sel.id}>
            <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Chagua biashara" /></SelectTrigger>
            <SelectContent>{owners.map((o) => <SelectItem key={o.id} value={o.id}>{o.business_name} · {o.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Jina la tawi</Label><Input className="rounded-2xl" value={sel.branch_name} onChange={(e) => set({ branch_name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Mkoa</Label><Input className="rounded-2xl" value={sel.region || ''} onChange={(e) => set({ region: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Wilaya</Label><Input className="rounded-2xl" value={sel.district || ''} onChange={(e) => set({ district: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Mtaa</Label><Input className="rounded-2xl" value={sel.street || ''} onChange={(e) => set({ street: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Ada ya mwezi (TSh)</Label><Input type="number" className="rounded-2xl" value={sel.subscription_amount} onChange={(e) => set({ subscription_amount: Number(e.target.value) })} /></div>
        <div className="space-y-1.5">
          <Label>Hali ya ada</Label>
          <Select value={sel.subscription_status} onValueChange={(v) => set({ subscription_status: v })}>
            <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Inasubiri</SelectItem>
              <SelectItem value="active">Imelipwa</SelectItem>
              <SelectItem value="expired">Imeisha</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Huduma zinazoruhusiwa tawini</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <label key={f.key} className="flex items-center justify-between rounded-2xl border border-border/60 px-3 py-2.5 text-sm">
              {f.label}
              <Switch checked={sel.features[f.key] !== false} onCheckedChange={(v) => set({ features: { ...sel.features, [f.key]: v } })} />
            </label>
          ))}
          <label className="flex items-center justify-between rounded-2xl border border-border/60 px-3 py-2.5 text-sm">
            Tawi hai
            <Switch checked={sel.is_active} onCheckedChange={(v) => set({ is_active: v })} />
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 rounded-full" onClick={save} disabled={saving}><Save className="mr-1 h-4 w-4" />Hifadhi</Button>
        {sel.id && <Button variant="destructive" className="rounded-full" onClick={remove}><Trash2 className="mr-1 h-4 w-4" />Futa</Button>}
      </div>
    </div>
  );

  const listEl = (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tafuta tawi au biashara" className="rounded-2xl pl-9" />
        </div>
        <Button size="icon" className="rounded-full" aria-label="Ongeza tawi" onClick={() => setSel({
          owner_id: '', branch_name: '', branch_type: 'custom', region: '', district: '', street: '',
          is_active: true, features: { ...ALL_ON }, subscription_amount: 15000, subscription_status: 'pending',
        })}><Plus className="h-4 w-4" /></Button>
      </div>
      {list.map((r) => (
        <button key={r.id} onClick={() => setSel(r)}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-muted/60 ${sel?.id === r.id ? 'bg-primary/10' : ''}`}>
          <Store className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{r.branch_name} {r.is_active && <Badge className="ml-1 text-[9px]">Hai</Badge>}</p>
            <p className="truncate text-[11px] text-muted-foreground">{ownerName(r.owner_id)}</p>
          </div>
          <span className="text-xs font-medium">TSh {Number(r.subscription_amount).toLocaleString()}</span>
        </button>
      ))}
      {list.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Hakuna matawi.</p>}
      {/* Mobile: edit form under the list */}
      {sel && <div className="border-t border-border/60 pt-4 md:hidden">{detail}</div>}
    </div>
  );

  return <MasterDetailLayout list={listEl} detail={detail} hasSelection={!!sel} emptyText="Chagua tawi au bonyeza + kuongeza jipya." />;
}

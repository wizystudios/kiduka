import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Check } from 'lucide-react';
import { PERMISSION_GROUPS, PERMISSION_PRESETS, mergePermissionRow, splitPermissions } from '@/lib/permissionCatalog';

interface Assistant { id: string; email: string; full_name: string }

/** Owner (or super admin via ownerId) grants each owner action to an assistant. Changes save instantly. */
export const AssistantPermissionsManager = ({ ownerId }: { ownerId?: string }) => {
  const { user } = useAuth();
  const owner = ownerId || user?.id;
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>(mergePermissionRow(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  useEffect(() => {
    if (!owner) return;
    (async () => {
      setLoading(true);
      const { data: rows, error } = await supabase.from('assistant_permissions').select('assistant_id').eq('owner_id', owner);
      if (error) { toast.error('Imeshindwa kupakia wasaidizi'); setLoading(false); return; }
      const ids = (rows || []).map(r => r.assistant_id);
      if (!ids.length) { setAssistants([]); setLoading(false); return; }
      const { data } = await supabase.from('profiles').select('id, email, full_name').in('id', ids);
      setAssistants((data || []) as Assistant[]);
      if (data?.[0]) setSelected(s => s || data[0].id);
      setLoading(false);
    })();
  }, [owner]);

  useEffect(() => {
    if (!owner || !selected) return;
    let current = true;
    setLoadingPermissions(true); setPerms(mergePermissionRow(null));
    supabase.from('assistant_permissions').select('*').eq('owner_id', owner).eq('assistant_id', selected).maybeSingle()
      .then(({ data, error }) => {
        if (!current) return;
        if (error || !data) { toast.error('Imeshindwa kupakia ruhusa'); return; }
        setPerms(mergePermissionRow(data as Record<string, unknown>)); setLoadingPermissions(false);
      });
    return () => { current = false; };
  }, [owner, selected]);

  const save = async (next: Record<string, boolean>) => {
    if (!owner || !selected || saving || loadingPermissions) return;
    const prev = perms;
    setPerms(next); setSaving(true);
    const { data, error } = await supabase.from('assistant_permissions')
      .update({ ...splitPermissions(next), updated_at: new Date().toISOString() } as never)
      .eq('owner_id', owner).eq('assistant_id', selected).select('id').maybeSingle();
    setSaving(false);
    if (error || !data) { setPerms(prev); toast.error('Imeshindwa kuhifadhi ruhusa'); }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!assistants.length) return <p className="p-6 text-center text-sm text-muted-foreground">Hakuna wasaidizi. Ongeza msaidizi kwanza kwenye kichupo cha Wasaidizi.</p>;

  const granted = Object.values(perms).filter(Boolean).length;
  const total = Object.keys(perms).length;

  return (
    <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {assistants.map(a => (
          <Button key={a.id} size="sm" variant={selected === a.id ? 'default' : 'outline'} className="shrink-0 rounded-full" disabled={saving} onClick={() => setSelected(a.id)}>
            {a.full_name || a.email}
          </Button>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Ruhusa {granted} kati ya {total}</span>
        <span className="flex items-center gap-1">{saving || loadingPermissions ? <><Loader2 className="h-3 w-3 animate-spin" />Inahifadhi</> : <><Check className="h-3 w-3 text-success" />Imehifadhiwa</>}</span>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Chagua kazi kwa haraka</p>
        <div className="flex flex-wrap gap-2">
          {PERMISSION_PRESETS.map(p => (
            <Button key={p.id} size="sm" variant="outline" className="rounded-full" disabled={saving || loadingPermissions} onClick={() => save(p.perms)}>{p.label}</Button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {PERMISSION_GROUPS.map(g => {
          const all = g.items.every(i => perms[i.key]);
          return (
            <section key={g.id} className="rounded-3xl border border-border/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{g.title}</h3>
                <button className="text-xs font-medium text-primary" disabled={saving || loadingPermissions}
                  onClick={() => save({ ...perms, ...Object.fromEntries(g.items.map(i => [i.key, !all])) })}>
                  {all ? 'Ondoa zote' : 'Ruhusu zote'}
                </button>
              </div>
              <div className="space-y-3">
                {g.items.map(i => (
                  <label key={i.key} className="flex items-center justify-between gap-3 text-sm">
                    <span>{i.label}</span>
                    <Switch checked={perms[i.key]} disabled={saving || loadingPermissions} onCheckedChange={v => save({ ...perms, [i.key]: v })} />
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">Kuongeza wasaidizi, matawi na usimamizi wa mfumo ni kwa mmiliki pekee.</p>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Store, Plus, Edit2, Trash2, Loader2, MapPin, Settings, Package, ShoppingCart, Users, FileText, Wallet, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Branch {
  id: string;
  branch_name: string;
  branch_type: string;
  region: string | null;
  district: string | null;
  ward: string | null;
  street: string | null;
  is_active: boolean;
  features: Record<string, boolean>;
  subscription_amount: number;
  subscription_status: string;
  subscription_expires_at: string | null;
  created_at: string;
}

const FEATURE_LIST = [
  { key: 'products', label: 'Bidhaa', icon: Package },
  { key: 'sales', label: 'Mauzo', icon: ShoppingCart },
  { key: 'inventory', label: 'Stoku', icon: Store },
  { key: 'customers', label: 'Wateja', icon: Users },
  { key: 'expenses', label: 'Matumizi', icon: Wallet },
  { key: 'reports', label: 'Ripoti', icon: BarChart3 },
];

const BRANCH_TYPES = [
  { value: 'full', label: 'Tawi Kamili - Huduma zote' },
  { value: 'sales_only', label: 'Tawi la Mauzo tu' },
  { value: 'warehouse', label: 'Ghala - Stoku tu' },
  { value: 'custom', label: 'Tawi Maalum - Chagua huduma' },
];

export const BranchManager = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState<Branch | null>(null);

  const [form, setForm] = useState({
    branch_name: '',
    branch_type: 'full',
    region: '',
    district: '',
    ward: '',
    street: '',
    features: { products: true, sales: true, inventory: true, customers: true, expenses: true, reports: true } as Record<string, boolean>,
  });

  useEffect(() => {
    if (user?.id) fetchBranches();
  }, [user?.id]);

  const fetchBranches = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('business_branches' as any)
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true });
    setBranches((data as any[] || []).map(b => ({ ...b, features: b.features || {} })));
    setLoading(false);
  };

  const applyTypeDefaults = (type: string) => {
    let features = { products: true, sales: true, inventory: true, customers: true, expenses: true, reports: true };
    if (type === 'sales_only') features = { products: true, sales: true, inventory: false, customers: true, expenses: false, reports: false };
    if (type === 'warehouse') features = { products: true, sales: false, inventory: true, customers: false, expenses: false, reports: true };
    setForm(prev => ({ ...prev, branch_type: type, features }));
  };

  const resetForm = () => {
    setForm({ branch_name: '', branch_type: 'full', region: '', district: '', ward: '', street: '', features: { products: true, sales: true, inventory: true, customers: true, expenses: true, reports: true } });
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !form.branch_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        owner_id: user.id,
        branch_name: form.branch_name.trim(),
        branch_type: form.branch_type,
        region: form.region || null,
        district: form.district || null,
        ward: form.ward || null,
        street: form.street || null,
        features: form.features,
      };

      if (editing) {
        const { error } = await supabase.from('business_branches' as any).update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Tawi limesasishwa!');
      } else {
        const { error } = await supabase.from('business_branches' as any).insert([payload]);
        if (error) throw error;
        toast.success('Tawi jipya limeundwa! Malipo: TSh 20,000/mwezi');
      }
      setDialogOpen(false);
      resetForm();
      fetchBranches();
    } catch (err: any) {
      toast.error(err.message || 'Imeshindwa');
    } finally { setSaving(false); }
  };

  const deleteBranch = async (id: string) => {
    if (!confirm('Una uhakika unataka kufuta tawi hili?')) return;
    const { error } = await supabase.from('business_branches' as any).delete().eq('id', id);
    if (!error) { toast.success('Tawi limefutwa'); fetchBranches(); }
  };

  const toggleBranch = async (branch: Branch) => {
    await supabase.from('business_branches' as any).update({ is_active: !branch.is_active }).eq('id', branch.id);
    fetchBranches();
  };

  const updateFeatures = async (branch: Branch, features: Record<string, boolean>) => {
    await supabase.from('business_branches' as any).update({ features }).eq('id', branch.id);
    toast.success('Huduma zimesasishwa');
    setSettingsDialog(null);
    fetchBranches();
  };

  const openEdit = (b: Branch) => {
    setEditing(b);
    setForm({
      branch_name: b.branch_name,
      branch_type: b.branch_type,
      region: b.region || '',
      district: b.district || '',
      ward: b.ward || '',
      street: b.street || '',
      features: b.features,
    });
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Matawi ya Biashara
          </h1>
          <p className="text-xs text-muted-foreground">Simamia matawi yako yote. Kila tawi: TSh 20,000/mwezi</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full" size="sm"><Plus className="h-4 w-4 mr-1" /> Tawi Jipya</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Hariri Tawi' : 'Ongeza Tawi Jipya'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label className="text-xs">Jina la Tawi *</Label>
                <Input value={form.branch_name} onChange={e => setForm({ ...form, branch_name: e.target.value })} className="rounded-2xl" required />
              </div>
              <div>
                <Label className="text-xs">Aina ya Tawi</Label>
                <Select value={form.branch_type} onValueChange={applyTypeDefaults}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BRANCH_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs">Mkoa</Label><Input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} className="rounded-2xl" /></div>
                <div><Label className="text-xs">Wilaya</Label><Input value={form.district} onChange={e => setForm({ ...form, district: e.target.value })} className="rounded-2xl" /></div>
                <div><Label className="text-xs">Kata</Label><Input value={form.ward} onChange={e => setForm({ ...form, ward: e.target.value })} className="rounded-2xl" /></div>
                <div><Label className="text-xs">Mtaa</Label><Input value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} className="rounded-2xl" /></div>
              </div>

              {form.branch_type === 'custom' && (
                <div>
                  <Label className="text-xs mb-2 block">Chagua Huduma</Label>
                  <div className="space-y-2">
                    {FEATURE_LIST.map(f => (
                      <div key={f.key} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <f.icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs">{f.label}</span>
                        </div>
                        <Switch
                          checked={form.features[f.key] ?? true}
                          onCheckedChange={v => setForm(prev => ({ ...prev, features: { ...prev.features, [f.key]: v } }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!editing && (
                <div className="bg-primary/5 rounded-2xl p-3 text-center">
                  <p className="text-sm font-bold text-primary">TSh 20,000/mwezi</p>
                  <p className="text-[10px] text-muted-foreground">Kila tawi lina gharama ya mwezi</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-full">Ghairi</Button>
                <Button type="submit" className="flex-1 rounded-full" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? 'Sasisha' : 'Unda Tawi'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {branches.length === 0 ? (
        <div className="text-center py-16">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">Bado huna matawi</p>
          <p className="text-xs text-muted-foreground mt-1">Ongeza matawi ya biashara yako ili usimamie kila eneo</p>
        </div>
      ) : (
        <div className="space-y-2">
          {branches.map(b => (
            <Card key={b.id} className="rounded-2xl border-border/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${b.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Store className={`h-4 w-4 ${b.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{b.branch_name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant={b.is_active ? 'default' : 'secondary'} className="text-[10px] rounded-full">
                        {b.is_active ? 'Hai' : 'Imezimwa'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] rounded-full">
                        {BRANCH_TYPES.find(t => t.value === b.branch_type)?.label.split(' - ')[0] || b.branch_type}
                      </Badge>
                      {b.region && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" /> {b.district || b.region}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {FEATURE_LIST.filter(f => b.features[f.key]).map(f => (
                        <f.icon key={f.key} className="h-3 w-3 text-muted-foreground" />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsDialog(b)}>
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteBranch(b.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Feature Settings Dialog */}
      {settingsDialog && (
        <Dialog open={!!settingsDialog} onOpenChange={() => setSettingsDialog(null)}>
          <DialogContent className="max-w-sm rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-sm">Huduma - {settingsDialog.branch_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {FEATURE_LIST.map(f => (
                <div key={f.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <f.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{f.label}</span>
                  </div>
                  <Switch
                    checked={settingsDialog.features[f.key] ?? true}
                    onCheckedChange={v => setSettingsDialog(prev => prev ? { ...prev, features: { ...prev.features, [f.key]: v } } : null)}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm">Tawi Hai</span>
                <Switch checked={settingsDialog.is_active} onCheckedChange={v => setSettingsDialog(prev => prev ? { ...prev, is_active: v } : null)} />
              </div>
              <Button className="w-full rounded-full" onClick={() => {
                if (settingsDialog) {
                  supabase.from('business_branches' as any).update({ features: settingsDialog.features, is_active: settingsDialog.is_active }).eq('id', settingsDialog.id).then(() => {
                    toast.success('Imesasishwa');
                    setSettingsDialog(null);
                    fetchBranches();
                  });
                }
              }}>Hifadhi</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

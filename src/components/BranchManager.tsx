import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Store, Plus, Edit2, Trash2, Loader2, MapPin, Settings, Package, 
  ShoppingCart, Users, FileText, Wallet, BarChart3, UserPlus, 
  ArrowRightLeft, Shield, X
} from 'lucide-react';
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

interface BranchStaff {
  id: string;
  branch_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  assigned_at: string;
  notes: string | null;
  // joined from profiles
  full_name?: string;
  email?: string;
  phone?: string;
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
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [branchStaff, setBranchStaff] = useState<BranchStaff[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [addStaffDialog, setAddStaffDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState<BranchStaff | null>(null);
  const [availableAssistants, setAvailableAssistants] = useState<any[]>([]);

  const [staffForm, setStaffForm] = useState({ email: '', role: 'staff', notes: '' });
  const [transferTarget, setTransferTarget] = useState('');

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

  useEffect(() => {
    if (selectedBranch) fetchBranchStaff(selectedBranch.id);
  }, [selectedBranch?.id]);

  const fetchBranches = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('business_branches')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true });
    setBranches((data as any[] || []).map(b => ({ ...b, features: typeof b.features === 'object' ? b.features : {} })));
    setLoading(false);
  };

  const fetchBranchStaff = async (branchId: string) => {
    setStaffLoading(true);
    const { data, error } = await supabase
      .from('branch_staff')
      .select('*')
      .eq('branch_id', branchId)
      .order('assigned_at', { ascending: false });

    if (data && data.length > 0) {
      const userIds = data.map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds);

      const enriched = data.map(s => ({
        ...s,
        full_name: profiles?.find(p => p.id === s.user_id)?.full_name || 'Unknown',
        email: profiles?.find(p => p.id === s.user_id)?.email || '',
        phone: profiles?.find(p => p.id === s.user_id)?.phone || '',
      }));
      setBranchStaff(enriched);
    } else {
      setBranchStaff([]);
    }
    setStaffLoading(false);
  };

  const fetchAvailableAssistants = async () => {
    if (!user?.id) return;
    // Get assistants linked to this owner
    const { data: perms } = await supabase
      .from('assistant_permissions')
      .select('assistant_id')
      .eq('owner_id', user.id);

    if (perms && perms.length > 0) {
      const ids = perms.map(p => p.assistant_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);
      setAvailableAssistants(profiles || []);
    } else {
      setAvailableAssistants([]);
    }
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
        const { error } = await supabase.from('business_branches').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Tawi limesasishwa!');
      } else {
        const { error } = await supabase.from('business_branches').insert([payload]);
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
    if (!confirm('Una uhakika unataka kufuta tawi hili? Wafanyakazi wote watatolewa.')) return;
    const { error } = await supabase.from('business_branches').delete().eq('id', id);
    if (!error) { 
      toast.success('Tawi limefutwa'); 
      if (selectedBranch?.id === id) setSelectedBranch(null);
      fetchBranches(); 
    }
  };

  const toggleBranch = async (branch: Branch) => {
    await supabase.from('business_branches').update({ is_active: !branch.is_active }).eq('id', branch.id);
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

  const handleAddStaff = async () => {
    if (!selectedBranch || !staffForm.email.trim()) return;
    setSaving(true);
    try {
      // Find user by email
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', staffForm.email.trim().toLowerCase())
        .maybeSingle();

      if (!profile) {
        toast.error('Mtumiaji huyu hajapatikana. Hakikisha amesajiliwa kwanza.');
        setSaving(false);
        return;
      }

      const { error } = await supabase.from('branch_staff').insert({
        branch_id: selectedBranch.id,
        user_id: profile.id,
        role: staffForm.role,
        assigned_by: user?.id,
        notes: staffForm.notes || null,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('Mtumiaji huyu tayari yuko kwenye tawi hili');
        } else {
          throw error;
        }
      } else {
        toast.success('Mfanyakazi ameongezwa kwenye tawi!');
        setAddStaffDialog(false);
        setStaffForm({ email: '', role: 'staff', notes: '' });
        fetchBranchStaff(selectedBranch.id);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  const handleRemoveStaff = async (staffId: string) => {
    if (!confirm('Ondoa mfanyakazi kutoka tawi hili?')) return;
    const { error } = await supabase.from('branch_staff').delete().eq('id', staffId);
    if (!error && selectedBranch) {
      toast.success('Mfanyakazi ameondolewa');
      fetchBranchStaff(selectedBranch.id);
    }
  };

  const handleToggleStaffActive = async (staff: BranchStaff) => {
    await supabase.from('branch_staff').update({ is_active: !staff.is_active }).eq('id', staff.id);
    if (selectedBranch) fetchBranchStaff(selectedBranch.id);
  };

  const handleTransferStaff = async () => {
    if (!transferDialog || !transferTarget) return;
    setSaving(true);
    try {
      // Add to new branch
      const { error: insertErr } = await supabase.from('branch_staff').insert({
        branch_id: transferTarget,
        user_id: transferDialog.user_id,
        role: transferDialog.role,
        assigned_by: user?.id,
        notes: `Amehamishwa kutoka tawi lingine`,
      });

      if (insertErr && insertErr.code === '23505') {
        // Already in target branch, just update
        await supabase.from('branch_staff')
          .update({ is_active: true })
          .eq('branch_id', transferTarget)
          .eq('user_id', transferDialog.user_id);
      } else if (insertErr) {
        throw insertErr;
      }

      toast.success(`${transferDialog.full_name} amehamishwa!`);
      setTransferDialog(null);
      setTransferTarget('');
      if (selectedBranch) fetchBranchStaff(selectedBranch.id);
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  const handleChangeStaffRole = async (staffId: string, newRole: string) => {
    await supabase.from('branch_staff').update({ role: newRole }).eq('id', staffId);
    if (selectedBranch) fetchBranchStaff(selectedBranch.id);
    toast.success('Jukumu limebadilishwa');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
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
        <Tabs defaultValue="branches">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="branches">Matawi ({branches.length})</TabsTrigger>
            <TabsTrigger value="staff">Wafanyakazi</TabsTrigger>
          </TabsList>

          {/* Branches List */}
          <TabsContent value="branches" className="space-y-2 mt-3">
            {branches.map(b => (
              <Card key={b.id} className={`rounded-2xl border-border/50 cursor-pointer transition-colors ${selectedBranch?.id === b.id ? 'border-primary bg-primary/5' : ''}`}
                onClick={() => setSelectedBranch(b)}>
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
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
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
          </TabsContent>

          {/* Staff Management */}
          <TabsContent value="staff" className="space-y-3 mt-3">
            {!selectedBranch ? (
              <div className="text-center py-12">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">Chagua tawi kwanza kutoka tab ya "Matawi"</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary" />
                      {selectedBranch.branch_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{branchStaff.length} wafanyakazi</p>
                  </div>
                  <Button size="sm" className="rounded-full" onClick={() => { setAddStaffDialog(true); fetchAvailableAssistants(); }}>
                    <UserPlus className="h-4 w-4 mr-1" /> Ongeza
                  </Button>
                </div>

                {staffLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : branchStaff.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Tawi hili halina wafanyakazi bado</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {branchStaff.map(s => (
                      <Card key={s.id} className="rounded-2xl">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold ${s.role === 'manager' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                              {(s.full_name || '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{s.full_name}</p>
                                <Badge variant={s.role === 'manager' ? 'default' : 'outline'} className="text-[10px] rounded-full">
                                  {s.role === 'manager' ? 'Meneja' : 'Mfanyakazi'}
                                </Badge>
                                {!s.is_active && <Badge variant="secondary" className="text-[10px]">Imezimwa</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground">{s.email}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Select value={s.role} onValueChange={v => handleChangeStaffRole(s.id, v)}>
                                <SelectTrigger className="h-7 w-20 text-[10px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="manager">Meneja</SelectItem>
                                  <SelectItem value="staff">Staff</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Hamisha"
                                onClick={() => setTransferDialog(s)}>
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" 
                                onClick={() => handleToggleStaffActive(s)}>
                                <Shield className={`h-3.5 w-3.5 ${s.is_active ? 'text-green-600' : 'text-muted-foreground'}`} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7"
                                onClick={() => handleRemoveStaff(s.id)}>
                                <X className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Add Staff Dialog */}
      <Dialog open={addStaffDialog} onOpenChange={setAddStaffDialog}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Ongeza Mfanyakazi - {selectedBranch?.branch_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {availableAssistants.length > 0 && (
              <div>
                <Label className="text-xs">Chagua Msaidizi Aliyepo</Label>
                <Select onValueChange={v => setStaffForm(p => ({ ...p, email: v }))}>
                  <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Chagua..." /></SelectTrigger>
                  <SelectContent>
                    {availableAssistants.map(a => (
                      <SelectItem key={a.id} value={a.email}>{a.full_name || a.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">Au andika email hapa chini</p>
              </div>
            )}
            <div>
              <Label className="text-xs">Email ya Mfanyakazi *</Label>
              <Input value={staffForm.email} onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))} className="rounded-2xl" placeholder="email@example.com" />
            </div>
            <div>
              <Label className="text-xs">Jukumu</Label>
              <Select value={staffForm.role} onValueChange={v => setStaffForm(p => ({ ...p, role: v }))}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Meneja wa Tawi</SelectItem>
                  <SelectItem value="staff">Mfanyakazi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Maelezo</Label>
              <Input value={staffForm.notes} onChange={e => setStaffForm(p => ({ ...p, notes: e.target.value }))} className="rounded-2xl" placeholder="Maelezo ya ziada..." />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddStaffDialog(false)} className="rounded-full">Ghairi</Button>
            <Button onClick={handleAddStaff} disabled={saving || !staffForm.email} className="rounded-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ongeza'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Staff Dialog */}
      <Dialog open={!!transferDialog} onOpenChange={() => setTransferDialog(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Hamisha Mfanyakazi</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-xl">
              <p className="text-xs text-muted-foreground">Mfanyakazi</p>
              <p className="font-medium text-sm">{transferDialog?.full_name}</p>
            </div>
            <div>
              <Label className="text-xs">Tawi la Kupeleka</Label>
              <Select value={transferTarget} onValueChange={setTransferTarget}>
                <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Chagua tawi..." /></SelectTrigger>
                <SelectContent>
                  {branches.filter(b => b.id !== selectedBranch?.id).map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Mfanyakazi ataongezwa kwenye tawi jipya na atabaki kwenye tawi la sasa (multi-branch access).
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTransferDialog(null)} className="rounded-full">Ghairi</Button>
            <Button onClick={handleTransferStaff} disabled={saving || !transferTarget} className="rounded-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Hamisha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  supabase.from('business_branches').update({ features: settingsDialog.features, is_active: settingsDialog.is_active }).eq('id', settingsDialog.id).then(() => {
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

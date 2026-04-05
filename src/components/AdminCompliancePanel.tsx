import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Lock, Unlock,
  Send, Search, Building2, FileText, RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { AdminPasswordDialog } from './AdminPasswordDialog';

interface ComplianceRecord {
  id: string;
  owner_id: string;
  tin_number: string | null;
  nida_number: string | null;
  business_license: string | null;
  block_mode: string;
  block_until: string | null;
  required_after: string;
  completed_at: string | null;
  notes: string | null;
  // enriched
  full_name?: string;
  business_name?: string;
  email?: string;
}

interface ContractRecord {
  id: string;
  owner_id: string;
  status: string;
  agreed_terms: boolean;
  signed_at: string | null;
  expires_at: string | null;
  required_by: string | null;
  review_later_until: string | null;
  admin_notes: string | null;
  full_legal_name: string | null;
  // enriched
  full_name?: string;
  business_name?: string;
  email?: string;
}

export const AdminCompliancePanel = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>([]);
  const [contractRecords, setContractRecords] = useState<ContractRecord[]>([]);
  const [blockDialog, setBlockDialog] = useState<{ record: ComplianceRecord } | null>(null);
  const [blockMode, setBlockMode] = useState<string>('temporary');
  const [blockDuration, setBlockDuration] = useState<string>('7_days');
  const [blockNotes, setBlockNotes] = useState('');
  const [contractDialog, setContractDialog] = useState<{ record: ContractRecord } | null>(null);
  const [contractNotes, setContractNotes] = useState('');
  const [contractRequiredBy, setContractRequiredBy] = useState('14_days');
  const [passwordDialog, setPasswordDialog] = useState<{ action: string; callback: () => void } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [compRes, contractRes, profilesRes, rolesRes] = await Promise.all([
        supabase.from('business_compliance').select('*').order('created_at', { ascending: false }),
        supabase.from('business_contracts').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, business_name, email'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      const profiles = profilesRes.data || [];
      const roles = rolesRes.data || [];
      
      // Only get owner user IDs (not assistants or super_admins)
      const ownerIds = new Set(
        roles.filter(r => r.role === 'owner').map(r => r.user_id)
      );
      
      const enrich = (ownerId: string) => {
        const p = profiles.find(pr => pr.id === ownerId);
        return { full_name: p?.full_name || '', business_name: p?.business_name || '', email: p?.email || '' };
      };

      // Filter to only show business owners
      setComplianceRecords(
        (compRes.data || [])
          .filter(c => ownerIds.has(c.owner_id))
          .map(c => ({ ...c, ...enrich(c.owner_id) }))
      );
      setContractRecords(
        (contractRes.data || [])
          .filter(c => ownerIds.has(c.owner_id))
          .map(c => ({ ...c, ...enrich(c.owner_id) }))
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleBlock = (record: ComplianceRecord) => {
    setBlockDialog({ record });
    setBlockMode(record.block_mode || 'none');
    setBlockNotes(record.notes || '');
  };

  const executeBlock = async () => {
    if (!blockDialog || !user?.id) return;

    let blockUntil: string | null = null;
    if (blockMode === 'temporary') {
      const d = new Date();
      switch (blockDuration) {
        case '1_day': d.setDate(d.getDate() + 1); break;
        case '3_days': d.setDate(d.getDate() + 3); break;
        case '7_days': d.setDate(d.getDate() + 7); break;
        case '14_days': d.setDate(d.getDate() + 14); break;
        case '30_days': d.setDate(d.getDate() + 30); break;
        case '90_days': d.setDate(d.getDate() + 90); break;
        case '1_year': d.setFullYear(d.getFullYear() + 1); break;
      }
      blockUntil = d.toISOString();
    }

    try {
      const { error } = await supabase
        .from('business_compliance')
        .update({
          block_mode: blockMode,
          block_until: blockMode === 'temporary' ? blockUntil : null,
          enforced_by: user.id,
          notes: blockNotes || null,
        })
        .eq('id', blockDialog.record.id);

      if (error) throw error;
      toast.success(blockMode === 'none' ? 'Akaunti imefunguliwa' : 'Akaunti imezuiwa');
      setBlockDialog(null);
      fetchData();
    } catch (err: any) {
      toast.error(`Imeshindwa: ${err.message}`);
    }
  };

  const handleResendContract = (record: ContractRecord) => {
    setContractDialog({ record });
    setContractNotes(record.admin_notes || '');
  };

  const executeResendContract = async () => {
    if (!contractDialog) return;

    let requiredBy: string | null = null;
    const d = new Date();
    switch (contractRequiredBy) {
      case '3_days': d.setDate(d.getDate() + 3); break;
      case '7_days': d.setDate(d.getDate() + 7); break;
      case '14_days': d.setDate(d.getDate() + 14); break;
      case '30_days': d.setDate(d.getDate() + 30); break;
    }
    requiredBy = d.toISOString();

    try {
      const { error } = await supabase
        .from('business_contracts')
        .update({
          status: 'pending',
          required_by: requiredBy,
          review_later_until: null,
          admin_notes: contractNotes || null,
        })
        .eq('id', contractDialog.record.id);

      if (error) throw error;
      toast.success('Mkataba umetumwa upya');
      setContractDialog(null);
      fetchData();
    } catch (err: any) {
      toast.error(`Imeshindwa: ${err.message}`);
    }
  };

  const getComplianceStatus = (r: ComplianceRecord) => {
    if (r.completed_at) return { label: 'Kamili', color: 'bg-green-100 text-green-800' };
    if (r.block_mode === 'permanent') return { label: 'Imezuiwa (Kudumu)', color: 'bg-red-100 text-red-800' };
    if (r.block_mode === 'temporary' && r.block_until && new Date(r.block_until) > new Date()) {
      return { label: 'Imezuiwa (Muda)', color: 'bg-orange-100 text-orange-800' };
    }
    const overdue = new Date(r.required_after) < new Date();
    if (overdue) return { label: 'Imeisha Muda', color: 'bg-red-100 text-red-800' };
    return { label: 'Inasubiri', color: 'bg-yellow-100 text-yellow-800' };
  };

  const getContractStatus = (r: ContractRecord) => {
    if (r.status === 'signed' && r.agreed_terms) return { label: 'Imesainiwa', color: 'bg-green-100 text-green-800' };
    if (r.required_by && new Date(r.required_by) < new Date()) return { label: 'Imeisha Muda', color: 'bg-red-100 text-red-800' };
    return { label: 'Inasubiri', color: 'bg-yellow-100 text-yellow-800' };
  };

  const filteredCompliance = complianceRecords.filter(r =>
    r.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContracts = contractRecords.filter(r =>
    r.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const complianceStats = {
    total: complianceRecords.length,
    complete: complianceRecords.filter(r => r.completed_at).length,
    blocked: complianceRecords.filter(r => r.block_mode !== 'none').length,
    overdue: complianceRecords.filter(r => !r.completed_at && new Date(r.required_after) < new Date()).length,
  };

  const contractStats = {
    total: contractRecords.length,
    signed: contractRecords.filter(r => r.status === 'signed').length,
    pending: contractRecords.filter(r => r.status !== 'signed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{complianceStats.total}</p>
            <p className="text-xs text-muted-foreground">Biashara</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-600">{complianceStats.complete}</p>
            <p className="text-xs text-muted-foreground">Kamili</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-red-600">{complianceStats.overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-orange-600">{complianceStats.blocked}</p>
            <p className="text-xs text-muted-foreground">Zimezuiwa</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{contractStats.total}</p>
            <p className="text-xs text-muted-foreground">Mikataba</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-600">{contractStats.signed}</p>
            <p className="text-xs text-muted-foreground">Imesainiwa</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-yellow-600">{contractStats.pending}</p>
            <p className="text-xs text-muted-foreground">Inasubiri</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tafuta biashara..."
          className="pl-10"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Compliance Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Kuzingatia Sheria (TIN / NIDA / Leseni) — {filteredCompliance.length} biashara
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCompliance.map(r => {
              const status = getComplianceStatus(r);
              return (
                <Card key={r.id} className="border">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{r.business_name || r.full_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                      </div>
                      <Badge className={`${status.color} whitespace-nowrap`}>{status.label}</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        {r.tin_number ? <CheckCircle className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-red-400" />}
                        <span>TIN</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {r.nida_number ? <CheckCircle className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-red-400" />}
                        <span>NIDA</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {r.business_license ? <CheckCircle className="h-3 w-3 text-green-600" /> : <XCircle className="h-3 w-3 text-red-400" />}
                        <span>Leseni</span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Muda: {new Date(r.required_after).toLocaleDateString('sw-TZ')}
                    </div>

                    <div className="flex gap-1 pt-1">
                      {r.block_mode === 'none' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl text-xs h-7 text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setPasswordDialog({
                              action: `Kuzuia: ${r.business_name || r.full_name}`,
                              callback: () => { setPasswordDialog(null); handleBlock(r); }
                            });
                          }}
                        >
                          <Lock className="h-3 w-3 mr-1" /> Zuia
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 rounded-xl text-xs h-7 text-green-600 hover:bg-green-50"
                          onClick={() => {
                            setPasswordDialog({
                              action: `Kufungua: ${r.business_name || r.full_name}`,
                              callback: async () => {
                                setPasswordDialog(null);
                                try {
                                  await supabase.from('business_compliance').update({
                                    block_mode: 'none', block_until: null, notes: null
                                  }).eq('id', r.id);
                                  toast.success('Akaunti imefunguliwa');
                                  fetchData();
                                } catch (err: any) { toast.error(err.message); }
                              }
                            });
                          }}
                        >
                          <Unlock className="h-3 w-3 mr-1" /> Fungua
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredCompliance.length === 0 && (
              <p className="text-muted-foreground text-center py-8 col-span-full">Hakuna rekodi za kuzingatia sheria</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contracts Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Mikataba ya Biashara — {filteredContracts.length} mikataba
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredContracts.map(r => {
              const status = getContractStatus(r);
              return (
                <Card key={r.id} className="border">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{r.business_name || r.full_name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                        {r.full_legal_name && (
                          <p className="text-xs text-muted-foreground">Jina: {r.full_legal_name}</p>
                        )}
                      </div>
                      <Badge className={`${status.color} whitespace-nowrap`}>{status.label}</Badge>
                    </div>

                    {r.signed_at && (
                      <p className="text-xs text-muted-foreground">
                        Imesainiwa: {new Date(r.signed_at).toLocaleDateString('sw-TZ')}
                      </p>
                    )}
                    {r.expires_at && (
                      <p className="text-xs text-muted-foreground">
                        Inaisha: {new Date(r.expires_at).toLocaleDateString('sw-TZ')}
                      </p>
                    )}

                    {r.status !== 'signed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full rounded-xl text-xs h-7"
                        onClick={() => handleResendContract(r)}
                      >
                        <Send className="h-3 w-3 mr-1" /> Tuma Tena Mkataba
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {filteredContracts.length === 0 && (
              <p className="text-muted-foreground text-center py-8 col-span-full">Hakuna mikataba</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Block Dialog */}
      <Dialog open={!!blockDialog} onOpenChange={() => setBlockDialog(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Zuia Akaunti: {blockDialog?.record.business_name || blockDialog?.record.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Aina ya Kuzuia</Label>
              <Select value={blockMode} onValueChange={setBlockMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Fungua (Isiwe Imezuiwa)</SelectItem>
                  <SelectItem value="temporary">Muda Mfupi</SelectItem>
                  <SelectItem value="permanent">Kudumu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {blockMode === 'temporary' && (
              <div>
                <Label>Muda</Label>
                <Select value={blockDuration} onValueChange={setBlockDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1_day">Siku 1</SelectItem>
                    <SelectItem value="3_days">Siku 3</SelectItem>
                    <SelectItem value="7_days">Wiki 1</SelectItem>
                    <SelectItem value="14_days">Wiki 2</SelectItem>
                    <SelectItem value="30_days">Mwezi 1</SelectItem>
                    <SelectItem value="90_days">Miezi 3</SelectItem>
                    <SelectItem value="1_year">Mwaka 1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Maelezo (Hiari)</Label>
              <Textarea
                value={blockNotes}
                onChange={e => setBlockNotes(e.target.value)}
                placeholder="Sababu ya kuzuia..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(null)}>Ghairi</Button>
            <Button variant="destructive" onClick={executeBlock}>
              <Lock className="h-4 w-4 mr-2" /> Zuia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend Contract Dialog */}
      <Dialog open={!!contractDialog} onOpenChange={() => setContractDialog(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Tuma Tena Mkataba
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Biashara: <strong>{contractDialog?.record.business_name || contractDialog?.record.full_name}</strong>
            </p>
            <div>
              <Label>Muda wa Kusaini</Label>
              <Select value={contractRequiredBy} onValueChange={setContractRequiredBy}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="3_days">Siku 3</SelectItem>
                  <SelectItem value="7_days">Wiki 1</SelectItem>
                  <SelectItem value="14_days">Wiki 2</SelectItem>
                  <SelectItem value="30_days">Mwezi 1</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Maelezo ya Admin (Hiari)</Label>
              <Textarea
                value={contractNotes}
                onChange={e => setContractNotes(e.target.value)}
                placeholder="Maelezo kwa biashara..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractDialog(null)}>Ghairi</Button>
            <Button onClick={executeResendContract}>
              <Send className="h-4 w-4 mr-2" /> Tuma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Password Dialog */}
      <AdminPasswordDialog
        open={!!passwordDialog}
        onClose={() => setPasswordDialog(null)}
        onConfirm={() => passwordDialog?.callback()}
        action={passwordDialog?.action || ''}
      />
    </div>
  );
};

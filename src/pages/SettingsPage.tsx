import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Download, Save, Eye, EyeOff, Phone, Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SokoniOrderNotificationSettings } from '@/components/SokoniOrderNotificationSettings';

export const SettingsPage = () => {
  const { user, userProfile, updateProfile, loading } = useAuth();
  const [formData, setFormData] = useState({ full_name: '', business_name: '', phone: '', newPassword: '', confirmPassword: '' });
  const [updating, setUpdating] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFormData({ full_name: userProfile.full_name || '', business_name: userProfile.business_name || '', phone: userProfile.phone || '', newPassword: '', confirmPassword: '' });
    }
  }, [userProfile]);

  const normalizePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('0')) return '255' + digits.slice(1);
    if (digits.length === 12 && digits.startsWith('255')) return digits;
    if (digits.length === 9) return '255' + digits;
    return digits;
  };

  const handleUpdateProfile = async () => {
    if (!formData.full_name.trim()) { toast.error('Jina kamili ni lazima'); return; }
    setUpdating(true);
    try {
      await updateProfile({ full_name: formData.full_name.trim(), business_name: formData.business_name.trim() });
      toast.success('Profaili imesasishwa');
    } catch { toast.error('Imeshindwa kusasisha profaili'); }
    finally { setUpdating(false); }
  };

  const handleSavePhone = async () => {
    if (!user?.id) return;
    const normalizedPhone = normalizePhone(formData.phone);
    if (formData.phone && normalizedPhone.length < 9) { toast.error('Namba ya simu si sahihi'); return; }
    setSavingPhone(true);
    try {
      if (normalizedPhone) {
        const { data: existing } = await supabase.from('profiles').select('id').eq('phone', normalizedPhone).neq('id', user.id).maybeSingle();
        if (existing) { toast.error('Namba hii tayari imetumika'); setSavingPhone(false); return; }
      }
      const { error } = await supabase.from('profiles').update({ phone: normalizedPhone || null, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (error) throw error;
      toast.success('Namba ya simu imehifadhiwa!');
    } catch (error: any) {
      toast.error(error.code === '23505' ? 'Namba hii tayari imetumika' : 'Imeshindwa kuhifadhi');
    } finally { setSavingPhone(false); }
  };

  const handlePasswordChange = async () => {
    if (!formData.newPassword || !formData.confirmPassword) { toast.error('Jaza nywila zote'); return; }
    if (formData.newPassword !== formData.confirmPassword) { toast.error('Nywila hazilingani'); return; }
    if (formData.newPassword.length < 6) { toast.error('Nywila lazima herufi 6+'); return; }
    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: formData.newPassword });
      if (error) throw error;
      setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
      toast.success('Nywila imebadilishwa');
    } catch { toast.error('Imeshindwa kubadilisha nywila'); }
    finally { setUpdating(false); }
  };

  const handleExportData = async () => {
    const dataStr = JSON.stringify({ profile: userProfile, exported_at: new Date().toISOString() }, null, 2);
    const link = document.createElement('a');
    link.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    link.download = `kiduka_data_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    toast.success('Data imehamishwa');
  };

  const getInitials = (name: string) => name ? name.split(' ').map(w => w.charAt(0).toUpperCase()).join('').slice(0, 2) : 'U';
  const getRoleLabel = (role: string) => {
    switch (role) { case 'owner': return 'Mmiliki'; case 'assistant': return 'Msaidizi'; case 'super_admin': return 'Msimamizi Mkuu'; default: return 'Mtumiaji'; }
  };

  if (loading) {
    return <div className="p-4 text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div><p className="text-xs text-muted-foreground">Inapakia...</p></div>;
  }

  const displayName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Mtumiaji';

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto pb-24">
      <div>
        <h2 className="text-lg font-bold text-foreground">Mipangilio</h2>
        <p className="text-xs text-muted-foreground">Simamia akaunti na mipangilio</p>
      </div>

      {/* Profile */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={userProfile?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 text-white text-sm">{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground">{displayName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-primary border-primary/30 text-xs">{getRoleLabel(userProfile?.role || 'owner')}</Badge>
              {userProfile?.business_name && <Badge variant="outline" className="text-xs">{userProfile.business_name}</Badge>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Jina Kamili</Label>
            <Input value={formData.full_name} onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))} placeholder="Jina lako kamili" />
          </div>
          <div>
            <Label className="text-xs">Jina la Biashara</Label>
            <Input value={formData.business_name} onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))} placeholder="Jina la biashara" />
          </div>
          <div>
            <Label className="text-xs">Barua Pepe</Label>
            <Input value={user?.email || ''} disabled className="bg-muted" />
          </div>
        </div>

        <Button onClick={handleUpdateProfile} disabled={updating} size="sm">
          <Save className="h-4 w-4 mr-1" />
          {updating ? 'Inasasisha...' : 'Sasisha Profaili'}
        </Button>
      </div>

      {/* Phone */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Namba ya Simu (Kwa Kuingia)</p>
        </div>
        <div className="flex gap-2">
          <Input type="tel" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="0712 345 678" className="flex-1" />
          <Button onClick={handleSavePhone} disabled={savingPhone} variant="outline" size="sm">
            {savingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" />Hifadhi</>}
          </Button>
        </div>
      </div>

      {/* Security */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Usalama</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Nywila Mpya</Label>
            <div className="relative">
              <Input type={showPassword ? "text" : "password"} value={formData.newPassword} onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))} placeholder="Nywila mpya" />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Thibitisha Nywila</Label>
            <div className="relative">
              <Input type={showConfirmPassword ? "text" : "password"} value={formData.confirmPassword} onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))} placeholder="Rudia nywila" />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        <Button onClick={handlePasswordChange} disabled={updating || !formData.newPassword || !formData.confirmPassword} variant="outline" size="sm">Badilisha Nywila</Button>
      </div>

      {/* Data Export */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-medium">Usimamizi wa Data</p>
        </div>
        <p className="text-xs text-muted-foreground">Hamisha data yako yote kwa JSON</p>
        <Button onClick={handleExportData} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-1" />
          Hamisha Data
        </Button>
      </div>

      {/* Business Info */}
      <div className="border-t border-border pt-4 space-y-2">
        <p className="text-sm font-medium">Taarifa za Biashara</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Jukumu</p>
            <p className="font-medium">{getRoleLabel(userProfile?.role || 'owner')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mwanachama Tangu</p>
            <p className="font-medium">{userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString('sw-TZ') : 'Haijulikani'}</p>
          </div>
        </div>
      </div>

      <SokoniOrderNotificationSettings />
    </div>
  );
};

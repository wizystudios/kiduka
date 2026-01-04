
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Building, Shield, Download, Save, Eye, EyeOff, Phone, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const { user, userProfile, updateProfile, loading } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    business_name: '',
    phone: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [updating, setUpdating] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        full_name: userProfile.full_name || '',
        business_name: userProfile.business_name || '',
        phone: userProfile.phone || '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [userProfile]);

  // Format phone number for display
  const formatPhoneDisplay = (phone: string) => {
    // Remove non-digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('0')) {
      return digits.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
    }
    if (digits.length === 12 && digits.startsWith('255')) {
      return '+' + digits.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4');
    }
    return phone;
  };

  // Normalize phone number for storage (e.g., 0712345678 -> 255712345678)
  const normalizePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('0')) {
      return '255' + digits.slice(1);
    }
    if (digits.length === 12 && digits.startsWith('255')) {
      return digits;
    }
    if (digits.length === 9) {
      return '255' + digits;
    }
    return digits;
  };

  const handleUpdateProfile = async () => {
    if (!formData.full_name.trim()) {
      toast.error('Jina kamili ni lazima');
      return;
    }

    setUpdating(true);
    try {
      await updateProfile({
        full_name: formData.full_name.trim(),
        business_name: formData.business_name.trim()
      });
      
      toast.success('Profaili imesasishwa kwa mafanikio');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Imeshindwa kusasisha profaili');
    } finally {
      setUpdating(false);
    }
  };

  const handleSavePhone = async () => {
    if (!user?.id) return;

    const normalizedPhone = normalizePhone(formData.phone);
    
    if (formData.phone && normalizedPhone.length < 9) {
      toast.error('Namba ya simu si sahihi');
      return;
    }

    setSavingPhone(true);
    try {
      // Check if phone is already used by another user
      if (normalizedPhone) {
        const { data: existing, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', normalizedPhone)
          .neq('id', user.id)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking phone:', checkError);
        }

        if (existing) {
          toast.error('Namba hii ya simu tayari imetumika na mtumiaji mwingine');
          setSavingPhone(false);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ 
          phone: normalizedPhone || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Namba ya simu imehifadhiwa! Unaweza kutumia namba hii kuingia.');
    } catch (error: any) {
      console.error('Error saving phone:', error);
      if (error.code === '23505') {
        toast.error('Namba hii ya simu tayari imetumika');
      } else {
        toast.error('Imeshindwa kuhifadhi namba ya simu');
      }
    } finally {
      setSavingPhone(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!formData.newPassword || !formData.confirmPassword) {
      toast.error('Tafadhali jaza nywila zote');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Nywila hazilingani');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('Nywila lazima iwe na angalau herufi 6');
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: formData.newPassword });

      if (error) throw error;

      setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }));
      toast.success('Nywila imebadilishwa kwa mafanikio');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Imeshindwa kubadilisha nywila');
    } finally {
      setUpdating(false);
    }
  };

  const handleExportData = async () => {
    try {
      const exportData = {
        profile: userProfile,
        exported_at: new Date().toISOString(),
        export_type: 'user_data'
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `kiduka_data_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast.success('Data imehamishwa kwa mafanikio');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Imeshindwa kuhamisha data');
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Mmiliki';
      case 'assistant': return 'Msaidizi';
      case 'super_admin': return 'Msimamizi Mkuu';
      default: return 'Mtumiaji';
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Inapakia mipangilio...</p>
        </div>
      </div>
    );
  }

  const displayName = userProfile?.full_name || 
                     user?.user_metadata?.full_name || 
                     user?.email?.split('@')[0] || 
                     'Mtumiaji';

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Mipangilio</h2>
        <p className="text-muted-foreground">Simamia akaunti na mipangilio ya biashara yako</p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Taarifa za Profaili
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 text-white text-lg">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{displayName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-primary border-primary/30">
                  {getRoleLabel(userProfile?.role || 'owner')}
                </Badge>
                {userProfile?.business_name && (
                  <Badge variant="outline" className="text-secondary-foreground border-border">
                    {userProfile.business_name}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full_name">Jina Kamili</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Ingiza jina lako kamili"
              />
            </div>
            <div>
              <Label htmlFor="business_name">Jina la Biashara</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                placeholder="Ongeza jina la biashara yako"
              />
            </div>
            <div>
              <Label>Barua Pepe</Label>
              <Input
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">Barua pepe haiwezi kubadilishwa</p>
            </div>
          </div>

          <Button 
            onClick={handleUpdateProfile}
            disabled={updating}
          >
            <Save className="h-4 w-4 mr-2" />
            {updating ? 'Inasasisha...' : 'Sasisha Profaili'}
          </Button>
        </CardContent>
      </Card>

      {/* Phone Number for Login */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="h-5 w-5 mr-2" />
            Namba ya Simu (Kwa Kuingia)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Ongeza namba yako ya simu ili uweze kuingia kwa namba badala ya barua pepe.
          </p>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="0712 345 678"
              />
            </div>
            <Button 
              onClick={handleSavePhone}
              disabled={savingPhone}
              variant="outline"
            >
              {savingPhone ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Hifadhi
                </>
              )}
            </Button>
          </div>
          
          {formData.phone && (
            <p className="text-xs text-muted-foreground">
              Fomu iliyohifadhiwa: {formatPhoneDisplay(formData.phone)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Usalama
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="newPassword">Nywila Mpya</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Ingiza nywila mpya"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Thibitisha Nywila</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Rudia nywila mpya"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <Button 
            onClick={handlePasswordChange}
            disabled={updating || !formData.newPassword || !formData.confirmPassword}
            variant="outline"
          >
            Badilisha Nywila
          </Button>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Usimamizi wa Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • Kuhamisha kunajumuisha bidhaa zote, mauzo, na data ya biashara
            </p>
            <p className="text-sm text-muted-foreground">
              • Data imehamishwa katika muundo wa JSON kwa ajili ya kuhifadhi
            </p>
          </div>

          <Button 
            onClick={handleExportData}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Hamisha Data
          </Button>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Taarifa za Biashara
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Jukumu</Label>
              <p className="font-medium">{getRoleLabel(userProfile?.role || 'owner')}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Mwanachama Tangu</Label>
              <p className="font-medium">
                {userProfile?.created_at 
                  ? new Date(userProfile.created_at).toLocaleDateString('sw-TZ')
                  : 'Haijulikani'
                }
              </p>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm text-muted-foreground">Kitambulisho cha Mtumiaji</Label>
              <p className="font-mono text-sm text-muted-foreground break-all">
                {user?.id?.slice(0, 8)}...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

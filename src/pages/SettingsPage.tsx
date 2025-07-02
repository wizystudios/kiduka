
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Building, Shield, Calendar, Download, Save, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const { user, userProfile, updateProfile, loading } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    business_name: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [updating, setUpdating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        full_name: userProfile.full_name || '',
        business_name: userProfile.business_name || '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [userProfile]);

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
      const { error } = await import('@/integrations/supabase/client').then(
        ({ supabase }) => supabase.auth.updateUser({ password: formData.newPassword })
      );

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
      // Export user data
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inapakia mipangilio...</p>
        </div>
      </div>
    );
  }

  const displayName = userProfile?.full_name || 
                     user?.user_metadata?.full_name || 
                     user?.email?.split('@')[0] || 
                     'Mtumiaji';

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Mipangilio</h2>
        <p className="text-gray-600">Simamia akaunti na mipangilio ya biashara yako</p>
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
                <Badge variant="outline" className="text-purple-600 border-purple-200">
                  {getRoleLabel(userProfile?.role || 'owner')}
                </Badge>
                {userProfile?.business_name && (
                  <Badge variant="outline" className="text-blue-600 border-blue-200">
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
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">Barua pepe haiwezi kubadilishwa</p>
            </div>
          </div>

          <Button 
            onClick={handleUpdateProfile}
            disabled={updating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {updating ? 'Inasasisha...' : 'Sasisha Profaili'}
          </Button>
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
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
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
            <p className="text-sm text-gray-600">
              • Kuhamisha kunajumuisha bidhaa zote, mauzo, na data ya biashara
            </p>
            <p className="text-sm text-gray-600">
              • Data imehamishwa katika muundo wa JSON kwa ajili ya kuhifadhi
            </p>
          </div>

          <Button 
            onClick={handleExportData}
            variant="outline"
            className="text-green-600 border-green-600 hover:bg-green-50"
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
              <Label className="text-sm text-gray-600">Jukumu</Label>
              <p className="font-medium">{getRoleLabel(userProfile?.role || 'owner')}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Mwanachama Tangu</Label>
              <p className="font-medium">
                {userProfile?.created_at 
                  ? new Date(userProfile.created_at).toLocaleDateString('sw-TZ')
                  : 'Haijulikani'
                }
              </p>
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm text-gray-600">Kitambulisho cha Mtumiaji</Label>
              <p className="font-mono text-sm text-gray-500 break-all">
                {user?.id?.slice(0, 8)}...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

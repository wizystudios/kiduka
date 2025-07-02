
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Building, Mail, Lock, Download, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const SettingsPage = () => {
  const { userProfile, user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: '',
    business_name: '',
    email: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (userProfile) {
      setProfileData({
        full_name: userProfile.full_name || '',
        business_name: userProfile.business_name || '',
        email: userProfile.email || user?.email || ''
      });
    }
  }, [userProfile, user]);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const handleProfileUpdate = async () => {
    if (!userProfile?.id) {
      toast.error('Kosa la mtumiaji');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name.trim() || null,
          business_name: profileData.business_name.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.id);

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }

      await refreshProfile();
      toast.success('Maelezo yamebadilishwa kwa mafanikio');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Imeshindwa kubadilisha maelezo');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Nywila mpya hazilingani');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Nywila lazima iwe na angalau herufi 6');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast.success('Nywila imebadilishwa kwa mafanikio');
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Imeshindwa kubadilisha nywila');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', userProfile?.id);

      const { data: sales } = await supabase
        .from('sales')
        .select('*, sale_items(*)')
        .eq('owner_id', userProfile?.id);

      const exportData = {
        business_info: profileData,
        products: products || [],
        sales: sales || [],
        exported_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `kiduka-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);

      toast.success('Data imehamishwa kwa mafanikio');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Imeshindwa kuhamisha data');
    }
  };

  const displayName = profileData.full_name || 'Mtumiaji';
  const businessName = profileData.business_name;
  const userRole = userProfile?.role || 'owner';

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mipangilio</h2>
        <p className="text-gray-600">Simamia akaunti na mipangilio ya biashara yako</p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Maelezo ya Mtumiaji
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {displayName}
              </h3>
              <p className="text-sm text-gray-500 capitalize">
                {userRole === 'owner' ? 'Mmiliki' : userRole}
              </p>
              {businessName && (
                <p className="text-sm text-gray-500">
                  {businessName}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Profile Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Jina Kamili</Label>
              <Input
                id="full_name"
                value={profileData.full_name}
                onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                placeholder="Weka jina lako kamili"
              />
            </div>

            <div>
              <Label htmlFor="business_name">Jina la Biashara</Label>
              <Input
                id="business_name"
                value={profileData.business_name}
                onChange={(e) => setProfileData({...profileData, business_name: e.target.value})}
                placeholder="Weka jina la biashara yako"
              />
            </div>

            <div>
              <Label htmlFor="email">Barua Pepe</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Barua pepe haiwezi kubadilishwa</p>
            </div>

            <Button 
              onClick={handleProfileUpdate} 
              disabled={loading}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Inabadilisha...' : 'Badilisha Maelezo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            Usalama
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="new_password">Nywila Mpya</Label>
            <Input
              id="new_password"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
              placeholder="Weka nywila mpya"
            />
          </div>

          <div>
            <Label htmlFor="confirm_password">Thibitisha Nywila Mpya</Label>
            <Input
              id="confirm_password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
              placeholder="Thibitisha nywila mpya"
            />
          </div>

          <Button 
            onClick={handlePasswordUpdate} 
            disabled={loading || !passwordData.newPassword}
            className="w-full"
          >
            <Lock className="h-4 w-4 mr-2" />
            {loading ? 'Inabadilisha...' : 'Badilisha Nywila'}
          </Button>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Usimamizi wa Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={exportData}
            variant="outline"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Hamisha Data Zote
          </Button>
          
          <div className="text-sm text-gray-500">
            <p>• Uhamishaji unajumuisha bidhaa, mauzo, na data za biashara</p>
            <p>• Data inahamishwa katika muundo wa JSON kwa kuhifadhi</p>
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Maelezo ya Biashara</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Jukumu</span>
            <span className="text-sm font-medium capitalize">
              {userRole === 'owner' ? 'Mmiliki' : userRole}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Mwanachama Tangu</span>
            <span className="text-sm font-medium">
              {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'Sio Wazi'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Kitambulisho cha Mtumiaji</span>
            <span className="text-xs font-mono text-gray-500">{userProfile?.id?.slice(0, 8)}...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

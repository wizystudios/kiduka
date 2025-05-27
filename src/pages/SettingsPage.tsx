
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Building, Mail, Lock, Download, Upload, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const SettingsPage = () => {
  const { userProfile, user } = useAuth();
  const { toast } = useToast();
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
        email: userProfile.email || ''
      });
    }
  }, [userProfile]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const handleProfileUpdate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          business_name: profileData.business_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile?.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New passwords do not match',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Password updated successfully'
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: 'Error',
        description: 'Failed to update password',
        variant: 'destructive'
      });
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
      link.download = `smartshop-data-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Data exported successfully'
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">Manage your account and business settings</p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={userProfile?.avatar_url} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                {profileData.full_name ? getInitials(profileData.full_name) : <User className="h-8 w-8" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {profileData.full_name || 'Add your name'}
              </h3>
              <p className="text-sm text-gray-500 capitalize">
                {userProfile?.role || 'owner'}
              </p>
              <p className="text-sm text-gray-500">
                {profileData.business_name || 'Add your business name'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Profile Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={profileData.full_name}
                onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                value={profileData.business_name}
                onChange={(e) => setProfileData({...profileData, business_name: e.target.value})}
                placeholder="Enter your business name"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <Button 
              onClick={handleProfileUpdate} 
              disabled={loading}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lock className="h-5 w-5 mr-2" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="new_password">New Password</Label>
            <Input
              id="new_password"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
              placeholder="Enter new password"
            />
          </div>

          <div>
            <Label htmlFor="confirm_password">Confirm New Password</Label>
            <Input
              id="confirm_password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
              placeholder="Confirm new password"
            />
          </div>

          <Button 
            onClick={handlePasswordUpdate} 
            disabled={loading || !passwordData.newPassword}
            className="w-full"
          >
            <Lock className="h-4 w-4 mr-2" />
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={exportData}
            variant="outline"
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Export All Data
          </Button>
          
          <div className="text-sm text-gray-500">
            <p>• Export includes all products, sales, and business data</p>
            <p>• Data is exported in JSON format for backup purposes</p>
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Role</span>
            <span className="text-sm font-medium capitalize">{userProfile?.role}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Member Since</span>
            <span className="text-sm font-medium">
              {userProfile?.created_at ? new Date(userProfile.created_at).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">User ID</span>
            <span className="text-xs font-mono text-gray-500">{userProfile?.id?.slice(0, 8)}...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

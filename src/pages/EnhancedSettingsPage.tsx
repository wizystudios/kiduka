import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, User, Building, Receipt, Download, Upload, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const EnhancedSettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [userSettings, setUserSettings] = useState({
    full_name: '',
    email: '',
    business_name: ''
  });
  const [businessSettings, setBusinessSettings] = useState({
    business_name: '',
    tax_rate: '0',
    currency: 'USD',
    receipt_footer: '',
    enable_notifications: true
  });
  const { userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (userProfile) {
      setUserSettings({
        full_name: userProfile.full_name || '',
        email: userProfile.email || '',
        business_name: userProfile.business_name || ''
      });
      fetchBusinessSettings();
    }
  }, [userProfile]);

  const fetchBusinessSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('owner_id', userProfile?.id)
        .single();

      if (data) {
        setBusinessSettings({
          business_name: data.business_name || '',
          tax_rate: data.tax_rate?.toString() || '0',
          currency: data.currency || 'USD',
          receipt_footer: data.receipt_footer || '',
          enable_notifications: data.enable_notifications ?? true
        });
      }
    } catch (error) {
      console.log('No business settings found, using defaults');
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: userSettings.full_name,
          business_name: userSettings.business_name,
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

  const handleUpdateBusinessSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          owner_id: userProfile?.id,
          business_name: businessSettings.business_name,
          tax_rate: parseFloat(businessSettings.tax_rate),
          currency: businessSettings.currency,
          receipt_footer: businessSettings.receipt_footer,
          enable_notifications: businessSettings.enable_notifications,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Business settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating business settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update business settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      // Export products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', userProfile?.id);

      if (productsError) throw productsError;

      // Export sales
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items(*, products(*))
        `)
        .eq('owner_id', userProfile?.id);

      if (salesError) throw salesError;

      const exportData = {
        products,
        sales,
        exported_at: new Date().toISOString(),
        business_name: businessSettings.business_name
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kiduka-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
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

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        // In a real implementation, you'd process and import the data
        toast({
          title: 'Import Feature',
          description: 'Data import functionality is available (requires implementation)',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Invalid file format',
          variant: 'destructive'
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">Manage your account and business preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={userSettings.full_name}
                  onChange={(e) => setUserSettings({...userSettings, full_name: e.target.value})}
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userSettings.email}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <Label htmlFor="business_name_profile">Business Name</Label>
                <Input
                  id="business_name_profile"
                  value={userSettings.business_name}
                  onChange={(e) => setUserSettings({...userSettings, business_name: e.target.value})}
                  placeholder="Enter your business name"
                />
              </div>
              <Button onClick={handleUpdateProfile} disabled={loading}>
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Business Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="business_name">Business Name</Label>
                <Input
                  id="business_name"
                  value={businessSettings.business_name}
                  onChange={(e) => setBusinessSettings({...businessSettings, business_name: e.target.value})}
                  placeholder="Enter business name"
                />
              </div>
              <div>
                <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  step="0.01"
                  value={businessSettings.tax_rate}
                  onChange={(e) => setBusinessSettings({...businessSettings, tax_rate: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={businessSettings.currency} onValueChange={(value) => setBusinessSettings({...businessSettings, currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="TZS">TZS - Tanzanian Shilling</SelectItem>
                    <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="receipt_footer">Receipt Footer</Label>
                <Textarea
                  id="receipt_footer"
                  value={businessSettings.receipt_footer}
                  onChange={(e) => setBusinessSettings({...businessSettings, receipt_footer: e.target.value})}
                  placeholder="Thank you for your business!"
                  rows={3}
                />
              </div>
              <Button onClick={handleUpdateBusinessSettings} disabled={loading}>
                {loading ? 'Updating...' : 'Update Business Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Export Data</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Download all your business data as a backup file
                </p>
                <Button onClick={exportData} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export All Data
                </Button>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Import Data</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Import products or restore from backup file
                </p>
                <Input
                  type="file"
                  accept=".json,.csv"
                  onChange={handleFileImport}
                  className="mb-2"
                />
                <p className="text-xs text-gray-500">
                  Supports JSON backup files and CSV product lists
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Low Stock Alerts</Label>
                  <p className="text-sm text-gray-600">Get notified when products are running low</p>
                </div>
                <Switch
                  checked={businessSettings.enable_notifications}
                  onCheckedChange={(checked) => setBusinessSettings({...businessSettings, enable_notifications: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Daily Reports</Label>
                  <p className="text-sm text-gray-600">Receive daily sales summary</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Receipts</Label>
                  <p className="text-sm text-gray-600">Send receipts to customers via email</p>
                </div>
                <Switch />
              </div>
              <Button onClick={handleUpdateBusinessSettings} disabled={loading}>
                {loading ? 'Updating...' : 'Save Notification Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

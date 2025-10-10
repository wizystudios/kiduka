import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Settings, 
  User, 
  Building, 
  Download, 
  Upload, 
  Bell, 
  Globe, 
  Moon, 
  Sun, 
  Trash2, 
  HelpCircle,
  UserMinus,
  Camera
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { HelpCenter } from '@/components/HelpCenter';

export const EnhancedSettingsPage = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showHelp, setShowHelp] = useState(false);
  const [userSettings, setUserSettings] = useState({
    full_name: '',
    email: '',
    business_name: '',
    avatar_url: ''
  });
  const [businessSettings, setBusinessSettings] = useState({
    business_name: '',
    tax_rate: '0',
    currency: 'TZS',
    receipt_footer: '',
    enable_notifications: true
  });
  const { userProfile, user, signOut } = useAuth();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (userProfile) {
      setUserSettings({
        full_name: userProfile.full_name || '',
        email: userProfile.email || '',
        business_name: userProfile.business_name || '',
        avatar_url: userProfile.avatar_url || ''
      });
      fetchBusinessSettings();
    }
  }, [userProfile]);

  const fetchBusinessSettings = async () => {
    // No backend settings table; use profile defaults
    setBusinessSettings((prev) => ({
      business_name: userProfile?.business_name || prev.business_name,
      tax_rate: prev.tax_rate,
      currency: prev.currency,
      receipt_footer: prev.receipt_footer,
      enable_notifications: prev.enable_notifications
    }));
  };

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
          full_name: userSettings.full_name,
          business_name: userSettings.business_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile?.id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: t('error'),
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessSettingsUpdate = async () => {
    setLoading(true);
    try {
      toast({ title: t('success'), description: 'Settings saved locally for this session' });
    } catch (error) {
      console.error('Error updating business settings:', error);
      toast({
        title: t('error'),
        description: 'Failed to update business settings',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      // Delete user profile and related data
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userProfile?.id);

      if (profileError) throw profileError;

      // Sign out the user
      await signOut();
      
      toast({
        title: t('success'),
        description: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: t('error'),
        description: 'Failed to delete account',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('owner_id', userProfile?.id);

      if (productsError) throw productsError;

      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          *,
          sales_items(*, products(*))
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
        title: t('success'),
        description: 'Data exported successfully'
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: t('error'),
        description: 'Failed to export data',
        variant: 'destructive'
      });
    }
  };

  if (showHelp) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 z-10">
          <Button 
            variant="outline" 
            onClick={() => setShowHelp(false)}
            className="mb-2"
          >
            ← Back to Settings
          </Button>
        </div>
        <HelpCenter />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t('settings')}</h2>
        <p className="text-gray-600 dark:text-gray-300">Manage your account and business preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                {t('profile_information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={userSettings.avatar_url} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                    {userSettings.full_name ? getInitials(userSettings.full_name) : <User className="h-10 w-10" />}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {userSettings.full_name || 'Add your name'}
                  </h3>
                  <p className="text-sm text-gray-500 capitalize">
                    {userProfile?.role || 'owner'}
                  </p>
                  <Button variant="outline" size="sm" className="flex items-center">
                    <Camera className="h-4 w-4 mr-2" />
                    Change Photo
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">{t('full_name')}</Label>
                  <Input
                    id="full_name"
                    value={userSettings.full_name}
                    onChange={(e) => setUserSettings({...userSettings, full_name: e.target.value})}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userSettings.email}
                    disabled
                    className="bg-gray-100 dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <Label htmlFor="business_name_profile">{t('business_name')}</Label>
                  <Input
                    id="business_name_profile"
                    value={userSettings.business_name}
                    onChange={(e) => setUserSettings({...userSettings, business_name: e.target.value})}
                    placeholder="Enter your business name"
                  />
                </div>
                <Button onClick={handleProfileUpdate} disabled={loading} className="w-full">
                  {loading ? t('loading') : t('update_profile')}
                </Button>
              </div>
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
                <Label htmlFor="business_name">{t('business_name')}</Label>
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
                    <SelectItem value="TZS">TZS - Tanzanian Shilling</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
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
                  placeholder="Asante kwa kununua!"
                  rows={3}
                />
              </div>
              <Button onClick={handleBusinessSettingsUpdate} disabled={loading}>
                {loading ? t('loading') : 'Update Business Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences">
          <div className="space-y-6">
            {/* Language Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  {t('language_settings')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Label>Choose Language / Chagua Lugha</Label>
                  <Select value={language} onValueChange={(value: 'sw' | 'en') => setLanguage(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sw">🇹🇿 Kiswahili</SelectItem>
                      <SelectItem value="en">🇬🇧 English</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    {language === 'sw' ? 'Lugha iliyochaguliwa itabadilisha mazingira yote ya programu' : 'Selected language will change the entire app interface'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Theme Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  {theme === 'dark' ? <Moon className="h-5 w-5 mr-2" /> : <Sun className="h-5 w-5 mr-2" />}
                  {t('theme_settings')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>{theme === 'dark' ? t('dark_mode') : t('light_mode')}</Label>
                      <p className="text-sm text-gray-500">
                        {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                      </p>
                    </div>
                    <Switch
                      checked={theme === 'dark'}
                      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
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
                    <p className="text-sm text-gray-600 dark:text-gray-300">Get notified when products are running low</p>
                  </div>
                  <Switch
                    checked={businessSettings.enable_notifications}
                    onCheckedChange={(checked) => setBusinessSettings({...businessSettings, enable_notifications: checked})}
                  />
                </div>
                <Button onClick={handleBusinessSettingsUpdate} disabled={loading} className="w-full">
                  {loading ? t('loading') : 'Save Notification Settings'}
                </Button>
              </CardContent>
            </Card>
          </div>
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
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Download all your business data as a backup file
                </p>
                <Button onClick={exportData} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  {t('export_data')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account">
          <div className="space-y-6">
            {/* Help Center */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <HelpCircle className="h-5 w-5 mr-2" />
                  {t('help_support')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowHelp(true)} variant="outline" className="w-full">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Open {t('help_center')}
                </Button>
              </CardContent>
            </Card>

            {/* Account Management */}
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <CardTitle className="flex items-center text-red-600 dark:text-red-400">
                  <UserMinus className="h-5 w-5 mr-2" />
                  {t('account_management')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Danger Zone</h4>
                  <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('delete_account')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Account</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('confirm_delete_account')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {loading ? t('loading') : t('delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

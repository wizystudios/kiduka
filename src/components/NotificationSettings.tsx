
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { pushNotificationService } from '@/utils/pushNotificationService';
import { 
  Bell, 
  BellRing, 
  BellOff, 
  Settings, 
  Smartphone,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react';

export const NotificationSettings = () => {
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [settings, setSettings] = useState({
    lowStock: true,
    dailySales: true,
    newCustomers: false,
    weeklyReports: true,
    systemUpdates: true,
    marketingOffers: false
  });

  useEffect(() => {
    checkNotificationSupport();
    checkSubscriptionStatus();
  }, []);

  const checkNotificationSupport = () => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  };

  const checkSubscriptionStatus = async () => {
    const subscription = await pushNotificationService.getSubscription();
    setIsSubscribed(!!subscription);
  };

  const handleRequestPermission = async () => {
    const granted = await pushNotificationService.requestPermission();
    
    if (granted) {
      setPermission('granted');
      toast({
        title: 'Arifa Zimeruhusiwa',
        description: 'Sasa utapokea arifa muhimu za biashara yako',
      });
    } else {
      toast({
        title: 'Arifa Hazikuruhusiwa',
        description: 'Unaweza kuruhusu arifa kwenye mipangilio ya kivinjari',
        variant: 'destructive'
      });
    }
  };

  const handleSubscribe = async () => {
    const subscriptionData = await pushNotificationService.subscribeToPush();
    
    if (subscriptionData) {
      setIsSubscribed(true);
      // Here you would normally save the subscription to your backend
      console.log('Subscription data:', subscriptionData);
      
      toast({
        title: 'Umejiunga na Arifa',
        description: 'Arifa za push zimewashwa kwa mafanikio',
      });
    } else {
      toast({
        title: 'Kujiunga Kumeshindwa',
        description: 'Hakikuwezekana kuwasha arifa za push',
        variant: 'destructive'
      });
    }
  };

  const handleUnsubscribe = async () => {
    const success = await pushNotificationService.unsubscribeFromPush();
    
    if (success) {
      setIsSubscribed(false);
      toast({
        title: 'Umeondoka',
        description: 'Arifa za push zimezimwa',
      });
    }
  };

  const handleTestNotification = async () => {
    await pushNotificationService.sendTestNotification();
    toast({
      title: 'Arifa ya Jaribio Imetumwa',
      description: 'Angalia arifa ya jaribio kwenye kifaa chako',
    });
  };

  const handleSettingChange = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getPermissionStatus = () => {
    switch (permission) {
      case 'granted':
        return { icon: CheckCircle, color: 'text-green-500', text: 'Zimeruhusiwa' };
      case 'denied':
        return { icon: BellOff, color: 'text-red-500', text: 'Zimekataliwa' };
      default:
        return { icon: AlertCircle, color: 'text-yellow-500', text: 'Hazijaulizwa' };
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BellOff className="h-5 w-5" />
            <span>Arifa Hazitumiki</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Kivinjari chako hakitumii arifa za push. Sasisha kivinjari au tumia kifaa kingine.
          </p>
        </CardContent>
      </Card>
    );
  }

  const StatusIcon = getPermissionStatus().icon;

  return (
    <div className="space-y-6">
      {/* Permission Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Hali ya Arifa</span>
            </div>
            <Badge variant={permission === 'granted' ? 'default' : 'outline'}>
              <StatusIcon className={`h-3 w-3 mr-1 ${getPermissionStatus().color}`} />
              {getPermissionStatus().text}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Ruhusa ya Arifa</h4>
              <p className="text-sm text-gray-600">
                Ruhusu programu kutuma arifa kwenye kifaa chako
              </p>
            </div>
            {permission !== 'granted' && (
              <Button onClick={handleRequestPermission}>
                Ruhusu Arifa
              </Button>
            )}
          </div>

          {permission === 'granted' && (
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold">Push Notifications</h4>
                <p className="text-sm text-gray-600">
                  {isSubscribed ? 'Umejiunga na arifa za push' : 'Hujajiunga na arifa za push'}
                </p>
              </div>
              <div className="flex space-x-2">
                {!isSubscribed ? (
                  <Button onClick={handleSubscribe}>
                    <BellRing className="h-4 w-4 mr-2" />
                    Jiunga
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleTestNotification}>
                      <Zap className="h-4 w-4 mr-2" />
                      Jaribu
                    </Button>
                    <Button variant="destructive" onClick={handleUnsubscribe}>
                      <BellOff className="h-4 w-4 mr-2" />
                      Ondoka
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      {isSubscribed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Mipangilio ya Arifa</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries({
              lowStock: 'Stock Inapungua',
              dailySales: 'Ripoti za Kila Siku',
              newCustomers: 'Wateja Wapya',
              weeklyReports: 'Ripoti za Kila Wiki',
              systemUpdates: 'Masasisho ya Mfumo',
              marketingOffers: 'Ofa za Uuzaji'
            }).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{label}</h4>
                  <p className="text-sm text-gray-600">
                    Pokea arifa za {label.toLowerCase()}
                  </p>
                </div>
                <Switch
                  checked={settings[key as keyof typeof settings]}
                  onCheckedChange={() => handleSettingChange(key as keyof typeof settings)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Device Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Taarifa za Kifaa</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Kivinjari:</span>
              <p className="text-gray-600">{navigator.userAgent.split(' ')[0]}</p>
            </div>
            <div>
              <span className="font-medium">Hali ya Mtandao:</span>
              <p className="text-gray-600">{navigator.onLine ? 'Unaunganishwa' : 'Hauunganishwi'}</p>
            </div>
            <div>
              <span className="font-medium">Service Worker:</span>
              <p className="text-gray-600">
                {'serviceWorker' in navigator ? 'Inatumika' : 'Haitumiki'}
              </p>
            </div>
            <div>
              <span className="font-medium">Push Manager:</span>
              <p className="text-gray-600">
                {'PushManager' in window ? 'Inatumika' : 'Haitumiki'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

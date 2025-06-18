
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Smartphone, 
  Download, 
  CheckCircle, 
  Wifi, 
  Bell,
  Camera,
  Zap,
  Shield,
  Globe,
  Share2
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstaller = () => {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      toast({
        title: 'App Imesakinishwa!',
        description: 'KidukaPOS sasa iko kwenye vifaa vyako',
      });
    };

    // Listen for online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowInstallBanner(false);
      }
    } catch (error) {
      console.error('Error installing app:', error);
    }
  };

  const shareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KidukaPOS - Smart Business Management',
          text: 'Pata app bora ya kusimamia biashara yako!',
          url: window.location.origin
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(window.location.origin);
      toast({
        title: 'Link Imenakiliwa',
        description: 'Ungana link kwenye mitandao ya kijamii',
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: 'Arifa Zimeruhusiwa',
          description: 'Utapokea arifa muhimu za biashara',
        });
      }
    }
  };

  const features = [
    {
      icon: Wifi,
      title: 'Kazi Bila Mtandao',
      description: 'Endelea kufanya kazi hata bila internet',
      available: 'serviceWorker' in navigator
    },
    {
      icon: Bell,
      title: 'Arifa za Haraka',
      description: 'Pokea arifa za stock na mauzo',
      available: 'Notification' in window
    },
    {
      icon: Camera,
      title: 'Kamera ya Haraka',
      description: 'Piga picha na scan barcode kwa urahisi',
      available: 'mediaDevices' in navigator
    },
    {
      icon: Zap,
      title: 'Kasi ya Juu',
      description: 'App inafunguka haraka kama app ya kawaida',
      available: true
    },
    {
      icon: Shield,
      title: 'Usalama wa Hali ya Juu',
      description: 'Data yako ni salama na encrypted',
      available: location.protocol === 'https:'
    },
    {
      icon: Globe,
      title: 'Kufikiwa Kila Mahali',
      description: 'Tumia kwenye simu, tablet au computer',
      available: true
    }
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Installation Banner */}
      {showInstallBanner && !isInstalled && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-6 w-6 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-blue-900">Sakinisha App</h4>
                  <p className="text-sm text-blue-700">
                    Pata ufikiaji wa haraka na mazingira bora ya kutumia
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInstallBanner(false)}
                >
                  Baadaye
                </Button>
                <Button size="sm" onClick={handleInstallClick}>
                  <Download className="h-4 w-4 mr-2" />
                  Sakinisha
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offline Banner */}
      {isOffline && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Wifi className="h-5 w-5 text-orange-600" />
              <div>
                <h4 className="font-semibold text-orange-900">Hujaunganishwa Mtandaoni</h4>
                <p className="text-sm text-orange-700">
                  Unaweza kuendelea kutumia app. Data itasawazishwa ukiwa mtandaoni.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PWA Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Hali ya Mobile App</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Hali ya Usakinishaji</h4>
              <p className="text-sm text-gray-600">
                {isInstalled 
                  ? 'App imesakinishwa kwenye kifaa chako' 
                  : 'App bado haijasakinishwa'
                }
              </p>
            </div>
            {isInstalled ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Imesakinishwa
              </Badge>
            ) : (
              <Badge variant="outline">
                Haijasakinishwa
              </Badge>
            )}
          </div>

          {!isInstalled && deferredPrompt && (
            <Button onClick={handleInstallClick} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Sakinisha KidukaPOS App
            </Button>
          )}

          <div className="flex space-x-2">
            <Button variant="outline" onClick={shareApp} className="flex-1">
              <Share2 className="h-4 w-4 mr-2" />
              Shiriki App
            </Button>
            
            <Button variant="outline" onClick={requestNotificationPermission} className="flex-1">
              <Bell className="h-4 w-4 mr-2" />
              Ruhusu Arifa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Features */}
      <Card>
        <CardHeader>
          <CardTitle>Vipengele vya App</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="p-4">
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${feature.available ? 'text-green-500' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">{feature.title}</h4>
                        {feature.available ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full bg-gray-300" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Installation Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Jinsi ya Kusakinisha</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Android (Chrome/Edge)</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4">
                <li>1. Bonyeza "Sakinisha App" ukionekana</li>
                <li>2. Au tembelea menu (⋮) → "Add to Home screen"</li>
                <li>3. Kubali kusakinisha</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">iPhone/iPad (Safari)</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4">
                <li>1. Bonyeza alama ya kushiriki (⬆️)</li>
                <li>2. Chagua "Add to Home Screen"</li>
                <li>3. Kubali kuongeza</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-2">Desktop (Chrome/Edge)</h4>
              <ol className="text-sm text-gray-600 space-y-1 ml-4">
                <li>1. Bonyeza alama ya kusakinisha kwenye address bar</li>
                <li>2. Au menu → "Install KidukaPOS"</li>
                <li>3. Kubali kusakinisha</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Faida za App</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">⚡ Kasi na Utendaji</h4>
              <p className="text-xs text-gray-600">App inafunguka haraka zaidi na inatumia data kidogo</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">📱 Mazingira ya Asili</h4>
              <p className="text-xs text-gray-600">Hali kama app ya kawaida kwenye kifaa chako</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">🔄 Kazi Bila Mtandao</h4>
              <p className="text-xs text-gray-600">Endelea kufanya kazi hata bila internet</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">🔔 Arifa za Haraka</h4>
              <p className="text-xs text-gray-600">Pokea arifa muhimu za biashara yako</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

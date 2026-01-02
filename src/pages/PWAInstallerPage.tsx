
import { PWAInstaller } from '@/components/PWAInstaller';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Smartphone, 
  CheckCircle,
  Wifi,
  WifiOff,
  Share2,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallerPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast.success('KidukaPOS Imesakinishwa!');
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

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
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Show manual instructions
      toast.info('Tumia menu ya browser kusakinisha', {
        description: 'Bonyeza "⋮" kisha "Add to Home Screen" au "Install App"'
      });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        toast.success('Asante! App inasanikishwa...');
      }
    } catch (error) {
      console.error('Install error:', error);
    }
  };

  const shareApp = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KidukaPOS',
          text: 'Pata app bora ya kusimamia biashara yako!',
          url: window.location.origin
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.origin);
      toast.success('Link imenakiliwa!');
    }
  };

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Arifa zimeruhusiwa!');
      } else {
        toast.error('Arifa zimezuiliwa');
      }
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Pakua App</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sakinisha KidukaPOS kwenye kifaa chako
        </p>
      </div>

      {/* Status Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isInstalled ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                {isInstalled ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <Smartphone className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <div>
                <h3 className="font-semibold">
                  {isInstalled ? 'Imesakinishwa' : 'Sakinisha App'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isInstalled 
                    ? 'KidukaPOS iko kwenye kifaa chako' 
                    : 'Pata ufikiaji wa haraka'}
                </p>
              </div>
            </div>
            {!isInstalled && (
              <Button onClick={handleInstallClick}>
                <Download className="h-4 w-4 mr-2" />
                Sakinisha
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Network Status */}
      <Card className={isOnline ? 'border-green-200' : 'border-orange-200'}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-orange-600" />
            )}
            <div>
              <p className="font-medium">
                {isOnline ? 'Umeonganishwa Mtandaoni' : 'Hakuna Mtandao'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isOnline 
                  ? 'Data inasawazishwa' 
                  : 'App inafanya kazi offline'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Installation Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Jinsi ya Kusakinisha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">1</Badge>
              <div>
                <p className="font-medium text-sm">Android (Chrome)</p>
                <p className="text-xs text-muted-foreground">
                  Menu (⋮) → "Add to Home screen" au "Install app"
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">2</Badge>
              <div>
                <p className="font-medium text-sm">iPhone/iPad (Safari)</p>
                <p className="text-xs text-muted-foreground">
                  Share (⬆️) → "Add to Home Screen"
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Badge variant="outline" className="mt-0.5">3</Badge>
              <div>
                <p className="font-medium text-sm">Desktop</p>
                <p className="text-xs text-muted-foreground">
                  Bonyeza alama ya kusakinisha kwenye address bar
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={shareApp}>
          <Share2 className="h-4 w-4 mr-2" />
          Shiriki App
        </Button>
        <Button variant="outline" onClick={requestNotifications}>
          <Bell className="h-4 w-4 mr-2" />
          Ruhusu Arifa
        </Button>
      </div>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Faida za App</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl mb-1">⚡</p>
              <p className="text-xs font-medium">Kasi ya Juu</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl mb-1">📱</p>
              <p className="text-xs font-medium">Kama App</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl mb-1">🔄</p>
              <p className="text-xs font-medium">Offline Mode</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl mb-1">🔔</p>
              <p className="text-xs font-medium">Arifa</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

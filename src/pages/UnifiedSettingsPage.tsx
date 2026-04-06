import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Headphones, Megaphone, MessageSquare, Settings, ShieldAlert, Smartphone, Crown } from 'lucide-react';
import { SettingsPage } from '@/pages/SettingsPage';
import { HelpPage } from '@/pages/HelpPage';
import { SubscriptionPage } from '@/pages/SubscriptionPage';
import AdsManagerPage from '@/pages/AdsManagerPage';
import { PWAInstallerPage } from '@/pages/PWAInstallerPage';
import { WhatsAppPage } from '@/pages/WhatsAppPage';
import { useIsMobile } from '@/hooks/use-mobile';
import { BusinessRegistrationPanel } from '@/components/BusinessRegistrationPanel';

export const UnifiedSettingsPage = () => {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');

  const tabs = [
    { id: 'profile', label: 'Profaili', icon: Settings },
    { id: 'registration', label: 'Sheria', icon: ShieldAlert },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'subscription', label: 'Michango', icon: Crown },
    { id: 'ads', label: 'Matangazo', icon: Megaphone },
    { id: 'install', label: 'App', icon: Smartphone },
    { id: 'help', label: 'Msaada', icon: Headphones },
  ];

  useEffect(() => {
    setActiveTab(searchParams.get('tab') || 'profile');
  }, [searchParams]);

  const activeContent = useMemo(() => {
    switch (activeTab) {
      case 'registration': return <BusinessRegistrationPanel />;
      case 'whatsapp': return <WhatsAppPage />;
      case 'subscription': return <SubscriptionPage embedded />;
      case 'ads': return <AdsManagerPage />;
      case 'install': return <PWAInstallerPage />;
      case 'help': return <HelpPage />;
      case 'profile':
      default: return <SettingsPage />;
    }
  }, [activeTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    setSearchParams(next);
  };

  return (
    <div className="overflow-x-hidden pb-24">
      <div className="p-4 pb-2">
        <h1 className="text-lg font-bold text-foreground">Mipangilio</h1>
        <p className="text-xs text-muted-foreground">Simamia akaunti, sheria, michango, na zana</p>
      </div>

      <div className="px-4">
        <div className={isMobile ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2'}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <Button key={tab.id} variant={active ? 'secondary' : 'outline'} className={`justify-start rounded-2xl ${isMobile ? 'h-auto min-h-12 px-3 py-3 text-left' : ''}`} onClick={() => handleTabChange(tab.id)}>
                <Icon className="mr-2 h-4 w-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 overflow-x-hidden">{activeContent}</div>
    </div>
  );
};

export default UnifiedSettingsPage;

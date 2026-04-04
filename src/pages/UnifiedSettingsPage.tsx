import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, MessageSquare, Crown, Megaphone, Smartphone, Headphones } from 'lucide-react';
import { SettingsPage } from '@/pages/SettingsPage';
import { HelpPage } from '@/pages/HelpPage';
import { SubscriptionPage } from '@/pages/SubscriptionPage';
import AdsManagerPage from '@/pages/AdsManagerPage';
import { PWAInstallerPage } from '@/pages/PWAInstallerPage';
import { WhatsAppPage } from '@/pages/WhatsAppPage';

export const UnifiedSettingsPage = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profaili', icon: Settings },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'subscription', label: 'Michango', icon: Crown },
    { id: 'ads', label: 'Matangazo', icon: Megaphone },
    { id: 'install', label: 'App', icon: Smartphone },
    { id: 'help', label: 'Msaada', icon: Headphones },
  ];

  return (
    <div className="pb-24">
      <div className="p-4 pb-2">
        <h1 className="text-lg font-bold text-foreground">Mipangilio</h1>
        <p className="text-xs text-muted-foreground">Simamia akaunti, michango, na zana</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <TabsList className="inline-flex w-auto min-w-full gap-1 bg-muted/50">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="text-[10px] gap-1 px-2.5 whitespace-nowrap">
                <tab.icon className="h-3 w-3" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="profile" className="mt-0">
          <SettingsPage />
        </TabsContent>

        <TabsContent value="whatsapp" className="mt-0">
          <WhatsAppPage />
        </TabsContent>

        <TabsContent value="subscription" className="mt-0">
          <SubscriptionPage />
        </TabsContent>

        <TabsContent value="ads" className="mt-0">
          <AdsManagerPage />
        </TabsContent>

        <TabsContent value="install" className="mt-0">
          <PWAInstallerPage />
        </TabsContent>

        <TabsContent value="help" className="mt-0">
          <HelpPage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedSettingsPage;

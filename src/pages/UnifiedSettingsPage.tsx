import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Headphones, Megaphone, MessageSquare, Settings, ShieldAlert, Smartphone, Crown, ClipboardCheck, Sparkles, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SettingsPage } from '@/pages/SettingsPage';
import { HelpPage } from '@/pages/HelpPage';
import { SubscriptionPage } from '@/pages/SubscriptionPage';
import AdsManagerPage from '@/pages/AdsManagerPage';
import { PWAInstallerPage } from '@/pages/PWAInstallerPage';
import { WhatsAppPage } from '@/pages/WhatsAppPage';
import LipaNambaPage from '@/pages/LipaNambaPage';
import { useIsMobile } from '@/hooks/use-mobile';
import { BusinessRegistrationPanel } from '@/components/BusinessRegistrationPanel';
import { NurathSettingsPanel } from '@/components/NurathSettingsPanel';

// These open as right-side panels, matching the admin pages
const SHEET_TABS: Record<string, { title: string; render: () => JSX.Element }> = {
  profile: { title: 'Mipangilio ya Biashara', render: () => <SettingsPage /> },
  registration: { title: 'Usajili wa Biashara', render: () => <BusinessRegistrationPanel /> },
  payments: { title: 'Usimamizi wa Malipo', render: () => <LipaNambaPage /> },
};

export const UnifiedSettingsPage = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [sheetTab, setSheetTab] = useState<string | null>(null);

  const tabs = [
    { id: 'profile', label: 'Profaili', icon: Settings },
    { id: 'registration', label: 'Sheria', icon: ShieldAlert },
    { id: 'payments', label: 'Malipo', icon: Wallet },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { id: 'nurath', label: 'Nurath', icon: Sparkles },
    { id: 'subscription', label: 'Michango', icon: Crown },
    { id: 'ads', label: 'Matangazo', icon: Megaphone },
    { id: 'install', label: 'App', icon: Smartphone },
    { id: 'qa', label: 'Mobile QA', icon: ClipboardCheck },
    { id: 'help', label: 'Msaada', icon: Headphones },
  ];

  useEffect(() => {
    const tab = searchParams.get('tab') || 'overview';
    if (SHEET_TABS[tab]) {
      setSheetTab(tab);
    } else {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const activeContent = useMemo(() => {
    switch (activeTab) {
      case 'whatsapp': return <WhatsAppPage />;
      case 'nurath': return <NurathSettingsPanel />;
      case 'subscription': return <SubscriptionPage embedded />;
      case 'ads': return <AdsManagerPage />;
      case 'install': return <PWAInstallerPage />;
      case 'help': return <HelpPage />;
      default:
        return (
          <div className="p-4">
            <div className="rounded-3xl border border-border/60 p-5 text-sm text-muted-foreground">
              Chagua kipengele hapo juu. Profaili, Sheria na Malipo hufunguka upande wa kulia.
            </div>
          </div>
        );
    }
  }, [activeTab]);

  const handleTabChange = (tabId: string) => {
    if (tabId === 'qa') {
      navigate('/mobile-qa');
      return;
    }
    if (SHEET_TABS[tabId]) {
      setSheetTab(tabId);
    } else {
      setActiveTab(tabId);
    }
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    setSearchParams(next);
  };

  const closeSheet = () => {
    setSheetTab(null);
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'overview');
    setSearchParams(next);
  };

  const sheet = sheetTab ? SHEET_TABS[sheetTab] : null;

  return (
    <div className="overflow-x-hidden pb-24">
      <div className="p-4 pb-2">
        <h1 className="text-lg font-bold text-foreground">Mipangilio</h1>
        <p className="text-xs text-muted-foreground">Simamia akaunti, sheria, malipo, michango, na zana</p>
      </div>

      <div className="px-4">
        <div className={isMobile ? 'grid grid-cols-4 gap-1.5' : 'flex flex-wrap gap-2'}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id || sheetTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-2xl text-[10px] font-medium transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0 overflow-x-hidden">{activeContent}</div>

      <Sheet open={!!sheet} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <SheetHeader className="px-4 pt-4">
            <SheetTitle>{sheet?.title}</SheetTitle>
          </SheetHeader>
          <div className="min-w-0">{sheet?.render()}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default UnifiedSettingsPage;

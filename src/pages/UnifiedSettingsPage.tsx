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
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { KidukaUpdates } from '@/components/KidukaUpdates';
import { Button } from '@/components/ui/button';

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

  const { can, permissions } = usePermissions();
  const { userProfile } = useAuth();
  const isOwner = userProfile?.role === 'owner' || userProfile?.role === 'super_admin';
  const allTabs = [
    { id: 'profile', label: 'Profaili', icon: Settings },
    { id: 'registration', label: 'Sheria', icon: ShieldAlert, perm: 'compliance_manage' },
    { id: 'payments', label: 'Malipo', icon: Wallet, perm: 'payment_numbers_manage' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, perm: 'whatsapp_send' },
    { id: 'nurath', label: 'Nurath', icon: Sparkles },
    { id: 'subscription', label: 'Michango', icon: Crown, perm: 'billing_view' },
    { id: 'ads', label: 'Matangazo', icon: Megaphone, perm: 'ads_manage' },
    { id: 'install', label: 'App', icon: Smartphone },
    { id: 'updates', label: 'Kiduka Update', icon: Sparkles },
    { id: 'qa', label: 'Mobile QA', icon: ClipboardCheck, perm: '__owner' },
    { id: 'help', label: 'ServiceHUB', icon: Headphones },
  ];
  const allowed = (id: string) => {
    const t = allTabs.find(x => x.id === id);
    if (!t || !t.perm || isOwner) return true;
    return t.perm !== '__owner' && can(t.perm);
  };
  const tabs = allTabs.filter(t => allowed(t.id));

  useEffect(() => {
    const tab = searchParams.get('tab') || 'overview';
    if (!allowed(tab)) { setSheetTab(null); setActiveTab('overview'); return; }
    if (SHEET_TABS[tab]) {
      setSheetTab(tab);
    } else {
      setActiveTab(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, permissions, isOwner]);

  const activeContent = useMemo(() => {
    if (!allowed(activeTab)) return null;
    switch (activeTab) {
      case 'whatsapp': return <WhatsAppPage />;
      case 'nurath': return <NurathSettingsPanel />;
      case 'subscription': return <SubscriptionPage embedded />;
      case 'ads': return <AdsManagerPage />;
      case 'install': return <PWAInstallerPage />;
      case 'updates': return <KidukaUpdates />;
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
  }, [activeTab, permissions, isOwner]);

  const handleTabChange = (tabId: string) => {
    if (!allowed(tabId)) return;
    if (tabId === 'help') { navigate('/servicehub'); return; }
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

  const sheet = sheetTab && allowed(sheetTab) ? SHEET_TABS[sheetTab] : null;

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
              <Button
                variant="ghost"
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-2xl text-[10px] font-medium transition-colors ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Button>
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

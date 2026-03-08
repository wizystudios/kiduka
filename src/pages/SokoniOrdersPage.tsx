import { useEffect, useState } from "react";
import SokoniOrderManagement from "@/components/SokoniOrderManagement";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, BellRing, Package, Tag, RotateCcw, Store } from "lucide-react";
import { toast } from "sonner";
import { CouponCodeManager } from "@/components/CouponCodeManager";
import { ReturnRequestManager } from "@/components/ReturnRequestManager";
import { StoreSettings } from "@/components/StoreSettings";

export const SokoniOrdersPage = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    document.title = "Oda za Sokoni - Kiduka POS";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Fuatilia na simamia oda za wateja kutoka Sokoni kwa Kiduka POS');
    
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();

    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const { requestNotificationPermission } = useOrderNotifications({
    sellerId: userId,
    enabled: true,
    onNewOrder: (order) => {
      console.log('New order received via notification hook:', order);
    },
  });

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    if (!granted) toast.error('Tafadhali ruhusu arifa kwenye browser yako');
  };

  return (
    <main className="p-2 pb-20 space-y-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold">Sokoni Dashboard</h1>
          <p className="text-xs text-muted-foreground">Oda, coupons, returns, na duka lako.</p>
        </div>
        
        {!notificationsEnabled ? (
          <Button variant="outline" size="sm" onClick={handleEnableNotifications} className="gap-1 text-xs">
            <Bell className="h-3 w-3" /> Washa Arifa
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled className="gap-1 text-xs">
            <BellRing className="h-3 w-3" /> Arifa Zimewashwa
          </Button>
        )}
      </header>

      <Tabs defaultValue="orders">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="orders" className="text-xs gap-1">
            <Package className="h-3 w-3" /> Oda
          </TabsTrigger>
          <TabsTrigger value="coupons" className="text-xs gap-1">
            <Tag className="h-3 w-3" /> Coupons
          </TabsTrigger>
          <TabsTrigger value="returns" className="text-xs gap-1">
            <RotateCcw className="h-3 w-3" /> Returns
          </TabsTrigger>
          <TabsTrigger value="store" className="text-xs gap-1">
            <Store className="h-3 w-3" /> Duka
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <SokoniOrderManagement />
        </TabsContent>

        <TabsContent value="coupons">
          <CouponCodeManager />
        </TabsContent>

        <TabsContent value="returns">
          <ReturnRequestManager />
        </TabsContent>

        <TabsContent value="store">
          <StoreSettings />
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default SokoniOrdersPage;

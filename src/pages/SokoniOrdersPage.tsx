import { useEffect, useState } from "react";
import SokoniOrderManagement from "@/components/SokoniOrderManagement";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Bell, BellRing } from "lucide-react";
import { toast } from "sonner";

export const SokoniOrdersPage = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    document.title = "Oda za Sokoni - Kiduka POS";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Fuatilia na simamia oda za wateja kutoka Sokoni kwa Kiduka POS');
    
    // Get current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();

    // Check notification permission
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
    if (!granted) {
      toast.error('Tafadhali ruhusu arifa kwenye browser yako');
    }
  };

  return (
    <main className="p-2 pb-20 space-y-2">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold">Oda za Sokoni</h1>
          <p className="text-xs text-muted-foreground">Angalia oda mpya, badilisha status, na wasiliana na mteja.</p>
        </div>
        
        {/* Notification toggle button */}
        {!notificationsEnabled && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnableNotifications}
            className="gap-1 text-xs"
          >
            <Bell className="h-3 w-3" />
            Washa Arifa
          </Button>
        )}
        {notificationsEnabled && (
          <Button
            variant="secondary"
            size="sm"
            disabled
            className="gap-1 text-xs"
          >
            <BellRing className="h-3 w-3" />
            Arifa Zimewashwa
          </Button>
        )}
      </header>
      <section aria-label="Sokoni orders management">
        <SokoniOrderManagement />
      </section>
    </main>
  );
};

export default SokoniOrdersPage;

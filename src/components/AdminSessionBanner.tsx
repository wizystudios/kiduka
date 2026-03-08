import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Shield } from 'lucide-react';

export const AdminSessionBanner = () => {
  const { user, userProfile } = useAuth();
  const [adminName, setAdminName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || userProfile?.role === 'super_admin') return;

    const check = async () => {
      const { data } = await supabase
        .from('admin_business_sessions')
        .select('admin_id')
        .eq('owner_id', user.id)
        .eq('active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.admin_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.admin_id)
          .maybeSingle();
        setAdminName(profile?.full_name || 'Admin');
      } else {
        setAdminName(null);
      }
    };

    check();

    const channel = supabase
      .channel('admin-session-banner')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_business_sessions',
        filter: `owner_id=eq.${user.id}`,
      }, () => check())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, userProfile?.role]);

  if (!adminName) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground text-center py-1.5 px-4 text-xs font-medium flex items-center justify-center gap-2">
      <Shield className="h-3.5 w-3.5" />
      <span>Admin ({adminName}) anadhibiti akaunti yako sasa hivi</span>
    </div>
  );
};

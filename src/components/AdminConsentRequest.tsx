import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shield, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface PendingSession {
  id: string;
  admin_id: string;
  reason: string | null;
  admin_name?: string;
}

export const AdminConsentRequest = () => {
  const { user, userProfile } = useAuth();
  const [pending, setPending] = useState<PendingSession | null>(null);

  useEffect(() => {
    if (!user?.id || userProfile?.role === 'super_admin') return;

    const check = async () => {
      const { data } = await supabase
        .from('admin_business_sessions' as any)
        .select('id, admin_id, reason')
        .eq('owner_id', user.id)
        .eq('consent_status', 'pending')
        .eq('active', true)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const row = data as any;
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', row.admin_id)
          .maybeSingle();
        setPending({ ...row, admin_name: profile?.full_name || 'Admin' });
      } else {
        setPending(null);
      }
    };

    check();

    const channel = supabase
      .channel('admin-consent-req')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'admin_business_sessions',
        filter: `owner_id=eq.${user.id}`,
      }, () => check())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, userProfile?.role]);

  const respond = async (approve: boolean) => {
    if (!pending) return;
    const { error } = await supabase
      .from('admin_business_sessions' as any)
      .update({
        consent_status: approve ? 'approved' : 'denied',
        consent_responded_at: new Date().toISOString(),
        active: approve,
      })
      .eq('id', pending.id);

    if (!error) {
      toast.success(approve ? 'Umemruhusu admin kuingia' : 'Umemzuia admin kuingia');
      setPending(null);
    }
  };

  if (!pending) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-background rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="text-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold">Ombi la Admin</h2>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>{pending.admin_name}</strong> anaomba ruhusa ya kuingia kwenye akaunti yako ya biashara.
          </p>
          {pending.reason && (
            <p className="text-xs text-muted-foreground mt-2 bg-muted/50 rounded-xl p-2">
              Sababu: {pending.reason}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 rounded-full border-destructive text-destructive hover:bg-destructive/10"
            onClick={() => respond(false)}
          >
            <X className="h-4 w-4 mr-1" /> Kataa
          </Button>
          <Button
            className="flex-1 rounded-full"
            onClick={() => respond(true)}
          >
            <Check className="h-4 w-4 mr-1" /> Ruhusu
          </Button>
        </div>
        <p className="text-[10px] text-center text-muted-foreground">
          Ukimruhusu, admin ataweza kuona na kusimamia data yako ya biashara
        </p>
      </div>
    </div>
  );
};

import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type ConsentMap = {
  security: boolean;
  operations: boolean;
  subscription: boolean;
  marketplace: boolean;
};

const DEFAULTS: ConsentMap = {
  security: true,
  operations: true,
  subscription: true,
  marketplace: true,
};

const ITEMS: { key: keyof ConsentMap; title: string; desc: string }[] = [
  { key: 'security', title: 'Usalama', desc: 'Kuingia mpya na mabadiliko ya akaunti' },
  { key: 'operations', title: 'Shughuli', desc: 'Mauzo makubwa, stock ndogo, deni jipya' },
  { key: 'subscription', title: 'Michango', desc: 'Hali ya malipo na kuidhinishwa' },
  { key: 'marketplace', title: 'Sokoni', desc: 'Order mpya, maoni, na malalamiko' },
];

export const EmailConsentSettings = () => {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [consent, setConsent] = useState<ConsentMap>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('email_notifications_enabled, email_consent')
        .eq('id', user.id)
        .maybeSingle();
      if (data) {
        setEnabled(data.email_notifications_enabled ?? true);
        setConsent({ ...DEFAULTS, ...((data.email_consent as any) || {}) });
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        email_notifications_enabled: enabled,
        email_consent: consent as any,
      })
      .eq('id', user.id);
    setSaving(false);
    if (error) toast.error('Imeshindwa kuhifadhi');
    else toast.success('Mipangilio ya barua imehifadhiwa');
  };

  if (loading) return null;

  return (
    <div className="border-t border-border pt-4 space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">Barua Pepe (Email)</p>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-muted/40 p-3">
        <div>
          <p className="text-sm font-medium">Pokea barua kutoka Kiduka</p>
          <p className="text-xs text-muted-foreground">Washa au zima zote kwa pamoja</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className={`space-y-2 ${enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        {ITEMS.map((item) => (
          <div key={item.key} className="flex items-center justify-between rounded-2xl border border-border p-3">
            <div className="pr-3">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <Switch
              checked={consent[item.key]}
              onCheckedChange={(v) => setConsent((c) => ({ ...c, [item.key]: v }))}
            />
          </div>
        ))}
      </div>

      <Button onClick={save} disabled={saving} className="rounded-full w-full">
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Hifadhi mipangilio
      </Button>
    </div>
  );
};

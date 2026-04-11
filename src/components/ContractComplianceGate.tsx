import { useEffect, useMemo, useState } from 'react';
import { Check, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useBusinessGovernance } from '@/hooks/useBusinessGovernance';
import { useAuth } from '@/hooks/useAuth';
import { KidukaLogo } from './KidukaLogo';
import { supabase } from '@/integrations/supabase/client';

interface ContractComplianceGateProps {
  children: React.ReactNode;
}

const ASSISTANT_TC = [
  'Kutumia mfumo kwa uaminifu na kufuata maelekezo ya mmiliki wa biashara.',
  'Kulinda siri za biashara na kutoshiriki taarifa za biashara na mtu mwingine.',
  'Kutotumia mfumo kwa biashara haramu au udanganyifu.',
  'Kukubali kuwa Admin ana haki ya kuingia kwenye akaunti yako kwa ukaguzi wa msaada.',
  'Kukubali kuwa akaunti yako inaweza kufutwa ikiwa masharti yamekiukwa.',
];

export const ContractComplianceGate = ({ children }: ContractComplianceGateProps) => {
  const { user, userProfile } = useAuth();
  const { loading, activeAdminSession } = useBusinessGovernance();
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assistantTcAccepted, setAssistantTcAccepted] = useState<boolean | null>(null);
  const [assistantTcLoading, setAssistantTcLoading] = useState(true);

  const isSuperAdmin = userProfile?.role === 'super_admin';
  const isAssistant = userProfile?.role === 'assistant';

  useEffect(() => {
    const checkAssistantTc = async () => {
      if (!isAssistant || !user?.id) {
        setAssistantTcLoading(false);
        return;
      }
      const { data } = await supabase
        .from('user_activities')
        .select('id')
        .eq('user_id', user.id)
        .eq('activity_type', 'accepted_terms_and_conditions')
        .limit(1);

      setAssistantTcAccepted((data?.length || 0) > 0);
      setAssistantTcLoading(false);
    };
    checkAssistantTc();
  }, [isAssistant, user?.id]);

  const handleAssistantAcceptTc = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    await supabase.from('user_activities').insert({
      user_id: user.id,
      activity_type: 'accepted_terms_and_conditions',
      description: 'Msaidizi amekubali masharti ya matumizi',
    });
    setAssistantTcAccepted(true);
    setSubmitting(false);
    toast.success('Masharti yamekubaliwa. Karibu!');
  };

  const ownerBanner = useMemo(() => {
    if (!activeAdminSession || isSuperAdmin) return null;
    return (
      <div className="mb-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        ⚠️ Admin yupo ndani ya akaunti yako sasa kwa ukaguzi wa msaada.
      </div>
    );
  }, [activeAdminSession, isSuperAdmin]);

  if (loading || assistantTcLoading) return <>{children}</>;

  if (isAssistant && assistantTcAccepted === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-lg">
          <div className="mb-4 flex flex-col items-center justify-center py-4">
            <KidukaLogo size="xl" animate />
            <h1 className="mt-3 text-xl font-bold">Karibu Kiduka POS</h1>
            <p className="text-sm text-muted-foreground">Kabla ya kuendelea, soma na ukubali masharti</p>
          </div>

          <Card className="rounded-3xl">
            <CardContent className="space-y-4 p-6">
              <h3 className="text-lg font-bold">Masharti ya Matumizi — Msaidizi</h3>
              <div className="space-y-3">
                {ASSISTANT_TC.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-2 text-sm pt-2">
                <input checked={agree} onChange={(e) => setAgree(e.target.checked)} type="checkbox" className="mt-1" />
                Nimeisoma na kuikubali masharti yote ya matumizi.
              </label>

              <Button className="w-full rounded-2xl" onClick={handleAssistantAcceptTc} disabled={!agree || submitting}>
                {submitting ? 'Inakubali...' : 'Kubali na Endelea'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      {ownerBanner}
      {children}
    </>
  );
};

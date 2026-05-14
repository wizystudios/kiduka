import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { KidukaLogo } from '@/components/KidukaLogo';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const FN_URL = `https://qbjcuenvjrflfbdshogq.supabase.co/functions/v1/handle-email-unsubscribe`;
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFiamN1ZW52anJmbGZiZHNob2dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyNTMxNjEsImV4cCI6MjA3NDgyOTE2MX0.ZTxAEV2kt_RK9SL6JJK9g3ufKcYjDPaF2w6hU7MsXAg";

type State = 'loading' | 'valid' | 'already' | 'invalid' | 'submitting' | 'done' | 'error';

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    fetch(`${FN_URL}?token=${encodeURIComponent(token)}`, { headers: { apikey: ANON } })
      .then((r) => r.json())
      .then((data) => {
        if (data.valid === true) setState('valid');
        else if (data.reason === 'already_unsubscribed') setState('already');
        else setState('invalid');
      })
      .catch(() => setState('invalid'));
  }, [token]);

  const confirm = async () => {
    setState('submitting');
    try {
      const { data, error } = await supabase.functions.invoke('handle-email-unsubscribe', { body: { token } });
      if (error) throw error;
      if (data?.success) setState('done');
      else if (data?.reason === 'already_unsubscribed') setState('already');
      else setState('error');
    } catch { setState('error'); }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex flex-col items-center gap-2">
          <KidukaLogo />
          <p className="text-xs text-muted-foreground">Mipangilio ya Email</p>
        </div>

        {state === 'loading' && (<div className="flex flex-col items-center gap-3 py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="text-sm text-muted-foreground">Inathibitisha…</p></div>)}

        {state === 'valid' && (
          <div className="space-y-4">
            <h1 className="text-xl font-bold">Acha kupokea email?</h1>
            <p className="text-sm text-muted-foreground">Bonyeza ili kuthibitisha. Bado utaweza kuingia na kutumia akaunti yako.</p>
            <Button onClick={confirm} className="rounded-full w-full">Thibitisha — Acha Email</Button>
          </div>
        )}

        {state === 'submitting' && (<div className="flex flex-col items-center gap-3 py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="text-sm">Inahifadhi…</p></div>)}

        {state === 'done' && (
          <div className="space-y-3 py-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
            <h1 className="text-xl font-bold">Umeacha kupokea email</h1>
            <p className="text-sm text-muted-foreground">Hutapokea email zaidi kwenye anwani hii. Unaweza kubadilisha tena ndani ya app.</p>
          </div>
        )}

        {state === 'already' && (
          <div className="space-y-3 py-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
            <h1 className="text-xl font-bold">Tayari umeacha</h1>
            <p className="text-sm text-muted-foreground">Anwani hii tayari haipokei email kutoka Kiduka.</p>
          </div>
        )}

        {(state === 'invalid' || state === 'error') && (
          <div className="space-y-3 py-4">
            <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
            <h1 className="text-xl font-bold">Link haifanyi kazi</h1>
            <p className="text-sm text-muted-foreground">Token imeisha au si sahihi. Wasiliana nasi kwa msaada.</p>
          </div>
        )}
      </div>
    </div>
  );
}

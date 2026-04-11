
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailConfirmationPageProps {
  email: string;
  onBackToSignUp: () => void;
}

export const EmailConfirmationPage = ({ email, onBackToSignUp }: EmailConfirmationPageProps) => {
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      });
      
      if (error) throw error;
      toast.success('Barua pepe ya uthibitisho imetumwa tena!');
    } catch (error: any) {
      toast.error('Imeshindwa kutuma barua pepe: ' + error.message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-3">
      <Card className="w-full max-w-md border border-border/40 bg-card/95 shadow-xl backdrop-blur-sm">
        <CardHeader className="space-y-3 pb-2 text-center">
          <div className="relative flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <div className="absolute right-[calc(50%-2rem)] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CheckCircle className="h-3.5 w-3.5" />
            </div>
          </div>

          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-foreground">Kagua Barua Pepe Yako</CardTitle>
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">Tumetuma kiungo cha uthibitisho kwenye:</p>
              <p className="mt-1 break-all text-sm font-semibold text-foreground">{email}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid gap-2">
            {[
              ['1', 'Fungua inbox au spam yako'],
              ['2', 'Bonyeza kiungo cha uthibitisho'],
              ['3', 'Rudi uanze kutumia Kiduka'],
            ].map(([step, text]) => (
              <div key={step} className="flex items-center gap-3 rounded-xl bg-muted/40 p-2.5">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {step}
                </div>
                <p className="text-sm text-foreground">{text}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 py-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 animate-pulse text-primary" />
            <span>Tunasubiri uthibitisho wako...</span>
          </div>

          <div className="space-y-2">
            <Button onClick={handleResendEmail} disabled={isResending} className="h-11 w-full rounded-full font-semibold">
              {isResending ? 'Inatuma...' : 'Tuma Tena Barua Pepe'}
            </Button>

            <Button variant="outline" onClick={onBackToSignUp} className="h-11 w-full rounded-full font-semibold">
              <ArrowRight className="mr-2 h-4 w-4 rotate-180" />
              Rudi Nyuma
            </Button>
          </div>

          <div className="rounded-2xl bg-muted/40 p-3 text-center text-[11px] text-muted-foreground">
            Angalia spam folder, hakikisha barua pepe ni sahihi, kisha jaribu tena baada ya dakika chache.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KidukaLogo } from '@/components/KidukaLogo';
import { Mail, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Ingiza barua pepe sahihi');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      setSent(true);
      toast.success('Kiungo cha kubadilisha nywila kimetumwa!');
    } catch (error: any) {
      toast.error(error.message || 'Imeshindwa kutuma');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10 px-6 py-4">
      {/* Logo */}
      <div className="mb-4">
        <KidukaLogo size="lg" />
      </div>

      {/* Icon */}
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        {sent ? (
          <CheckCircle className="h-8 w-8 text-primary" />
        ) : (
          <KeyRound className="h-8 w-8 text-primary" />
        )}
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-foreground mb-2">
        {sent ? 'Angalia Barua Pepe' : 'Sahau Nywila?'}
      </h1>
      <p className="mb-5 max-w-xs text-center text-sm text-muted-foreground">
        {sent
          ? `Kiungo cha kubadilisha nywila kimetumwa kwenye ${email}. Angalia inbox yako.`
          : 'Ingiza barua pepe yako na tutakutumia kiungo cha kubadilisha nywila'}
      </p>

      {/* Form */}
      <div className="w-full max-w-sm space-y-3">
        {!sent ? (
          <>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Barua pepe yako"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                className="pl-10 h-12 bg-transparent border-0 border-b-2 border-border rounded-none text-lg focus:ring-0 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                autoFocus
              />
            </div>

            <Button
              onClick={handleSend}
              disabled={loading || !email}
              className="h-11 w-full text-base font-medium"
            >
              {loading ? 'Inatuma...' : 'Tuma Kiungo'}
            </Button>
          </>
        ) : (
          <Button
            onClick={() => navigate('/auth')}
            className="h-11 w-full text-base font-medium"
          >
            Rudi Kuingia
          </Button>
        )}
      </div>

      {/* Back link */}
      {!sent && (
        <button
          type="button"
          onClick={() => navigate('/auth')}
          className="mt-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Rudi kwenye kuingia
        </button>
      )}
    </div>
  );
};

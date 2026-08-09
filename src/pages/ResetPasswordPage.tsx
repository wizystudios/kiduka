import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KidukaLogo } from '@/components/KidukaLogo';
import { Lock, Eye, EyeOff, CheckCircle, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { logActivity } from '@/hooks/useActivityLogger';

type Phase = 'checking' | 'invalid' | 'ready' | 'success';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('checking');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);

  const describeLinkError = (raw?: string | null) => {
    const msg = (raw || '').toLowerCase();
    if (msg.includes('expired')) return 'Kiungo kimekwisha muda. Viungo vya nywila hudumu saa 1 tu.';
    if (msg.includes('already') || msg.includes('used') || msg.includes('invalid'))
      return 'Kiungo hiki kimeshatumika au si sahihi. Kila kiungo hutumika mara moja tu.';
    if (msg.includes('otp')) return 'Kiungo hakikuweza kuthibitishwa. Omba kiungo kipya.';
    return null;
  };

  // Establish the recovery session from whichever link format Supabase sent
  useEffect(() => {
    let cancelled = false;

    const establish = async () => {
      try {
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        const code = url.searchParams.get('code');
        const tokenHash = url.searchParams.get('token_hash') || hash.get('token_hash');
        const urlError =
          url.searchParams.get('error_description') || hash.get('error_description') || hash.get('error');

        if (urlError) {
          setLinkError(describeLinkError(urlError) || decodeURIComponent(urlError));
          window.history.replaceState({}, '', '/reset-password');
          setPhase('invalid');
          return;
        }

        let authError: string | null = null;
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          authError = error?.message ?? null;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          authError = error?.message ?? null;
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash });
          authError = error?.message ?? null;
        }

        // Clean sensitive tokens out of the address bar
        if (window.location.hash || code || tokenHash) {
          window.history.replaceState({}, '', '/reset-password');
        }

        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          setPhase('ready');
        } else {
          setLinkError(describeLinkError(authError));
          setPhase('invalid');
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error('Recovery session error:', err);
        setLinkError(describeLinkError(err?.message));
        setPhase('invalid');
      }
    };


    establish();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setPhase((prev) => (prev === 'success' ? prev : 'ready'));
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const checkPasswordPolicy = (pw: string) => ({
    minLength: pw.length >= 8,
    hasNumbers: (pw.match(/\d/g) || []).length >= 3,
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
    hasUppercase: /[A-Z]/.test(pw),
  });

  const handleReset = async () => {
    if (password !== confirmPassword) {
      toast.error('Nywila hazifanani');
      return;
    }

    const policy = checkPasswordPolicy(password);
    if (!Object.values(policy).every(Boolean)) {
      toast.error('Nywila haikidhi masharti ya usalama');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Kikao kimekwisha muda. Omba kiungo kipya.');
        setPhase('invalid');
        return;
      }

      const { data, error } = await supabase.auth.updateUser({
        password,
        data: { pw_policy_compliant: true, legacy_weak_password: false },
      });
      if (error) throw error;

      const userId = data.user?.id || session.user.id;
      localStorage.setItem(`kiduka_pw_updated_${userId}`, 'true');

      logActivity('password_reset', 'Nywila imebadilishwa kupitia reset link');

      // Guarantee the user ends up signed in with the NEW password, even if the
      // recovery session was single-use and got invalidated by the update.
      const email = data.user?.email || session.user.email;
      if (email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) console.warn('Post-reset sign-in fallback failed:', signInError.message);
      }

      setPhase('success');
      toast.success('Nywila imebadilishwa! Unaingia sasa...');

      // User remains signed in with the new password -> go straight to the app
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
    } catch (error: any) {
      console.error('Password update failed:', error);
      const friendly = describeLinkError(error?.message);
      if (friendly) {
        setLinkError(friendly);
        setPhase('invalid');
      }
      toast.error(friendly || error?.message || 'Imeshindwa kubadilisha nywila');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!resendEmail || !resendEmail.includes('@')) {
      toast.error('Ingiza barua pepe sahihi');
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Kiungo kipya kimetumwa! Angalia barua pepe yako.');
      setLinkError('Kiungo kipya kimetumwa. Fungua barua pepe yako ndani ya saa 1.');
    } catch (err: any) {
      toast.error(err?.message || 'Imeshindwa kutuma kiungo');
    } finally {
      setResending(false);
    }
  };


  if (phase === 'checking') {
    return (
      <div className="flex h-[100dvh] max-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4">
        <KidukaLogo size="lg" />
        <Loader2 className="mt-6 h-6 w-6 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">Inathibitisha kiungo...</p>
      </div>
    );
  }

  if (phase === 'invalid') {
    return (
      <div className="flex h-[100dvh] max-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10 px-6">
        <KidukaLogo size="lg" />
        <h1 className="mt-6 text-xl font-bold">Kiungo hakifanyi kazi</h1>
        <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground">
          {linkError ||
            'Kiungo hiki kimekwisha muda au kimeshatumika. Omba kiungo kipya hapa chini — kitatumwa kwenye barua pepe yako.'}
        </p>

        <div className="mt-5 w-full max-w-sm space-y-3">
          <Input
            type="email"
            placeholder="Barua pepe yako"
            value={resendEmail}
            onChange={(e) => setResendEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleResend()}
            className="h-12 rounded-2xl"
          />
          <Button onClick={handleResend} disabled={resending || !resendEmail} className="h-11 w-full rounded-full">
            {resending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Inatuma...</>
            ) : (
              <><Mail className="mr-2 h-4 w-4" />Tuma Kiungo Kipya</>
            )}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/auth')} className="h-11 w-full rounded-full">
            Rudi Kuingia
          </Button>
        </div>
      </div>
    );
  }


  if (phase === 'success') {
    return (
      <div className="flex h-[100dvh] max-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4">
        <CheckCircle className="h-16 w-16 text-primary mb-4 animate-in zoom-in duration-500" />
        <h1 className="text-2xl font-bold">Nywila Imebadilishwa!</h1>
        <p className="text-muted-foreground mt-2">Unaelekezwa kwenye akaunti yako...</p>
      </div>
    );
  }

  const policy = checkPasswordPolicy(password);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10 px-6 py-4">
      <KidukaLogo size="lg" />
      <h1 className="mt-4 mb-1 text-2xl font-bold">Weka Nywila Mpya</h1>
      <p className="mb-4 text-sm text-muted-foreground">Ingiza nywila mpya ya akaunti yako</p>

      <div className="w-full max-w-sm space-y-3">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Nywila mpya"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10 h-12 bg-transparent border-0 border-b-2 border-border rounded-none text-lg focus:ring-0 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {password.length > 0 && (
          <div className="space-y-1 rounded-2xl bg-muted/50 p-2.5">
            <p className={`text-xs ${policy.minLength ? 'text-primary' : 'text-muted-foreground'}`}>
              {policy.minLength ? '✓' : '○'} Angalau herufi 8
            </p>
            <p className={`text-xs ${policy.hasNumbers ? 'text-primary' : 'text-muted-foreground'}`}>
              {policy.hasNumbers ? '✓' : '○'} Angalau nambari 3
            </p>
            <p className={`text-xs ${policy.hasSpecial ? 'text-primary' : 'text-muted-foreground'}`}>
              {policy.hasSpecial ? '✓' : '○'} Herufi maalum (!@#$...)
            </p>
            <p className={`text-xs ${policy.hasUppercase ? 'text-primary' : 'text-muted-foreground'}`}>
              {policy.hasUppercase ? '✓' : '○'} Herufi kubwa (A-Z)
            </p>
          </div>
        )}

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Thibitisha nywila"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleReset()}
            className={`pl-10 h-12 bg-transparent border-0 border-b-2 border-border rounded-none text-lg focus:ring-0 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 ${
              confirmPassword && confirmPassword !== password ? 'border-destructive' : ''
            }`}
          />
        </div>
        {confirmPassword && confirmPassword !== password && (
          <p className="text-xs text-destructive pl-2">Nywila hazifanani</p>
        )}

        <Button
          onClick={handleReset}
          disabled={loading || !password || !confirmPassword}
          className="mt-2 h-11 w-full text-base font-medium"
        >
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Inabadilisha...</> : 'Badilisha Nywila'}
        </Button>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KidukaLogo } from '@/components/KidukaLogo';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success('Nywila imebadilishwa!');
      setTimeout(() => navigate('/auth'), 2000);
    } catch (error: any) {
      toast.error(error.message || 'Imeshindwa kubadilisha nywila');
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col items-center justify-center p-6">
        <KidukaLogo size="lg" />
        <p className="mt-6 text-muted-foreground">Kiungo si sahihi au kimekwisha muda.</p>
        <Button onClick={() => navigate('/auth')} className="mt-4">Rudi Kuingia</Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col items-center justify-center p-6">
        <CheckCircle className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-2xl font-bold">Nywila Imebadilishwa!</h1>
        <p className="text-muted-foreground mt-2">Unaelekezwa kwenye ukurasa wa kuingia...</p>
      </div>
    );
  }

  const policy = checkPasswordPolicy(password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col items-center justify-center p-6">
      <KidukaLogo size="lg" />
      <h1 className="text-2xl font-bold mt-6 mb-2">Weka Nywila Mpya</h1>
      <p className="text-sm text-muted-foreground mb-8">Ingiza nywila mpya ya akaunti yako</p>

      <div className="w-full max-w-sm space-y-4">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="Nywila mpya"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10 h-14 bg-transparent border-0 border-b-2 border-border rounded-none text-lg focus:ring-0 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
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
          <div className="p-3 bg-muted/50 rounded-2xl space-y-1">
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
            className={`pl-10 h-14 bg-transparent border-0 border-b-2 border-border rounded-none text-lg focus:ring-0 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 ${
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
          className="w-full h-12 text-base font-medium mt-4"
        >
          {loading ? 'Inasubiri...' : 'Badilisha Nywila'}
        </Button>
      </div>
    </div>
  );
};

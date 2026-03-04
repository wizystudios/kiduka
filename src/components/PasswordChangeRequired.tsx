import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KidukaLogo } from './KidukaLogo';
import { useAuth } from '@/hooks/useAuth';

interface PasswordPolicy {
  minLength: boolean;
  hasNumbers: boolean;
  hasSpecial: boolean;
  hasUppercase: boolean;
}

export const PasswordChangeRequired = () => {
  const { signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkPolicy = (pw: string): PasswordPolicy => ({
    minLength: pw.length >= 8,
    hasNumbers: (pw.match(/\d/g) || []).length >= 3,
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
    hasUppercase: /[A-Z]/.test(pw),
  });

  const policy = checkPolicy(newPassword);
  const allPassed = Object.values(policy).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async () => {
    if (!allPassed) {
      toast.error('Nywila mpya haikidhi masharti yote');
      return;
    }
    if (!passwordsMatch) {
      toast.error('Nywila hazilingani');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Mark password as updated
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.setItem(`kiduka_pw_updated_${user.id}`, 'true');
      }

      toast.success('Nywila imebadilishwa! Ingia tena na nywila mpya.');
      await signOut();
    } catch (error: any) {
      toast.error(error.message || 'Imeshindwa kubadilisha nywila');
    } finally {
      setLoading(false);
    }
  };

  const PolicyItem = ({ passed, label }: { passed: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {passed ? (
        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
      <span className={passed ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}>{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col items-center justify-center p-6">
      <KidukaLogo size="lg" />
      
      <div className="mt-6 mb-4 flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">Badilisha Nywila</h1>
      </div>
      
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-sm">
        Kwa usalama wa akaunti yako, tafadhali weka nywila mpya inayokidhi masharti ya usalama.
      </p>

      <div className="w-full max-w-sm space-y-4">
        {/* Current password */}
        <div className="space-y-1">
          <Label>Nywila ya Sasa</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nywila yako ya sasa"
              className="pl-10 pr-10"
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div className="space-y-1">
          <Label>Nywila Mpya</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nywila mpya"
              className="pl-10 pr-10"
            />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Policy checklist */}
        {newPassword.length > 0 && (
          <div className="p-3 bg-muted/50 rounded-2xl space-y-1.5">
            <PolicyItem passed={policy.minLength} label="Angalau herufi 8" />
            <PolicyItem passed={policy.hasNumbers} label="Angalau nambari 3" />
            <PolicyItem passed={policy.hasSpecial} label="Angalau herufi moja maalum (!@#$...)" />
            <PolicyItem passed={policy.hasUppercase} label="Angalau herufi moja kubwa (A-Z)" />
          </div>
        )}

        {/* Confirm password */}
        <div className="space-y-1">
          <Label>Thibitisha Nywila</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Rudia nywila mpya"
          />
          {confirmPassword && !passwordsMatch && (
            <p className="text-xs text-destructive">Nywila hazilingani</p>
          )}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !allPassed || !passwordsMatch}
          className="w-full rounded-2xl h-12"
        >
          {loading ? 'Inabadilisha...' : 'Badilisha Nywila'}
        </Button>
      </div>
    </div>
  );
};

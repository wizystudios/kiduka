import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KidukaLogo } from '@/components/KidukaLogo';
import { Mail, Lock, User, Eye, EyeOff, Phone, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { EmailConfirmationPage } from '@/components/EmailConfirmationPage';
import { normalizeTzPhoneDigits } from '@/utils/phoneUtils';
type AuthStep = 'method' | 'identifier' | 'password' | 'name';

export const AuthPage = () => {
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<AuthStep>('identifier');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  if (user?.email_confirmed_at) {
    return <Navigate to="/dashboard" replace />;
  }

  const getIdentifier = () => authMethod === 'email' ? email : phone;

  const handleNextStep = () => {
    if (step === 'identifier') {
      const identifier = getIdentifier();
      if (!identifier) {
        toast.error(authMethod === 'email' ? 'Ingiza barua pepe' : 'Ingiza namba ya simu');
        return;
      }
      if (authMethod === 'email' && !identifier.includes('@')) {
        toast.error('Barua pepe si sahihi');
        return;
      }
      if (authMethod === 'phone' && identifier.length < 9) {
        toast.error('Namba ya simu si sahihi');
        return;
      }
      setStep('password');
    } else if (step === 'password') {
      if (!password || password.length < 6) {
        toast.error('Nywila lazima iwe angalau herufi 6');
        return;
      }
      if (mode === 'signup') {
        setStep('name');
      } else {
        handleSignIn();
      }
    } else if (step === 'name') {
      if (!fullName.trim()) {
        toast.error('Ingiza jina lako');
        return;
      }
      handleSignUp();
    }
  };

  const handleBack = () => {
    if (step === 'password') {
      setStep('identifier');
    } else if (step === 'name') {
      setStep('password');
    }
  };

  const handleSignIn = async () => {
    const identifier = getIdentifier();
    if (!identifier || !password) {
      toast.error('Tafadhali jaza taarifa zote');
      return;
    }

    const normalizedPhone = authMethod === 'phone' ? normalizeTzPhoneDigits(phone) : '';
    if (authMethod === 'phone' && !normalizedPhone) {
      toast.error('Namba ya simu si sahihi');
      return;
    }

    setLoading(true);
    try {
      const loginEmail = authMethod === 'phone'
        ? `${normalizedPhone}@kiduka.phone`
        : email;

      await signIn(loginEmail, password);
      toast.success('Karibu tena!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    const identifier = getIdentifier();
    if (!fullName || !identifier || !password) {
      toast.error('Tafadhali jaza taarifa zote');
      return;
    }
    if (password.length < 6) {
      toast.error('Nywila lazima iwe angalau herufi 6');
      return;
    }

    const normalizedPhone = authMethod === 'phone' ? normalizeTzPhoneDigits(phone) : '';
    if (authMethod === 'phone' && !normalizedPhone) {
      toast.error('Namba ya simu si sahihi');
      return;
    }

    const signupEmail = authMethod === 'phone'
      ? `${normalizedPhone}@kiduka.phone`
      : email;

    setLoading(true);
    try {
      await signUp(signupEmail, password, fullName);

      // Save phone to profile (best-effort)
      if (authMethod === 'phone' && normalizedPhone) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ phone: normalizedPhone }).eq('id', user.id);
        }
      }
    } catch (error: any) {
      if (error.message === 'CONFIRMATION_REQUIRED') {
        setRegisteredEmail(signupEmail);
        setShowConfirmation(true);
        toast.success('Akaunti imeundwa!');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('identifier');
    setEmail('');
    setPhone('');
    setPassword('');
    setFullName('');
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    resetForm();
  };

  const switchAuthMethod = () => {
    setAuthMethod(authMethod === 'email' ? 'phone' : 'email');
    setEmail('');
    setPhone('');
  };

  if (showConfirmation) {
    return (
      <EmailConfirmationPage 
        email={registeredEmail}
        onBackToSignUp={() => {
          setShowConfirmation(false);
          setRegisteredEmail('');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <KidukaLogo size="lg" />
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center gap-2">
          {['identifier', 'password', ...(mode === 'signup' ? ['name'] : [])].map((s, i) => (
            <div 
              key={s} 
              className={`h-2 rounded-full transition-all ${
                step === s ? 'w-8 bg-primary' : 'w-2 bg-muted'
              }`} 
            />
          ))}
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground">
            {mode === 'signin' ? 'Karibu Tena' : 'Jisajili'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {step === 'identifier' && (authMethod === 'email' ? 'Ingiza barua pepe yako' : 'Ingiza namba ya simu yako')}
            {step === 'password' && 'Ingiza nywila yako'}
            {step === 'name' && 'Ingiza jina lako'}
          </p>
        </div>

        {/* Form Steps */}
        <div className="space-y-4">
          {step === 'identifier' && (
            <>
              {authMethod === 'email' ? (
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Barua pepe"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                    className="pl-10 h-14 bg-background/50 backdrop-blur border-border/50 rounded-xl text-lg"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="07XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                    className="pl-10 h-14 bg-background/50 backdrop-blur border-border/50 rounded-xl text-lg"
                    autoFocus
                  />
                </div>
              )}
              
              <Button
                type="button"
                variant="ghost"
                className="w-full text-primary"
                onClick={switchAuthMethod}
              >
                {authMethod === 'email' ? (
                  <>
                    <Phone className="h-4 w-4 mr-2" />
                    Tumia namba ya simu badala yake
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Tumia barua pepe badala yake
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'password' && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nywila"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                className="pl-10 pr-10 h-14 bg-background/50 backdrop-blur border-border/50 rounded-xl text-lg"
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
          )}

          {step === 'name' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Jina lako"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                className="pl-10 h-14 bg-background/50 backdrop-blur border-border/50 rounded-xl text-lg"
                autoFocus
              />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-2">
            {step !== 'identifier' && (
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl"
                onClick={handleBack}
                disabled={loading}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Button
              type="button"
              className="flex-1 h-12 rounded-xl text-base font-medium"
              onClick={handleNextStep}
              disabled={loading}
            >
              {loading ? 'Inasubiri...' : (
                <>
                  {step === 'name' ? (mode === 'signup' ? 'Jisajili' : 'Ingia') : 'Endelea'}
                  {step !== 'name' && <ArrowRight className="h-5 w-5 ml-2" />}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Switch Mode */}
        <div className="text-center">
          <button
            type="button"
            onClick={switchMode}
            className="text-primary hover:underline text-sm"
          >
            {mode === 'signin' ? 'Unda akaunti mpya' : 'Tayari una akaunti? Ingia'}
          </button>
        </div>
      </div>
    </div>
  );
};
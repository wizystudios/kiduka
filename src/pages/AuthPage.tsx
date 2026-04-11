import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KidukaLogo } from '@/components/KidukaLogo';
import { Mail, Lock, User, Eye, EyeOff, Phone, ArrowRight, ArrowLeft, Store } from 'lucide-react';
import { toast } from 'sonner';
import { EmailConfirmationPage } from '@/components/EmailConfirmationPage';
import { normalizeTzPhoneDigits } from '@/utils/phoneUtils';
import { supabase } from '@/integrations/supabase/client';

type AuthStep = 'method' | 'identifier' | 'password' | 'name';
type AuthMethod = 'email' | 'phone' | 'name';

export const AuthPage = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<AuthStep>('identifier');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  

  if (user?.email_confirmed_at) {
    return <Navigate to="/dashboard" replace />;
  }

  const getIdentifier = () => {
    if (authMethod === 'email') return email;
    if (authMethod === 'phone') return phone;
    return username; // name-based login
  };

  // Password policy for signup
  const checkPasswordPolicy = (pw: string) => ({
    minLength: pw.length >= 8,
    hasNumbers: (pw.match(/\d/g) || []).length >= 3,
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
    hasUppercase: /[A-Z]/.test(pw),
  });

  const handleNextStep = () => {
    if (step === 'identifier') {
      const identifier = getIdentifier();
      if (!identifier) {
        toast.error(
          authMethod === 'email' ? 'Ingiza barua pepe' :
          authMethod === 'phone' ? 'Ingiza namba ya simu' : 'Ingiza jina lako'
        );
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
      if (authMethod === 'name' && identifier.length < 3) {
        toast.error('Jina lazima liwe angalau herufi 3');
        return;
      }
      setStep('password');
    } else if (step === 'password') {
      if (!password || password.length < 8) {
        toast.error('Nywila lazima iwe angalau herufi 8');
        return;
      }
      // For signup, enforce strong password policy
      if (mode === 'signup') {
        const policy = checkPasswordPolicy(password);
        if (!Object.values(policy).every(Boolean)) {
          toast.error('Nywila haikidhi masharti ya usalama');
          return;
        }
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

    // Determine the login email
    let loginEmail: string;
    if (authMethod === 'phone') {
      loginEmail = `${normalizedPhone}@kiduka.phone`;
    } else if (authMethod === 'name') {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('email')
        .ilike('full_name', username)
        .limit(1);
      
      if (!profiles || profiles.length === 0 || !profiles[0].email) {
        toast.error('Jina hili halijapatikana. Jaribu barua pepe au simu.');
        return;
      }
      loginEmail = profiles[0].email;
    } else {
      loginEmail = email;
    }

    // Check if account is locked
    try {
      const { data: lockCheck } = await supabase.functions.invoke('check-login-attempt', {
        body: { action: 'check', email: loginEmail }
      });
      if (lockCheck?.locked) {
        toast.error('Akaunti imezuiwa kwa masaa 24. Wasiliana na msimamizi.');
        return;
      }
    } catch { /* proceed if check fails */ }

    setLoading(true);
    try {
      await signIn(loginEmail, password);

      // Reset attempts on success
      supabase.functions.invoke('check-login-attempt', {
        body: { action: 'reset', email: loginEmail }
      }).catch(() => {});

      toast.success('Karibu tena!');
    } catch (error: any) {
      // Record failed attempt
      try {
        const { data: attemptResult } = await supabase.functions.invoke('check-login-attempt', {
          body: { action: 'record_failure', email: loginEmail }
        });
        if (attemptResult?.locked) {
          toast.error('Akaunti imezuiwa kwa masaa 24 baada ya majaribio 5 yasiyofanikiwa!');
        } else if (attemptResult?.remaining !== undefined) {
          toast.error(`${error.message} (Majaribio ${attemptResult.remaining} yamebaki)`);
        } else {
          toast.error(error.message);
        }
      } catch {
        toast.error(error.message);
      }
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
    if (password.length < 8) {
      toast.error('Nywila lazima iwe angalau herufi 8');
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
    setUsername('');
    setPassword('');
    setFullName('');
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    resetForm();
  };

  const cycleAuthMethod = () => {
    const methods: AuthMethod[] = ['email', 'phone', 'name'];
    const currentIndex = methods.indexOf(authMethod);
    const next = methods[(currentIndex + 1) % methods.length];
    setAuthMethod(next);
    setEmail('');
    setPhone('');
    setUsername('');
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8">
        <KidukaLogo size="lg" />
      </div>

      {/* Progress indicator */}
      <div className="flex justify-center gap-2 mb-6">
        {['identifier', 'password', ...(mode === 'signup' ? ['name'] : [])].map((s, i) => (
          <div 
            key={s} 
            className={`h-2 rounded-full transition-all ${
              step === s ? 'w-8 bg-primary' : 'w-2 bg-muted'
            }`} 
          />
        ))}
      </div>

      {/* Title - free, no container */}
      <h1 className="text-2xl font-bold text-foreground mb-2">
        {mode === 'signin' ? 'Karibu Tena' : 'Jisajili'}
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        {step === 'identifier' && (authMethod === 'email' ? 'Barua pepe yako' : authMethod === 'phone' ? 'Namba ya simu yako' : 'Jina lako la akaunti')}
        {step === 'password' && 'Nywila yako'}
        {step === 'name' && 'Jina lako kamili'}
      </p>

      {/* Form Steps - free, no container */}
      <div className="w-full max-w-sm space-y-4">
        {step === 'identifier' && (
          <>
            {authMethod === 'email' && (
              <div className="space-y-1">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Barua pepe"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                    className={`pl-10 h-14 bg-transparent border-0 border-b-2 border-border rounded-none text-lg focus:ring-0 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 ${
                      email && !email.includes('@') ? 'border-destructive' : ''
                    }`}
                    autoFocus
                  />
                </div>
                {email && !email.includes('@') && (
                  <p className="text-xs text-destructive pl-2">Barua pepe lazima iwe na @</p>
                )}
              </div>
            )}
            
            {authMethod === 'phone' && (
              <div className="space-y-1">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="07XX XXX XXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                    className={`pl-10 h-14 bg-transparent border-0 border-b-2 border-border rounded-none text-lg focus:ring-0 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 ${
                      phone && phone.length < 9 ? 'border-destructive' : ''
                    }`}
                    autoFocus
                  />
                </div>
                {phone && phone.length < 9 && (
                  <p className="text-xs text-destructive pl-2">Namba ya simu lazima iwe angalau tarakimu 9</p>
                )}
              </div>
            )}

            {authMethod === 'name' && (
              <div className="space-y-1">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Jina lako (mfano: kharifanadhiru)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                    className="pl-10 h-14 bg-transparent border-0 border-b-2 border-border rounded-none text-lg focus:ring-0 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                    autoFocus
                  />
                </div>
              </div>
            )}
            
            <button
              type="button"
              className="w-full text-primary text-sm py-2 flex items-center justify-center gap-2"
              onClick={cycleAuthMethod}
            >
              {authMethod === 'email' ? (
                <>
                  <Phone className="h-4 w-4" />
                  Tumia namba ya simu
                </>
              ) : authMethod === 'phone' ? (
                <>
                  <User className="h-4 w-4" />
                  Tumia jina lako
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Tumia barua pepe
                </>
              )}
            </button>
          </>
        )}

        {step === 'password' && (
          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nywila"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                className={`pl-10 pr-10 h-14 bg-transparent border-0 border-b-2 border-border rounded-none text-lg focus:ring-0 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 ${
                  password && password.length < 8 ? 'border-destructive' : password.length >= 8 ? 'border-primary' : ''
                }`}
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
            {mode === 'signin' && password && password.length < 8 && (
              <p className="text-xs text-destructive pl-2">Nywila lazima iwe angalau herufi 8</p>
            )}
            {mode === 'signin' && password && password.length >= 8 && (
              <p className="text-xs text-primary pl-2">✓ Nywila imekubalika</p>
            )}
            {mode === 'signup' && password.length > 0 && (() => {
              const p = checkPasswordPolicy(password);
              return (
                <div className="p-3 bg-muted/50 rounded-2xl space-y-1 mt-2">
                  <p className={`text-xs ${p.minLength ? 'text-primary' : 'text-muted-foreground'}`}>
                    {p.minLength ? '✓' : '○'} Angalau herufi 8
                  </p>
                  <p className={`text-xs ${p.hasNumbers ? 'text-primary' : 'text-muted-foreground'}`}>
                    {p.hasNumbers ? '✓' : '○'} Angalau nambari 3
                  </p>
                  <p className={`text-xs ${p.hasSpecial ? 'text-primary' : 'text-muted-foreground'}`}>
                    {p.hasSpecial ? '✓' : '○'} Herufi maalum (!@#$...)
                  </p>
                  <p className={`text-xs ${p.hasUppercase ? 'text-primary' : 'text-muted-foreground'}`}>
                    {p.hasUppercase ? '✓' : '○'} Herufi kubwa (A-Z)
                  </p>
                </div>
              );
            })()}
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
              className="pl-10 h-14 bg-transparent border-0 border-b-2 border-border rounded-none text-lg focus:ring-0 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
              autoFocus
            />
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-2 pt-4">
          {step !== 'identifier' && (
            <Button
              type="button"
              variant="ghost"
              className="h-12 px-4"
              onClick={handleBack}
              disabled={loading}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Button
            type="button"
            className="flex-1 h-12 text-base font-medium"
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

      {/* Forgot Password */}
      {mode === 'signin' && (
        <button
          type="button"
          onClick={() => navigate('/forgot-password')}
          className="text-muted-foreground hover:text-primary text-sm mt-4 transition-colors"
        >
          Umesahau nywila?
        </button>
      )}

      {/* Switch Mode */}
      <button
        type="button"
        onClick={switchMode}
        className="text-primary hover:underline text-sm mt-4"
      >
        {mode === 'signin' ? 'Unda akaunti mpya' : 'Tayari una akaunti? Ingia'}
      </button>

      {/* Sokoni Link */}
      <Link
        to="/sokoni"
        className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm mt-4 transition-colors"
      >
        <Store className="h-4 w-4" />
        Tembelea Sokoni
      </Link>
    </div>
  );
};
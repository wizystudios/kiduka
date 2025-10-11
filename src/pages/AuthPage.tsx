
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KidukaLogo } from '@/components/KidukaLogo';
import { Mail, Lock, User, Building, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { EmailConfirmationPage } from '@/components/EmailConfirmationPage';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AuthPage = () => {
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  // Multi-step form states
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');

  if (user?.email_confirmed_at) {
    return <Navigate to="/dashboard" replace />;
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleNextStep = () => {
    if (mode === 'signin') {
      if (step === 1 && !validateEmail(email)) {
        toast.error('Tafadhali ingiza barua pepe sahihi');
        return;
      }
      if (step === 2 && !validatePassword(password)) {
        toast.error('Nywila lazima iwe angalau herufi 6');
        return;
      }
    } else {
      if (step === 1 && !fullName.trim()) {
        toast.error('Tafadhali ingiza jina lako kamili');
        return;
      }
      if (step === 3 && !validateEmail(email)) {
        toast.error('Tafadhali ingiza barua pepe sahihi');
        return;
      }
      if (step === 4 && !validatePassword(password)) {
        toast.error('Nywila lazima iwe angalau herufi 6');
        return;
      }
    }
    
    if (mode === 'signin' && step === 2) {
      handleSignIn();
    } else if (mode === 'signup' && step === 4) {
      handleSignUp();
    } else {
      setStep(step + 1);
    }
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Karibu tena Kiduka!');
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      await signUp(email, password, fullName, businessName);
    } catch (error: any) {
      console.error('Sign up error:', error);
      if (error.message === 'CONFIRMATION_REQUIRED') {
        setRegisteredEmail(email);
        setShowConfirmation(true);
        toast.success('Akaunti imeundwa! Tafadhali thibitisha barua pepe yako.');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setStep(1);
    setEmail('');
    setPassword('');
    setFullName('');
    setBusinessName('');
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <KidukaLogo size="lg" />
        </div>
        
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {mode === 'signin' ? 'Karibu Tena' : 'Unda Akaunti'}
            </h1>
            <p className="text-lg text-gray-600">
              {mode === 'signin' ? 'Ingia kwenye akaunti yako' : 'Jisajili ili kuanza'}
            </p>
          </div>

          {mode === 'signin' ? (
            // SIGN IN FLOW
            <div className="space-y-6">
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-lg font-medium text-gray-700 mb-3">
                      Barua Pepe
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="mfano@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-14 text-lg"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-lg font-medium text-gray-700 mb-3">
                      Nywila
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                      <Input
                        type="password"
                        placeholder="Ingiza nywila yako"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 h-14 text-lg"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // SIGN UP FLOW
            <div className="space-y-6">
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-lg font-medium text-gray-700 mb-3">
                      Jina Lako Kamili
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Jina na Ukoo"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-12 h-14 text-lg"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-lg font-medium text-gray-700 mb-3">
                      Jina la Biashara (Si Lazima)
                    </label>
                    <div className="relative">
                      <Building className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Duka lako"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="pl-12 h-14 text-lg"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-lg font-medium text-gray-700 mb-3">
                      Barua Pepe
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                      <Input
                        type="email"
                        placeholder="mfano@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-12 h-14 text-lg"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-lg font-medium text-gray-700 mb-3">
                      Nywila
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                      <Input
                        type="password"
                        placeholder="Angalau herufi 6"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-12 h-14 text-lg"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 space-y-4">
            <div className="flex gap-3">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackStep}
                  className="flex-1 h-14 text-lg"
                  disabled={loading}
                >
                  Rudi
                </Button>
              )}
              <Button
                type="button"
                onClick={handleNextStep}
                className="flex-1 h-14 text-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Inasubiri...
                  </span>
                ) : mode === 'signin' && step === 2 ? (
                  'Ingia'
                ) : mode === 'signup' && step === 4 ? (
                  'Jisajili'
                ) : (
                  'Endelea'
                )}
              </Button>
            </div>

            {/* Progress Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: mode === 'signin' ? 2 : 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i + 1 === step ? 'w-8 bg-blue-600' : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Switch Mode */}
            <div className="text-center pt-6 border-t">
              <button
                type="button"
                onClick={switchMode}
                className="text-lg text-blue-600 hover:text-blue-700 font-medium"
              >
                {mode === 'signin' ? 'Unda akaunti mpya' : 'Tayari una akaunti? Ingia'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

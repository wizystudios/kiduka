import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KidukaLogo } from '@/components/KidukaLogo';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { EmailConfirmationPage } from '@/components/EmailConfirmationPage';

export const AuthPage = () => {
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  if (user?.email_confirmed_at) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Tafadhali jaza barua pepe na nywila');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Karibu tena!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error('Tafadhali jaza taarifa zote');
      return;
    }
    if (password.length < 6) {
      toast.error('Nywila lazima iwe angalau herufi 6');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, fullName);
    } catch (error: any) {
      if (error.message === 'CONFIRMATION_REQUIRED') {
        setRegisteredEmail(email);
        setShowConfirmation(true);
        toast.success('Akaunti imeundwa!');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
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

        {/* Form */}
        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
          {mode === 'signup' && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Jina lako"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 h-12 bg-background/50 backdrop-blur border-border/50 rounded-xl"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Barua pepe"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12 bg-background/50 backdrop-blur border-border/50 rounded-xl"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nywila"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 h-12 bg-background/50 backdrop-blur border-border/50 rounded-xl"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl text-base font-medium"
            disabled={loading}
          >
            {loading ? 'Inasubiri...' : mode === 'signin' ? 'Ingia' : 'Jisajili'}
          </Button>
        </form>

        {/* Switch Mode */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setEmail('');
              setPassword('');
              setFullName('');
            }}
            className="text-primary hover:underline text-sm"
          >
            {mode === 'signin' ? 'Unda akaunti mpya' : 'Tayari una akaunti? Ingia'}
          </button>
        </div>
      </div>
    </div>
  );
};
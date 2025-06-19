
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const EmailVerificationStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already_confirmed'>('loading');

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const token_hash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      
      if (token_hash && type === 'email') {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'email'
          });
          
          if (error) {
            console.error('Verification error:', error);
            setStatus('error');
            toast.error('Email verification failed: ' + error.message);
          } else if (data.user) {
            setStatus('success');
            toast.success('Email verified successfully! Welcome to Kiduka!');
            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
              navigate('/dashboard');
            }, 2000);
          }
        } catch (error) {
          console.error('Verification error:', error);
          setStatus('error');
          toast.error('Email verification failed');
        }
      } else if (user && user.email_confirmed_at) {
        setStatus('already_confirmed');
      } else {
        setStatus('error');
      }
    };

    handleEmailConfirmation();
  }, [searchParams, navigate, user]);

  const handleResendEmail = async () => {
    if (!user?.email) return;
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`
        }
      });
      
      if (error) throw error;
      toast.success('Verification email sent! Please check your inbox.');
    } catch (error: any) {
      toast.error('Failed to resend email: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-16 w-16 text-green-600" />}
            {status === 'error' && <XCircle className="h-16 w-16 text-red-600" />}
            {status === 'already_confirmed' && <CheckCircle className="h-16 w-16 text-green-600" />}
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
            {status === 'already_confirmed' && 'Already Verified'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'loading' && (
            <p className="text-gray-600">Please wait while we verify your email address...</p>
          )}
          
          {status === 'success' && (
            <>
              <p className="text-gray-600">Your email has been successfully verified!</p>
              <p className="text-sm text-gray-500">Redirecting you to your dashboard...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <p className="text-gray-600">We couldn't verify your email address.</p>
              <div className="space-y-2">
                <Button onClick={handleResendEmail} className="w-full">
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Verification Email
                </Button>
                <Button variant="outline" onClick={() => navigate('/auth')} className="w-full">
                  Back to Login
                </Button>
              </div>
            </>
          )}
          
          {status === 'already_confirmed' && (
            <>
              <p className="text-gray-600">Your email is already verified!</p>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Go to Dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

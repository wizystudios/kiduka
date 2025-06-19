
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-6 relative">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
              <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full">
                <Mail className="h-12 w-12 text-white" />
              </div>
            </div>
            <div className="absolute -top-2 -right-2 bg-green-500 p-2 rounded-full">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Kagua Barua Pepe Yako!
          </CardTitle>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-gray-700 text-lg">
              Tumekutumia kiungo cha uthibitisho kwenye:
            </p>
            <p className="font-semibold text-blue-600 text-lg mt-1 break-all">
              {email}
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Steps */}
          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="bg-blue-500 text-white rounded-full p-2 flex-shrink-0">
                <span className="text-sm font-bold">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Fungua Barua Pepe Yako</h4>
                <p className="text-sm text-gray-600">Angalia sanduku lako la barua pepe au spam folder</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
              <div className="bg-purple-500 text-white rounded-full p-2 flex-shrink-0">
                <span className="text-sm font-bold">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Bonyeza Kiungo</h4>
                <p className="text-sm text-gray-600">Bonyeza kiungo cha "Thibitisha Akaunti Yako"</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-pink-50 to-blue-50 rounded-lg">
              <div className="bg-pink-500 text-white rounded-full p-2 flex-shrink-0">
                <span className="text-sm font-bold">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">Anza Kutumia Kiduka</h4>
                <p className="text-sm text-gray-600">Utaelekezwa kwenye akaunti yako moja kwa moja</p>
              </div>
            </div>
          </div>

          {/* Waiting indicator */}
          <div className="flex items-center justify-center space-x-2 py-4">
            <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
            <span className="text-gray-600">Tunasubiri uthibitisho wako...</span>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <Button 
              onClick={handleResendEmail}
              disabled={isResending}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
            >
              {isResending ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Inatuma...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span>Tuma Tena Barua Pepe</span>
                </div>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onBackToSignUp}
              className="w-full border-2 border-gray-300 hover:border-blue-500 py-3 rounded-lg font-semibold transition-all duration-300"
            >
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Rudi Nyuma
            </Button>
          </div>

          {/* Help text */}
          <div className="text-center text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
            <p className="mb-2">
              <strong>Je, haulioni barua pepe?</strong>
            </p>
            <ul className="text-xs space-y-1">
              <li>• Angalia spam/junk folder yako</li>
              <li>• Hakikisha umeweka barua pepe sahihi</li>
              <li>• Subiri dakika chache kisha ujaribu tena</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

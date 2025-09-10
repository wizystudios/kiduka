import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingPages } from "@/components/OnboardingPages";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Debug logging
  console.log('Index component render - loading:', loading, 'user:', user?.email || 'no user', 'showOnboarding:', showOnboarding);

  useEffect(() => {
    console.log('Index useEffect - loading:', loading, 'user:', user?.email || 'no user', 'email_confirmed_at:', user?.email_confirmed_at);
    if (loading) return;
    
    if (user?.email_confirmed_at) {
      console.log('User is authenticated and confirmed, redirecting to dashboard immediately');
      navigate('/dashboard', { replace: true });
      return;
    }
    
    if (user && !user.email_confirmed_at) {
      console.log('User exists but email not confirmed, redirecting to auth');
      navigate('/auth', { replace: true });
      return;
    }
    
    // No user - show onboarding or landing page
    const hasSeenOnboarding = localStorage.getItem('kiduka_onboarding_seen');
    console.log('No user, hasSeenOnboarding:', hasSeenOnboarding);
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, [user, loading, navigate]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('kiduka_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-3 text-sm text-gray-600">Inapakia...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingPages onComplete={handleOnboardingComplete} />;
  }

  // Main landing page after onboarding
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-gray-900">Kiduka POS</h1>
          <p className="text-base text-gray-600">
            Mfumo wa kisasa wa usimamizi wa biashara
          </p>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => navigate('/auth')}
            className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-3 px-6 rounded-lg text-base font-semibold hover:from-emerald-700 hover:to-blue-700 transition-all"
          >
            Anza Kutumia Kiduka
          </button>
          
          <button
            onClick={() => setShowOnboarding(true)}
            className="w-full border-2 border-gray-300 text-gray-700 py-2.5 px-6 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
          >
            Ona Mwongozo Tena
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;


import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingPages } from "@/components/OnboardingPages";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Check if user has seen onboarding before
    const hasSeenOnboarding = localStorage.getItem('kiduka_onboarding_seen');
    if (hasSeenOnboarding) {
      setShowOnboarding(false);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('kiduka_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <OnboardingPages onComplete={handleOnboardingComplete} />;
  }

  // Main landing page after onboarding
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">Kiduka POS</h1>
          <p className="text-xl text-gray-600">
            Mfumo wa kisasa wa usimamizi wa biashara
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => navigate('/auth')}
            className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:from-emerald-700 hover:to-blue-700 transition-all"
          >
            Anza Kutumia Kiduka
          </button>
          
          <button
            onClick={() => setShowOnboarding(true)}
            className="w-full border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-all"
          >
            Ona Mwongozo Tena
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;

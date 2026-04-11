import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingPages } from "@/components/OnboardingPages";
import { KidukaLogo } from "@/components/KidukaLogo";
import { FloatingCards } from "@/components/FloatingCards";
import { Button } from "@/components/ui/button";
import { LogIn, Store } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user?.email_confirmed_at) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (user && !user.email_confirmed_at) {
      navigate('/auth', { replace: true });
      return;
    }
    const hasSeenOnboarding = localStorage.getItem('kiduka_onboarding_seen');
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Inapakia...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingPages onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <FloatingCards />

      <div className="flex flex-col items-center gap-6 w-full max-w-sm relative z-10">
        <KidukaLogo size="xl" animate />
        
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Karibu Kiduka</h1>
          <p className="text-sm text-muted-foreground mt-1">Biashara yako, urahisi wako</p>
        </div>

        <div className="w-full space-y-3 mt-4">
          <Button
            className="w-full h-14 text-base font-semibold rounded-full"
            size="lg"
            onClick={() => navigate('/auth')}
          >
            <LogIn className="h-5 w-5 mr-2" />
            Ingia / Jisajili
          </Button>

          <Button
            variant="outline"
            className="w-full h-14 text-base font-semibold rounded-full"
            size="lg"
            onClick={() => navigate('/sokoni')}
          >
            <Store className="h-5 w-5 mr-2" />
            Tembelea Sokoni
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;

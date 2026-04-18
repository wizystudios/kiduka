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

  // Lock scroll while on landing/onboarding
  useEffect(() => {
    const prev = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

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
      <div className="h-[100dvh] max-h-[100dvh] flex items-center justify-center overflow-hidden">
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
    <div className="h-[100dvh] max-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col items-center justify-center px-4 py-3 relative overflow-hidden">
      <FloatingCards />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4">
        <KidukaLogo size="xl" />
        
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Karibu Kiduka</h1>
          <p className="text-sm text-muted-foreground mt-1">Biashara yako, urahisi wako</p>
        </div>

        <div className="mt-2 w-full space-y-2.5">
          <Button
            className="h-12 w-full rounded-full text-base font-semibold"
            size="lg"
            onClick={() => navigate('/auth')}
          >
            <LogIn className="h-5 w-5 mr-2" />
            Ingia / Jisajili
          </Button>

          <Button
            variant="outline"
            className="h-12 w-full rounded-full text-base font-semibold"
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

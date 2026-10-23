import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { KidukaLogo } from "@/components/KidukaLogo";
import { FloatingCards } from "@/components/FloatingCards";
import { Button } from "@/components/ui/button";
import { LogIn, Store } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { InstallAppButton } from "@/components/InstallAppButton";
import { QuickSignIn } from "@/components/QuickSignIn";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, loading } = useAuth();


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
  }, [user, loading, navigate]);

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

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col items-center justify-center px-4 py-3 relative overflow-hidden">
      <FloatingCards />

      <div className="absolute top-3 right-3 z-20">
        <LanguageSwitcher variant="full" />
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-4 md:gap-6">
        <KidukaLogo size="xl" />
        
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">{t('welcome_kiduka')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('tagline')}</p>
        </div>

        <div className="mt-2 w-full space-y-2.5 md:mt-4 md:space-y-3">
          <Button
            className="h-12 w-full rounded-full text-base font-semibold md:h-14"
            size="lg"
            onClick={() => navigate('/auth')}
          >
            <LogIn className="h-5 w-5 mr-2" />
            {t('login_register')}
          </Button>

          <Button
            variant="outline"
            className="h-12 w-full rounded-full text-base font-semibold md:h-14"
            size="lg"
            onClick={() => navigate('/sokoni')}
          >
            <Store className="h-5 w-5 mr-2" />
            {t('visit_sokoni')}
          </Button>

          <QuickSignIn />

          <InstallAppButton variant="secondary" />
        </div>
      </div>
    </div>

  );
};

export default Index;

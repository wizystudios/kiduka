import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingPages } from "@/components/OnboardingPages";
import { KidukaLogo } from "@/components/KidukaLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HelpSupportWidget } from "@/components/HelpSupportWidget";
import { 
  ArrowUpRight, Store, BookOpen, LogIn, HelpCircle,
  ShoppingCart, BarChart3, Package, Users
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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

  const features = [
    { icon: ShoppingCart, text: 'Mauzo ya Haraka' },
    { icon: Package, text: 'Usimamizi wa Bidhaa' },
    { icon: BarChart3, text: 'Ripoti za Kina' },
    { icon: Users, text: 'Usimamizi wa Wateja' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-background dark:via-background dark:to-background">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col items-center justify-center py-8 mb-6">
          <KidukaLogo size="xl" animate />
          <h1 className="text-xl font-bold mt-3">Karibu Kiduka POS</h1>
          <p className="text-sm text-muted-foreground">
            Mfumo wa kisasa wa usimamizi wa biashara
          </p>
        </div>

        {/* Split Layout */}
        <div className="flex flex-col lg:flex-row gap-6 relative">
          {/* Center Divider */}
          <div className="hidden lg:flex absolute left-1/2 top-0 bottom-0 -translate-x-1/2 flex-col items-center z-10">
            <div className="w-px h-8 bg-gradient-to-b from-transparent to-primary/30" />
            <ArrowUpRight className="h-4 w-4 text-primary/50 -rotate-45" />
            <div className="w-px flex-1 bg-gradient-to-b from-primary/30 via-primary to-primary/30 relative">
              <div className="absolute top-1/3 left-0 -translate-x-full pr-2">
                <ArrowUpRight className="h-3 w-3 text-primary/40 rotate-180" />
              </div>
              <div className="absolute top-1/3 right-0 translate-x-full pl-2">
                <ArrowUpRight className="h-3 w-3 text-primary/40" />
              </div>
              <div className="absolute top-2/3 left-0 -translate-x-full pr-2">
                <ArrowUpRight className="h-3 w-3 text-primary/40 rotate-180" />
              </div>
              <div className="absolute top-2/3 right-0 translate-x-full pl-2">
                <ArrowUpRight className="h-3 w-3 text-primary/40" />
              </div>
            </div>
            <ArrowUpRight className="h-4 w-4 text-primary/50 rotate-135" />
            <div className="w-px h-8 bg-gradient-to-t from-transparent to-primary/30" />
          </div>

          {/* LEFT SIDE - Features */}
          <div className="flex-1 lg:pr-8">
            <Card className="h-full">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-bold">Kipengele za Kiduka</h2>
                <p className="text-sm text-muted-foreground">
                  Dhibiti biashara yako kwa urahisi na ufanisi mkubwa
                </p>
                
                <div className="space-y-3 pt-2">
                  {features.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-muted/50 rounded-2xl">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <f.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{f.text}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full rounded-2xl"
                  size="lg"
                  onClick={() => navigate('/auth')}
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  Anza Kutumia Kiduka
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE - Actions */}
          <div className="flex-1 lg:pl-8">
            <Card className="h-full border-primary/50">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  Tembelea Sokoni
                </h2>
                <p className="text-sm text-muted-foreground">
                  Nunua bidhaa kutoka kwa wafanyabiashara wenzako kupitia Sokoni Marketplace
                </p>

                <div className="p-4 bg-primary/5 rounded-2xl text-center">
                  <Store className="h-10 w-10 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">Bidhaa Kutoka Maduka Mengi</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tafuta, agiza, na fuatilia oda zako
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full rounded-2xl"
                  size="lg"
                  onClick={() => navigate('/sokoni')}
                >
                  <Store className="h-5 w-5 mr-2" />
                  Tembelea Sokoni
                </Button>

                <Button
                  variant="ghost"
                  className="w-full rounded-2xl"
                  onClick={() => setShowOnboarding(true)}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Ona Mwongozo Tena
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Help Button */}
        <div className="mt-6 text-center">
          <Button variant="ghost" size="sm" onClick={() => setHelpOpen(true)} className="rounded-2xl">
            <HelpCircle className="h-4 w-4 mr-2" />
            Unahitaji msaada?
          </Button>
        </div>
      </div>

      <HelpSupportWidget open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
};

export default Index;

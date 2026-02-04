import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Package, ShoppingCart, BarChart3, Users, Settings, 
  Scan, Calculator, CreditCard, TrendingUp, ArrowRight, 
  ArrowLeft, X, CheckCircle, Menu, ChevronRight
} from 'lucide-react';
import { KidukaLogo } from './KidukaLogo';

interface TourStep {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  page: string;
  color: string;
  sidebarLocation: string;
  howToUse: string;
}

const tourSteps: TourStep[] = [
  {
    title: "Dashboard",
    description: "Muhtasari wa biashara yako",
    icon: BarChart3,
    page: "/dashboard",
    color: "from-blue-500 to-blue-600",
    sidebarLocation: "Juu ya menu",
    howToUse: "Tazama mauzo, stock, na taarifa muhimu"
  },
  {
    title: "Bidhaa",
    description: "Simamia bidhaa zako",
    icon: Package,
    page: "/products",
    color: "from-emerald-500 to-emerald-600",
    sidebarLocation: "Menu kuu",
    howToUse: "Ongeza, hariri, na futa bidhaa"
  },
  {
    title: "Mauzo",
    description: "Fanya mauzo haraka",
    icon: ShoppingCart,
    page: "/sales",
    color: "from-purple-500 to-purple-600",
    sidebarLocation: "Menu kuu",
    howToUse: "Chagua bidhaa, weka idadi, lipa"
  },
  {
    title: "Scanner",
    description: "Scan barcode moja kwa moja",
    icon: Scan,
    page: "/scanner",
    color: "from-orange-500 to-orange-600",
    sidebarLocation: "Bottom nav (mobile)",
    howToUse: "Elekeza camera kwenye barcode"
  },
  {
    title: "Wateja",
    description: "Simamia wateja na madeni",
    icon: Users,
    page: "/customers",
    color: "from-pink-500 to-pink-600",
    sidebarLocation: "Menu kuu",
    howToUse: "Ongeza wateja, fuatilia historia"
  },
  {
    title: "Ripoti",
    description: "Tazama utendaji wa biashara",
    icon: TrendingUp,
    page: "/reports",
    color: "from-cyan-500 to-cyan-600",
    sidebarLocation: "Menu kuu",
    howToUse: "Chagua kipindi, tazama charts"
  },
  {
    title: "Kikokotoo",
    description: "Hesabu za haraka",
    icon: Calculator,
    page: "/calculator",
    color: "from-amber-500 to-amber-600",
    sidebarLocation: "Bottom nav",
    howToUse: "Bonyeza namba za kuhesabu"
  },
  {
    title: "Mikopo",
    description: "Fuatilia madeni ya wateja",
    icon: CreditCard,
    page: "/credit-management",
    color: "from-red-500 to-red-600",
    sidebarLocation: "Menu kuu",
    howToUse: "Ongeza mkopo, rekodi malipo"
  },
  {
    title: "Mipangilio",
    description: "Badilisha akaunti na app",
    icon: Settings,
    page: "/settings",
    color: "from-gray-500 to-gray-600",
    sidebarLocation: "Chini ya menu",
    howToUse: "Profile, theme, notifications"
  }
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const step = tourSteps[currentStep];
  const Icon = step.icon;
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setVisible(false);
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1.5 bg-muted">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <CardContent className="p-6">
          {/* Header with logo and close */}
          <div className="flex items-center justify-between mb-6">
            <KidukaLogo size="sm" showText={false} />
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground font-medium">
                {currentStep + 1} / {tourSteps.length}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-xl"
                onClick={handleSkip}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Icon with animation */}
          <div className={`mx-auto w-20 h-20 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-5 shadow-lg animate-pulse`}>
            <Icon className="h-10 w-10 text-white" />
          </div>

          {/* Content - Minimal text */}
          <div className="text-center space-y-2 mb-5">
            <h2 className="text-2xl font-bold">{step.title}</h2>
            <p className="text-muted-foreground text-sm">{step.description}</p>
          </div>

          {/* Visual location indicator */}
          <div className="bg-muted/50 rounded-2xl p-4 mb-5 space-y-3">
            {/* Sidebar location */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Menu className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Mahali</p>
                <p className="text-sm font-medium">{step.sidebarLocation}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {/* How to use */}
            <div className="flex items-center gap-3">
              <div className={`h-8 w-8 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Jinsi ya kutumia</p>
                <p className="text-sm font-medium">{step.howToUse}</p>
              </div>
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-1.5 mb-5">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-6 bg-primary' 
                    : index < currentStep 
                      ? 'w-2 bg-primary/50' 
                      : 'w-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl"
                onClick={handlePrevious}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Rudi
              </Button>
            )}
            
            {currentStep === 0 && (
              <Button 
                variant="outline" 
                className="flex-1 rounded-xl"
                onClick={handleSkip}
              >
                Ruka Yote
              </Button>
            )}
            
            <Button 
              className={`flex-1 rounded-xl bg-gradient-to-r ${step.color} text-white border-0 shadow-lg`}
              onClick={handleNext}
            >
              {currentStep === tourSteps.length - 1 ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Anza Sasa!
                </>
              ) : (
                <>
                  Endelea
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

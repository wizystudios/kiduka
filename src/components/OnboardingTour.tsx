import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Package, ShoppingCart, BarChart3, Users, Settings, 
  Scan, Calculator, CreditCard, TrendingUp, ArrowRight, 
  ArrowLeft, X, CheckCircle
} from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  page: string;
  color: string;
}

const tourSteps: TourStep[] = [
  {
    title: "Dashboard",
    description: "Tazama muhtasari wa biashara yako - mauzo ya leo, stock, na taarifa muhimu zote kwa mtazamo mmoja.",
    icon: BarChart3,
    page: "/dashboard",
    color: "from-blue-500 to-blue-600"
  },
  {
    title: "Bidhaa",
    description: "Ongeza, hariri, na simamia bidhaa zako zote hapa. Weka bei, stock, na picha za bidhaa.",
    icon: Package,
    page: "/products",
    color: "from-emerald-500 to-emerald-600"
  },
  {
    title: "Mauzo",
    description: "Chakata mauzo kwa haraka. Scan barcode au chagua bidhaa kutoka kwenye orodha yako.",
    icon: ShoppingCart,
    page: "/sales",
    color: "from-purple-500 to-purple-600"
  },
  {
    title: "Scanner",
    description: "Tumia scanner ya barcode kuchapa mauzo haraka zaidi. Scan bidhaa moja kwa moja.",
    icon: Scan,
    page: "/scanner",
    color: "from-orange-500 to-orange-600"
  },
  {
    title: "Wateja",
    description: "Simamia wateja wako, historia yao ya ununuzi, na madeni yao.",
    icon: Users,
    page: "/customers",
    color: "from-pink-500 to-pink-600"
  },
  {
    title: "Ripoti",
    description: "Tazama ripoti za kina za mauzo, faida, na utendaji wa biashara yako.",
    icon: TrendingUp,
    page: "/reports",
    color: "from-cyan-500 to-cyan-600"
  },
  {
    title: "Calculator",
    description: "Tumia calculator kwa hesabu za haraka wakati wa mauzo.",
    icon: Calculator,
    page: "/calculator",
    color: "from-amber-500 to-amber-600"
  },
  {
    title: "Mikopo",
    description: "Simamia mikopo ya wateja na fuatilia malipo yao.",
    icon: CreditCard,
    page: "/credit-management",
    color: "from-red-500 to-red-600"
  },
  {
    title: "Mipangilio",
    description: "Badilisha mipangilio ya akaunti yako, biashara, na app.",
    icon: Settings,
    page: "/settings",
    color: "from-gray-500 to-gray-600"
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
      <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 duration-300">
        {/* Progress bar */}
        <div className="h-1 bg-muted rounded-t-lg overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <CardContent className="p-6">
          {/* Header with close button */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-muted-foreground">
              {currentStep + 1} / {tourSteps.length}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Icon */}
          <div className={`mx-auto w-20 h-20 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
            <Icon className="h-10 w-10 text-white" />
          </div>

          {/* Content */}
          <div className="text-center space-y-3 mb-8">
            <h2 className="text-2xl font-bold">{step.title}</h2>
            <p className="text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-1.5 mb-6">
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
                className="flex-1"
                onClick={handlePrevious}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Rudi
              </Button>
            )}
            
            {currentStep === 0 && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleSkip}
              >
                Ruka
              </Button>
            )}
            
            <Button 
              className={`flex-1 bg-gradient-to-r ${step.color} text-white border-0`}
              onClick={handleNext}
            >
              {currentStep === tourSteps.length - 1 ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Maliza
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

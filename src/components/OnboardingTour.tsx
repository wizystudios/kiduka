import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ShoppingCart, Package, BarChart3, Users, Settings, 
  CreditCard, BookOpen, Store, ArrowRight, Check
} from 'lucide-react';

interface OnboardingTourProps {
  onComplete: () => void;
}

const tourSteps = [
  {
    title: 'Karibu Kiduka POS! 🎉',
    description: 'Mfumo wa kisasa wa kusimamia biashara yako. Tutakuonyesha jinsi ya kutumia programu hii kwa urahisi.',
    icon: Store,
  },
  {
    title: 'Bidhaa & Mauzo',
    description: 'Ongeza bidhaa zako, rekodi mauzo kwa haraka, na fuatilia stock yako kwa urahisi.',
    icon: ShoppingCart,
  },
  {
    title: 'Wateja & Mikopo',
    description: 'Simamia wateja wako, toa mikopo, na fuatilia malipo yao kwa ufanisi.',
    icon: Users,
  },
  {
    title: 'Ripoti & Uhasibu',
    description: 'Pata ripoti za kina kuhusu mauzo, faida, na matumizi ya biashara yako.',
    icon: BarChart3,
  },
  {
    title: 'Uko tayari! ✅',
    description: 'Sasa unaweza kuanza kutumia Kiduka POS. Bonyeza "Maliza" kuendelea kwenye Dashboard yako.',
    icon: Check,
  },
];

const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = tourSteps[currentStep];
  const StepIcon = step.icon;
  const isLast = currentStep === tourSteps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl">
        <CardContent className="p-6 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <StepIcon className="h-8 w-8 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold">{step.title}</h2>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-1.5">
            {tourSteps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-6 bg-primary'
                    : index < currentStep
                    ? 'w-2 bg-primary'
                    : 'w-2 bg-muted'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {!isLast && (
              <Button variant="ghost" className="flex-1" onClick={handleSkip}>
                Ruka
              </Button>
            )}
            <Button className="flex-1" onClick={handleNext}>
              {isLast ? 'Maliza' : 'Endelea'}
              {!isLast && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingTour;

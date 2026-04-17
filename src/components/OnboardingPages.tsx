import { useState } from 'react';
import { KidukaLogo } from '@/components/KidukaLogo';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import onboardingWelcomeImg from '@/assets/onboarding-welcome.jpg';
import onboardingScanImg from '@/assets/onboarding-scan.jpg';
import onboardingReportsImg from '@/assets/onboarding-reports.jpg';

interface OnboardingPagesProps {
  onComplete: () => void;
}

export const OnboardingPages = ({ onComplete }: OnboardingPagesProps) => {
  const pages = [
    {
      title: "Karibu Kiduka",
      subtitle: "Biashara Yako, Urahisi Wako",
      image: onboardingWelcomeImg,
    },
    {
      title: "Scan na Uuze",
      subtitle: "Scan barcode, ongeza stock, chakata mauzo kwa urahisi",
      image: onboardingScanImg,
    },
    {
      title: "Ripoti za Kina",
      subtitle: "Fuatilia mauzo, stock na utendaji wa biashara yako",
      image: onboardingReportsImg,
    }
  ];

  const [index, setIndex] = useState(0);
  const isLast = index === pages.length - 1;
  const current = pages[index];

  const handleNext = () => {
    if (isLast) onComplete();
    else setIndex(index + 1);
  };

  const handlePrev = () => {
    if (index > 0) setIndex(index - 1);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-background flex flex-col md:flex-row overflow-hidden relative">
      {/* MOBILE: image as full background with overlay */}
      <div className="absolute inset-0 md:hidden">
        <img
          src={current.image}
          alt={current.title}
          className="w-full h-full object-cover transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      </div>

      {/* DESKTOP: left image card */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center p-10 bg-muted/30">
        <div className="w-full max-w-md aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border border-border/50 bg-card">
          <img
            src={current.image}
            alt={current.title}
            className="w-full h-full object-cover transition-opacity duration-500"
            key={current.image}
          />
        </div>
      </div>

      {/* RIGHT / mobile content */}
      <div className="relative flex-1 flex flex-col items-center justify-between px-6 py-8 md:py-12 z-10">
        <div className="flex flex-col items-center text-center pt-4 md:pt-0">
          <KidukaLogo size="lg" />
          <h2 className="text-2xl md:text-4xl font-bold text-foreground mt-4">{current.title}</h2>
          <p className="text-base md:text-lg text-muted-foreground mt-2 max-w-sm">{current.subtitle}</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          {/* Indicators */}
          <div className="flex items-center justify-center gap-2">
            {pages.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${i === index ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'}`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {index > 0 && (
              <Button
                onClick={handlePrev}
                variant="outline"
                className="h-12 rounded-full px-5"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1 h-12 rounded-full text-base font-semibold"
            >
              {isLast ? 'Anza Sasa' : 'Endelea'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {!isLast && (
            <button
              onClick={onComplete}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              Ruka
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

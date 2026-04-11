import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { KidukaLogo } from '@/components/KidukaLogo';
import { ArrowRight } from 'lucide-react';
import onboardingWelcomeImg from '@/assets/onboarding-welcome.jpg';
import onboardingScanImg from '@/assets/onboarding-scan.jpg';
import onboardingReportsImg from '@/assets/onboarding-reports.jpg';

interface OnboardingPagesProps {
  onComplete: () => void;
}

export const OnboardingPages = ({ onComplete }: OnboardingPagesProps) => {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    {
      title: "Karibu Kiduka",
      subtitle: "Biashara Yako, Urahisi Wako",
      image: onboardingWelcomeImg,
    },
    {
      title: "Scan na Uuze",
      subtitle: "Scan barcode, ongeza stock, chakata mauzo moja kwa moja",
      image: onboardingScanImg,
    },
    {
      title: "Ripoti za Kina",
      subtitle: "Fuatilia mauzo, stock na utendaji wa biashara yako",
      image: onboardingReportsImg,
    }
  ];

  const currentPageData = pages[currentPage];

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Image section - left on desktop, top on mobile */}
      <div className="h-[45vh] md:h-full md:w-1/2 relative overflow-hidden flex-shrink-0">
        <img
          key={currentPageData.image}
          src={currentPageData.image}
          alt={currentPageData.title}
          className="w-full h-full object-cover animate-fade-in"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent md:hidden" />
        <div className="hidden md:block absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent" />
      </div>

      {/* Content section - right on desktop, bottom on mobile */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 md:py-8 space-y-4">
        <div className="flex justify-center">
          <KidukaLogo size="sm" />
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-foreground">{currentPageData.title}</h2>
          <p className="text-sm text-muted-foreground">{currentPageData.subtitle}</p>
        </div>

        <div className="flex justify-center gap-2">
          {pages.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentPage ? 'bg-primary w-6' : 'bg-muted-foreground/30 w-2'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3 w-full max-w-xs">
          <Button variant="ghost" onClick={onComplete} className="flex-1 rounded-full">
            Ruka
          </Button>
          <Button onClick={handleNext} className="flex-1 rounded-full">
            {currentPage < pages.length - 1 ? (
              <>Endelea <ArrowRight className="ml-1 h-4 w-4" /></>
            ) : (
              'Anza'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

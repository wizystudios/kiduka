import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { KidukaLogo } from '@/components/KidukaLogo';
import { ArrowRight } from 'lucide-react';
import onboardingWelcome from '@/assets/onboarding-welcome.mp4.asset.json';
import onboardingScan from '@/assets/onboarding-scan.mp4.asset.json';
import onboardingReports from '@/assets/onboarding-reports.mp4.asset.json';

interface OnboardingPagesProps {
  onComplete: () => void;
}

export const OnboardingPages = ({ onComplete }: OnboardingPagesProps) => {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    {
      title: "Karibu Kiduka",
      subtitle: "Biashara Yako, Urahisi Wako",
      video: onboardingWelcome.url,
    },
    {
      title: "Scan na Uuze",
      subtitle: "Scan barcode, ongeza stock, chakata mauzo moja kwa moja",
      video: onboardingScan.url,
    },
    {
      title: "Ripoti za Kina",
      subtitle: "Fuatilia mauzo, stock na utendaji wa biashara yako",
      video: onboardingReports.url,
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Video section - takes most of the screen */}
      <div className="flex-1 relative overflow-hidden">
        <video
          key={currentPageData.video}
          src={currentPageData.video}
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Content section */}
      <div className="px-6 pb-8 pt-2 space-y-4">
        <div className="flex justify-center">
          <KidukaLogo size="sm" />
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-foreground">{currentPageData.title}</h2>
          <p className="text-sm text-muted-foreground">{currentPageData.subtitle}</p>
        </div>

        {/* Dots */}
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

        {/* Buttons */}
        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            onClick={onComplete} 
            className="flex-1 rounded-full"
          >
            Ruka
          </Button>
          <Button 
            onClick={handleNext} 
            className="flex-1 rounded-full"
          >
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

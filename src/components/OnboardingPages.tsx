import { KidukaLogo } from '@/components/KidukaLogo';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
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
      subtitle: "Scan barcode, ongeza stock, chakata mauzo",
      image: onboardingScanImg,
    },
    {
      title: "Ripoti za Kina",
      subtitle: "Fuatilia mauzo, stock na utendaji",
      image: onboardingReportsImg,
    }
  ];

  return (
    <div className="h-[100dvh] max-h-[100dvh] bg-background flex flex-col overflow-hidden">
      {/* Logo & Title */}
      <div className="flex flex-col items-center pt-6 pb-3 flex-shrink-0">
        <KidukaLogo size="lg" />
        <h2 className="text-xl font-bold text-foreground mt-3">Karibu Kiduka</h2>
        <p className="text-sm text-muted-foreground">Biashara Yako, Urahisi Wako</p>
      </div>

      {/* Image Cards - Horizontal scroll showing all 3 */}
      <div className="flex-1 flex items-center px-4 gap-3 overflow-x-auto snap-x snap-mandatory pb-2 min-h-0">
        {pages.map((page, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-[75vw] md:w-[30%] snap-center rounded-3xl overflow-hidden shadow-lg border border-border/50 flex flex-col"
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={page.image}
                alt={page.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3 text-center bg-card">
              <h3 className="text-sm font-bold text-foreground">{page.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{page.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Button */}
      <div className="px-6 pb-6 pt-3 flex-shrink-0">
        <Button onClick={onComplete} className="w-full h-12 rounded-full text-base font-semibold">
          Anza Sasa <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

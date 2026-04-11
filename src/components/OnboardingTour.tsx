import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check } from 'lucide-react';
import { KidukaLogo } from './KidukaLogo';
import onboardingWelcomeImg from '@/assets/onboarding-welcome.jpg';
import onboardingScanImg from '@/assets/onboarding-scan.jpg';
import onboardingReportsImg from '@/assets/onboarding-reports.jpg';

interface OnboardingTourProps {
  onComplete: () => void;
}

const slides = [
  {
    title: 'Karibu Kiduka!',
    subtitle: 'Mfumo wa kisasa wa kusimamia biashara yako kwa urahisi',
    image: onboardingWelcomeImg,
  },
  {
    title: 'Scan na Uuze',
    subtitle: 'Scan barcode, ongeza stock, chakata mauzo haraka sana',
    image: onboardingScanImg,
  },
  {
    title: 'Ripoti za Kina',
    subtitle: 'Fuatilia mauzo, faida na utendaji wa biashara yako',
    image: onboardingReportsImg,
  },
  {
    title: 'Uko Tayari!',
    subtitle: 'Anza kutumia Kiduka sasa hivi',
    image: null,
  },
];

const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  const goNext = () => {
    if (animating) return;
    if (isLast) { onComplete(); return; }
    setAnimating(true);
    setTimeout(() => { setCurrent(c => c + 1); setAnimating(false); }, 250);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-background rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Skip */}
        {!isLast && (
          <button
            onClick={onComplete}
            className="absolute top-3 right-3 z-20 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Ruka →
          </button>
        )}

        <div className={`transition-opacity duration-250 ${animating ? 'opacity-0' : 'opacity-100'}`}>
          {/* Side-by-side: text left, image right */}
          {slide.image ? (
            <div className="flex items-stretch min-h-[220px]">
              {/* Text side */}
              <div className="flex-1 p-5 flex flex-col justify-center">
                <KidukaLogo size="sm" />
                <h1 className="text-lg font-bold text-foreground mt-3 leading-tight">{slide.title}</h1>
                <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">{slide.subtitle}</p>
              </div>
              {/* Image side */}
              <div className="w-[45%] flex-shrink-0 relative overflow-hidden">
                <img
                  key={slide.image}
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover animate-scale-in"
                />
                <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent" />
              </div>
            </div>
          ) : (
            /* Last slide - ready */
            <div className="p-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <KidukaLogo size="sm" />
              <h1 className="text-lg font-bold text-foreground mt-3">{slide.title}</h1>
              <p className="text-muted-foreground text-xs mt-1">{slide.subtitle}</p>
              <div className="bg-card border border-border/50 rounded-2xl p-3 text-left space-y-2 mt-4">
                {[
                  'Ongeza bidhaa zako za kwanza',
                  'Rekodi mauzo ya kwanza',
                  'Simamia wateja na madeni',
                  'Angalia ripoti za biashara',
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[9px] font-bold text-primary">{i + 1}</span>
                    </div>
                    <span className="text-muted-foreground">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="px-5 pb-5 pt-2 flex items-center justify-between">
          {/* Dots */}
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? 'w-6 bg-primary' : i < current ? 'w-1.5 bg-primary/60' : 'w-1.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <Button size="sm" className="rounded-full px-4" onClick={goNext}>
            {isLast ? 'Anza' : 'Endelea'}
            {!isLast && <ArrowRight className="ml-1 h-3 w-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;

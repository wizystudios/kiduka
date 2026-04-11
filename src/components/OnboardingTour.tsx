import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  ArrowRight, Check,
} from 'lucide-react';
import { KidukaLogo } from './KidukaLogo';
import onboardingWelcome from '@/assets/onboarding-welcome.mp4.asset.json';
import onboardingScan from '@/assets/onboarding-scan.mp4.asset.json';
import onboardingReports from '@/assets/onboarding-reports.mp4.asset.json';

interface OnboardingTourProps {
  onComplete: () => void;
}

const slides = [
  {
    title: 'Karibu Kiduka!',
    subtitle: 'Mfumo wa kisasa wa kusimamia biashara yako',
    video: onboardingWelcome.url,
  },
  {
    title: 'Scan na Uuze',
    subtitle: 'Scan barcode, ongeza stock, chakata mauzo haraka',
    video: onboardingScan.url,
  },
  {
    title: 'Fuatilia Mauzo & Faida',
    subtitle: 'Ripoti za kina zinakusaidia kufanya maamuzi bora',
    video: onboardingReports.url,
  },
  {
    title: 'Uko Tayari!',
    subtitle: 'Anza kutumia Kiduka sasa',
    video: null,
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
    setTimeout(() => { setCurrent(c => c + 1); setAnimating(false); }, 200);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-background rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Skip button */}
        {!isLast && (
          <div className="absolute top-3 right-3 z-10">
            <Button variant="ghost" size="sm" onClick={onComplete} className="text-muted-foreground hover:text-foreground rounded-full">
              Ruka →
            </Button>
          </div>
        )}

        {/* Content area */}
        <div className={`flex-1 flex flex-col items-center overflow-hidden transition-opacity duration-200 ${animating ? 'opacity-0' : 'opacity-100'}`}>
          
          {/* Video section */}
          {slide.video ? (
            <div className="w-full aspect-video relative overflow-hidden rounded-t-3xl">
              <video
                key={slide.video}
                src={slide.video}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </div>
          ) : (
            /* Ready slide - no video */
            <div className="w-full pt-10 pb-4 flex flex-col items-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <Check className="h-10 w-10 text-green-600" />
              </div>
            </div>
          )}

          {/* Text content */}
          <div className="px-6 py-4 text-center space-y-2">
            <div className="flex justify-center mb-2">
              <KidukaLogo size="sm" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{slide.title}</h1>
            <p className="text-muted-foreground text-sm">{slide.subtitle}</p>
            
            {/* Ready slide tips */}
            {isLast && (
              <div className="bg-card border border-border/50 rounded-2xl p-4 text-left space-y-2 mt-4">
                {[
                  'Ongeza bidhaa zako za kwanza',
                  'Rekodi mauzo ya kwanza',
                  'Simamia wateja na madeni',
                  'Angalia ripoti za biashara',
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                    </div>
                    <span className="text-muted-foreground">{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="p-4 pb-6 flex flex-col items-center gap-4">
          {/* Dots */}
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? 'w-8 bg-primary' : i < current ? 'w-2 bg-primary/60' : 'w-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          
          <Button size="lg" className="w-full max-w-xs rounded-xl" onClick={goNext}>
            {isLast ? 'Anza Kutumia Kiduka' : 'Endelea'}
            {!isLast && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;

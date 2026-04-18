import { useState, useEffect } from 'react';
import { KidukaLogo } from '@/components/KidukaLogo';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import onboardingWelcomeImg from '@/assets/onboarding-welcome.jpg';
import onboardingScanImg from '@/assets/onboarding-scan.jpg';
import onboardingReportsImg from '@/assets/onboarding-reports.jpg';

interface OnboardingPagesProps {
  onComplete: () => void;
}

const pages = [
  {
    title: 'Karibu Kiduka',
    subtitle: 'Biashara Yako, Urahisi Wako',
    image: onboardingWelcomeImg,
  },
  {
    title: 'Scan na Uuze',
    subtitle: 'Scan barcode, ongeza stock, chakata mauzo kwa urahisi',
    image: onboardingScanImg,
  },
  {
    title: 'Ripoti za Kina',
    subtitle: 'Fuatilia mauzo, stock na utendaji wa biashara yako',
    image: onboardingReportsImg,
  },
];

const AUTO_INTERVAL = 3200;

export const OnboardingPages = ({ onComplete }: OnboardingPagesProps) => {
  const [index, setIndex] = useState(0);

  // Lock scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  // Auto-advance through slides (loops continuously)
  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % pages.length);
    }, AUTO_INTERVAL);
    return () => clearInterval(t);
  }, []);

  const current = pages[index];

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-background overflow-hidden flex flex-col md:flex-row">
      {/* ============== MOBILE: top image with curved bottom ============== */}
      <div className="md:hidden relative w-full h-[50%] flex-shrink-0 overflow-hidden">
        {pages.map((p, i) => (
          <img
            key={i}
            src={p.image}
            alt={p.title}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        {/* Curved bottom mask using SVG */}
        <svg
          className="absolute bottom-[-1px] left-0 w-full"
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          style={{ height: '70px' }}
        >
          <path
            d="M0,80 C360,160 1080,0 1440,80 L1440,140 L0,140 Z"
            fill="hsl(var(--background))"
          />
        </svg>
        {/* indicators on the image */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {pages.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-8 bg-white' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* MOBILE content (centered) */}
      <div className="md:hidden flex-1 flex flex-col items-center justify-center text-center px-6 pb-8">
        <KidukaLogo size="lg" />
        <h2 className="text-2xl font-bold text-foreground mt-4 transition-opacity duration-500" key={`mt-${index}`}>
          {current.title}
        </h2>
        <p className="text-base text-muted-foreground mt-2 max-w-xs transition-opacity duration-500" key={`ms-${index}`}>
          {current.subtitle}
        </p>
        <Button
          onClick={onComplete}
          className="mt-8 h-12 rounded-full px-10 text-base font-semibold"
        >
          Anza Sasa
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

      {/* ============== DESKTOP: split, tilted card on left ============== */}
      <div className="hidden md:flex md:w-1/2 items-center justify-center p-10 bg-muted/30 relative overflow-hidden">
        <div className="relative w-full max-w-md aspect-[4/5]">
          {pages.map((p, i) => {
            const isActive = i === index;
            const offset = i - index;
            return (
              <div
                key={i}
                className="absolute inset-0 rounded-3xl overflow-hidden shadow-2xl border border-border/50 bg-card transition-all duration-700 ease-out"
                style={{
                  transform: isActive
                    ? 'rotate(-3deg) translateY(0) scale(1)'
                    : `rotate(${offset * 6 - 3}deg) translateY(${Math.abs(offset) * 30}px) scale(${1 - Math.abs(offset) * 0.05})`,
                  opacity: isActive ? 1 : 0.35,
                  zIndex: isActive ? 10 : 10 - Math.abs(offset),
                }}
              >
                <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
              </div>
            );
          })}
        </div>
      </div>

      {/* DESKTOP content (right) */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center text-center px-10">
        <KidukaLogo size="lg" />
        <h2 className="text-4xl font-bold text-foreground mt-6 transition-opacity duration-500" key={`dt-${index}`}>
          {current.title}
        </h2>
        <p className="text-lg text-muted-foreground mt-3 max-w-sm transition-opacity duration-500" key={`ds-${index}`}>
          {current.subtitle}
        </p>

        <div className="mt-6 flex items-center gap-2">
          {pages.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === index ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        <Button
          onClick={onComplete}
          className="mt-8 h-12 rounded-full px-10 text-base font-semibold"
        >
          Anza Sasa
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Home, Package, ShoppingCart, BarChart3, Users, Settings,
  CreditCard, BookOpen, Store, ArrowRight, Check, Crown,
  ClipboardList, MapPin, MessageSquare, Smartphone, Bell,
  TrendingUp, Receipt, Shield, Sparkles
} from 'lucide-react';

interface OnboardingTourProps {
  onComplete: () => void;
}

const features = [
  { icon: Home, label: 'Dashboard', desc: 'Muhtasari wa biashara yako yote kwa wakati halisi' },
  { icon: Package, label: 'Bidhaa', desc: 'Ongeza, hariri, na simamia bidhaa na stock' },
  { icon: ShoppingCart, label: 'Mauzo', desc: 'Rekodi mauzo kwa haraka na risiti za moja kwa moja' },
  { icon: ClipboardList, label: 'Stock', desc: 'Fuatilia hali ya stock na upungufu' },
  { icon: Crown, label: 'Oda Sokoni', desc: 'Pokea na simamia oda kutoka sokoni' },
  { icon: Users, label: 'Wateja', desc: 'Simamia wateja, madeni na mikopo' },
  { icon: CreditCard, label: 'Mikopo', desc: 'Toa na fuatilia mikopo kwa wateja' },
  { icon: BarChart3, label: 'Ripoti', desc: 'Ripoti za kina za mauzo, faida na matumizi' },
  { icon: BookOpen, label: 'Uhasibu', desc: 'Kitabu cha mapato na matumizi' },
  { icon: Store, label: 'Matawi', desc: 'Simamia matawi mengi ya biashara' },
  { icon: MessageSquare, label: 'WhatsApp', desc: 'Tuma ujumbe wa WhatsApp kwa wateja' },
  { icon: Settings, label: 'Mipangilio', desc: 'Dhibiti akaunti, michango na zaidi' },
];

const slides = [
  {
    title: 'Karibu Kiduka POS!',
    subtitle: 'Mfumo wa kisasa wa kusimamia biashara yako',
    type: 'welcome' as const,
  },
  {
    title: 'Simamia Biashara Yako',
    subtitle: 'Zana zote unazohitaji katika sehemu moja',
    type: 'features' as const,
  },
  {
    title: 'Fuatilia Mauzo & Faida',
    subtitle: 'Ripoti za kina zinakusaidia kufanya maamuzi bora',
    type: 'analytics' as const,
  },
  {
    title: 'Uko Tayari!',
    subtitle: 'Anza kutumia Kiduka POS sasa',
    type: 'ready' as const,
  },
];

const OnboardingTour = ({ onComplete }: OnboardingTourProps) => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [visibleFeatures, setVisibleFeatures] = useState(0);

  const slide = slides[current];
  const isLast = current === slides.length - 1;

  // Animate features appearing one by one
  useEffect(() => {
    if (slide.type === 'features') {
      setVisibleFeatures(0);
      const interval = setInterval(() => {
        setVisibleFeatures(prev => {
          if (prev >= features.length) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 120);
      return () => clearInterval(interval);
    }
  }, [current, slide.type]);

  const goNext = () => {
    if (animating) return;
    if (isLast) { onComplete(); return; }
    setAnimating(true);
    setTimeout(() => { setCurrent(c => c + 1); setAnimating(false); }, 200);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col">
      {/* Skip button */}
      {!isLast && (
        <div className="absolute top-4 right-4 z-10">
          <Button variant="ghost" size="sm" onClick={onComplete} className="text-muted-foreground hover:text-foreground">
            Ruka →
          </Button>
        </div>
      )}

      {/* Content area */}
      <div className={`flex-1 flex flex-col items-center justify-center px-4 transition-opacity duration-200 ${animating ? 'opacity-0' : 'opacity-100'}`}>
        
        {/* Welcome slide */}
        {slide.type === 'welcome' && (
          <div className="text-center max-w-md space-y-6">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 bg-primary/20 rounded-3xl animate-pulse" />
              <div className="absolute inset-2 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">🎉 {slide.title}</h1>
              <p className="text-muted-foreground text-lg">{slide.subtitle}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-4">
              {[
                { icon: ShoppingCart, label: 'Mauzo', color: 'bg-blue-500/10 text-blue-600' },
                { icon: Package, label: 'Stock', color: 'bg-green-500/10 text-green-600' },
                { icon: BarChart3, label: 'Ripoti', color: 'bg-purple-500/10 text-purple-600' },
              ].map((item, i) => (
                <div key={i} className={`p-3 rounded-2xl ${item.color} flex flex-col items-center gap-1`}>
                  <item.icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features slide - animated list */}
        {slide.type === 'features' && (
          <div className="w-full max-w-lg space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">{slide.title}</h1>
              <p className="text-muted-foreground text-sm">{slide.subtitle}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {features.map((feat, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card transition-all duration-300 ${
                    i < visibleFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feat.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{feat.label}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics slide */}
        {slide.type === 'analytics' && (
          <div className="w-full max-w-md space-y-6 text-center">
            <h1 className="text-2xl font-bold text-foreground">{slide.title}</h1>
            <p className="text-muted-foreground text-sm">{slide.subtitle}</p>
            
            {/* Mock chart */}
            <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Mauzo ya Wiki</span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="flex items-end gap-1 h-24 justify-center">
                {[35, 52, 45, 68, 72, 60, 85].map((h, i) => (
                  <div
                    key={i}
                    className="w-8 bg-primary/20 rounded-t-lg transition-all duration-700"
                    style={{
                      height: `${h}%`,
                      transitionDelay: `${i * 100}ms`,
                    }}
                  >
                    <div
                      className="w-full bg-primary rounded-t-lg transition-all duration-700"
                      style={{
                        height: `${h}%`,
                        transitionDelay: `${i * 150}ms`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                {['Jmt', 'Jnn', 'Jtt', 'Amn', 'Ijk', 'Ijm', 'Jps'].map(d => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border/50 rounded-xl p-3 text-left">
                <p className="text-[10px] text-muted-foreground uppercase">Faida</p>
                <p className="text-lg font-bold text-green-600">+24%</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-3 text-left">
                <p className="text-[10px] text-muted-foreground uppercase">Wateja Wapya</p>
                <p className="text-lg font-bold text-primary">+12</p>
              </div>
            </div>
          </div>
        )}

        {/* Ready slide */}
        {slide.type === 'ready' && (
          <div className="text-center max-w-md space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">✅ {slide.title}</h1>
              <p className="text-muted-foreground text-lg">{slide.subtitle}</p>
            </div>
            <div className="bg-card border border-border/50 rounded-2xl p-4 text-left space-y-2">
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
          </div>
        )}
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
  );
};

export default OnboardingTour;

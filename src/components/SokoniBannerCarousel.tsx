import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import sokoniPromo1 from '@/assets/sokoni-promo-1.jpg';
import sokoniPromo2 from '@/assets/sokoni-promo-2.jpg';

interface BannerSlide {
  id: string;
  media_url: string;
  title?: string;
  link_url?: string | null;
  type: 'promo' | 'ad';
}

interface SokoniBannerCarouselProps {
  onBrowse?: () => void;
}

export const SokoniBannerCarousel = ({ onBrowse }: SokoniBannerCarouselProps) => {
  const [slides, setSlides] = useState<BannerSlide[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchSlides();
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const fetchSlides = async () => {
    const defaultSlides: BannerSlide[] = [
      { id: 'promo-1', media_url: sokoniPromo1, title: 'Kiduka - Simamia Biashara Yako', type: 'promo' },
      { id: 'promo-2', media_url: sokoniPromo2, title: 'Sokoni Marketplace', type: 'promo' },
    ];

    try {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from('business_ads')
        .select('id, title, image_url, link_url')
        .eq('is_active', true)
        .or(`display_location.eq.sokoni,display_location.eq.both`)
        .lte('starts_at', now)
        .or(`expires_at.is.null,expires_at.gt.${now}`);

      const adSlides: BannerSlide[] = ((data as any[]) || [])
        .filter(ad => ad.image_url)
        .map(ad => ({
          id: ad.id,
          media_url: ad.image_url!,
          title: ad.title,
          link_url: ad.link_url,
          type: 'ad' as const
        }));

      const allSlides = [...adSlides, ...defaultSlides];
      setSlides(allSlides.sort(() => Math.random() - 0.5));
    } catch {
      setSlides(defaultSlides);
    }
  };

  const goNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const currentSlide = slides[currentIndex];

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-muted">
      <img
        key={currentSlide.id}
        src={currentSlide.media_url}
        alt={currentSlide.title || 'Promo'}
        className="w-full h-full object-cover animate-fade-in"
        loading="lazy"
      />

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

      {/* Sponsored tag */}
      {currentSlide.type === 'ad' && (
        <span className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full">
          Sponsored
        </span>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
        {currentSlide.title && (
          <p className="text-white text-[10px] font-semibold drop-shadow-lg line-clamp-1 flex-1">{currentSlide.title}</p>
        )}
        {currentSlide.link_url ? (
          <Button size="sm" variant="secondary" className="rounded-full text-[9px] h-5 px-2 ml-1" asChild>
            <a href={currentSlide.link_url} target="_blank" rel="noopener noreferrer">Tazama</a>
          </Button>
        ) : currentSlide.type === 'promo' && onBrowse ? (
          <Button size="sm" variant="secondary" className="rounded-full text-[9px] h-5 px-2 ml-1" onClick={onBrowse}>
            Tazama
          </Button>
        ) : null}
      </div>

      {/* Navigation arrows */}
      {slides.length > 1 && (
        <>
          <button onClick={goPrev} className="absolute left-0.5 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-0.5 transition-colors">
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button onClick={goNext} className="absolute right-0.5 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-0.5 transition-colors">
            <ChevronRight className="h-3 w-3" />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`w-1 h-1 rounded-full transition-all ${i === currentIndex ? 'bg-white w-2' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

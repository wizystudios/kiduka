import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';

interface Ad {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  owner_id: string;
}

interface AdBannerProps {
  location?: 'kiduka' | 'sokoni' | 'both';
}

export const AdBanner = ({ location = 'both' }: AdBannerProps) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    fetchAds();
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => {
      goNext();
    }, 4000);
    return () => clearInterval(timer);
  }, [ads.length, currentIndex]);

  const fetchAds = async () => {
    const now = new Date();
    const { data } = await supabase
      .from('business_ads' as any)
      .select('id, title, description, image_url, link_url, owner_id')
      .eq('is_active', true)
      .or(`display_location.eq.${location},display_location.eq.both`);

    if (data && data.length > 0) {
      const activeAds = (data as unknown as Ad[]).filter((ad) => {
        const started = !ad['starts_at' as keyof Ad] || new Date((ad as any).starts_at) <= now;
        const notExpired = !(ad as any).expires_at || new Date((ad as any).expires_at) > now;
        return started && notExpired;
      });
      const shuffled = [...activeAds].sort(() => Math.random() - 0.5);
      setAds(shuffled);
    }
  };

  const goNext = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % ads.length);
      setIsTransitioning(false);
    }, 300);
  };

  const goPrev = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + ads.length) % ads.length);
      setIsTransitioning(false);
    }, 300);
  };

  if (ads.length === 0) return null;

  const ad = ads[currentIndex];

  const handleClick = () => {
    if (ad.link_url) {
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-full px-4 py-1.5">
      <div className="relative group">
        {/* Main ad card */}
        <div
          onClick={handleClick}
          className={`relative overflow-hidden rounded-xl border border-border/30 transition-all duration-300 ${
            isTransitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
          } ${ad.link_url ? 'cursor-pointer' : ''}`}
          style={{ height: ad.image_url ? '80px' : '52px' }}
        >
          {/* Background image or gradient */}
          {ad.image_url ? (
            <div className="absolute inset-0">
              <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-primary/5 to-accent/10" />
          )}

          {/* Content overlay */}
          <div className="relative h-full flex items-center px-3 gap-2">
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold truncate ${ad.image_url ? 'text-white' : 'text-foreground'}`}>
                {ad.title}
              </p>
              {ad.description && (
                <p className={`text-[10px] line-clamp-1 mt-0.5 ${ad.image_url ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {ad.description}
                </p>
              )}
            </div>
            {ad.link_url && (
              <div className={`flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full ${
                ad.image_url 
                  ? 'bg-white/20 text-white backdrop-blur-sm' 
                  : 'bg-primary/10 text-primary'
              }`}>
                <span>Tembelea</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </div>
            )}
          </div>

          {/* Sponsored tag */}
          <div className="absolute top-1 right-2">
            <span className={`text-[7px] uppercase tracking-widest ${
              ad.image_url ? 'text-white/40' : 'text-muted-foreground/40'
            }`}>Ad</span>
          </div>
        </div>

        {/* Navigation arrows */}
        {ads.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-0.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-0.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </>
        )}

        {/* Progress bar */}
        {ads.length > 1 && (
          <div className="flex justify-center gap-0.5 mt-1">
            {ads.map((_, i) => (
              <div
                key={i}
                className={`h-[2px] rounded-full transition-all duration-500 ${
                  i === currentIndex ? 'w-4 bg-primary' : 'w-1.5 bg-border/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

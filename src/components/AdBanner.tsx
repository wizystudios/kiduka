import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExternalLink } from 'lucide-react';

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

  useEffect(() => {
    fetchAds();
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % ads.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [ads.length]);

  const fetchAds = async () => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('business_ads' as any)
      .select('id, title, description, image_url, link_url, owner_id')
      .eq('is_active', true)
      .or(`display_location.eq.${location},display_location.eq.both`)
      .lte('starts_at', now)
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    if (data && data.length > 0) {
      // Shuffle ads
      const shuffled = [...(data as unknown as Ad[])].sort(() => Math.random() - 0.5);
      setAds(shuffled);
    }
  };

  if (ads.length === 0) return null;

  const ad = ads[currentIndex];

  const handleClick = () => {
    if (ad.link_url) {
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="w-full px-4 py-2">
      <div
        onClick={handleClick}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border border-border/50 transition-all duration-500 ${ad.link_url ? 'cursor-pointer hover:shadow-md active:scale-[0.99]' : ''}`}
      >
        <div className="flex items-center gap-3 p-3">
          {ad.image_url && (
            <img
              src={ad.image_url}
              alt={ad.title}
              className="h-12 w-12 rounded-xl object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{ad.title}</p>
            {ad.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{ad.description}</p>
            )}
          </div>
          {ad.link_url && (
            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
        </div>

        {/* Progress dots */}
        {ads.length > 1 && (
          <div className="flex justify-center gap-1 pb-2">
            {ads.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentIndex ? 'w-4 bg-primary' : 'w-1 bg-border'
                }`}
              />
            ))}
          </div>
        )}

        {/* Sponsored label */}
        <div className="absolute top-1 right-2">
          <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider">Tangazo</span>
        </div>
      </div>
    </div>
  );
};

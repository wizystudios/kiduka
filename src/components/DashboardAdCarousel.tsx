import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import adDashboard from '@/assets/ad-dashboard.jpg';
import adMobilePay from '@/assets/ad-mobile-pay.jpg';
import adInventory from '@/assets/ad-inventory.jpg';
import adScanner from '@/assets/ad-scanner.jpg';
import adDelivery from '@/assets/ad-delivery.jpg';
import adReports from '@/assets/ad-reports.jpg';
import adLoyalty from '@/assets/ad-loyalty.jpg';
import adWhatsapp from '@/assets/ad-whatsapp.jpg';

const fallbackAds = [
  { src: adDashboard, label: 'Angalia mauzo yako kwa urahisi', tag: 'Ripoti' },
  { src: adMobilePay, label: 'Pokea malipo ya simu haraka', tag: 'Malipo' },
  { src: adInventory, label: 'Panga bidhaa zako vizuri', tag: 'Stock' },
  { src: adScanner, label: 'Scan bidhaa kwa sekunde', tag: 'Scanner' },
  { src: adDelivery, label: 'Wafikishie wateja wako', tag: 'Delivery' },
  { src: adReports, label: 'Fanya maamuzi bora', tag: 'Uchambuzi' },
  { src: adLoyalty, label: 'Wateja wako warejee', tag: 'Tuzo' },
  { src: adWhatsapp, label: 'Wasiliana na wateja', tag: 'WhatsApp' },
];

export const DashboardAdCarousel = () => {
  const [ads, setAds] = useState(fallbackAds);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fetchManagedAds = async () => {
      const now = new Date();
      const { data } = await supabase
        .from('business_ads' as any)
        .select('title, image_url, starts_at, expires_at')
        .eq('is_active', true)
        .or('display_location.eq.kiduka,display_location.eq.both');

      const managedAds = ((data as any[]) || [])
        .filter((ad) => ad.image_url)
        .filter((ad) => {
          const started = !ad.starts_at || new Date(ad.starts_at) <= now;
          const notExpired = !ad.expires_at || new Date(ad.expires_at) > now;
          return started && notExpired;
        })
        .map((ad, idx) => ({
          src: ad.image_url,
          label: ad.title || `Tangazo ${idx + 1}`,
          tag: 'Tangazo',
        }));

      setAds(managedAds.length > 0 ? managedAds : fallbackAds);
    };

    void fetchManagedAds();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % ads.length);
        setVisible(true);
      }, 250);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const visibleAds = useMemo(() => [
    ads[index % ads.length],
    ads[(index + 1) % ads.length],
    ads[(index + 2) % ads.length],
  ], [index]);

  return (
    <div className="w-full space-y-1">
      <div className="grid grid-cols-3 gap-1">
        {visibleAds.map((ad, i) => (
          <div
            key={`${index}-${i}`}
            className={`relative h-[72px] overflow-hidden rounded-xl border border-border/30 transition-all duration-500 ease-out sm:h-[80px] ${
              visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-3 scale-95'
            }`}
          >
            <img
              src={ad.src}
              alt={ad.tag}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-1">
              <div className="rounded-md border border-border/30 bg-background/80 px-1 py-1 shadow-sm backdrop-blur-md">
                <p className="text-[6px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{ad.tag}</p>
                <p className="mt-0.5 line-clamp-2 text-[8px] font-semibold leading-tight text-foreground">{ad.label}</p>
              </div>
            </div>
            <div className="absolute top-1 right-1">
              <span className="text-[6px] uppercase tracking-widest text-white/40">Ad</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-0.5">
        {ads.map((_, i) => (
          <div
            key={i}
            className={`h-[2px] rounded-full transition-all duration-500 ${
              i === index ? 'w-3.5 bg-primary' : 'w-1 bg-border/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

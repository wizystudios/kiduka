import { useState, useEffect, useMemo } from 'react';
import adDashboard from '@/assets/ad-dashboard.jpg';
import adMobilePay from '@/assets/ad-mobile-pay.jpg';
import adInventory from '@/assets/ad-inventory.jpg';
import adScanner from '@/assets/ad-scanner.jpg';
import adDelivery from '@/assets/ad-delivery.jpg';
import adReports from '@/assets/ad-reports.jpg';
import adLoyalty from '@/assets/ad-loyalty.jpg';
import adWhatsapp from '@/assets/ad-whatsapp.jpg';

const ads = [
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
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

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
    <div className="w-full space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {visibleAds.map((ad, i) => (
          <div
            key={`${index}-${i}`}
            className={`relative overflow-hidden rounded-2xl border border-border/30 aspect-[3/4] transition-all duration-500 ease-out ${
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
            <div className="absolute inset-x-0 bottom-0 p-2">
              <div className="rounded-xl border border-border/30 bg-background/80 backdrop-blur-md px-2 py-1.5 shadow-sm">
                <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{ad.tag}</p>
                <p className="text-[10px] font-semibold leading-tight text-foreground mt-0.5 line-clamp-2">{ad.label}</p>
              </div>
            </div>
            <div className="absolute top-1 right-1.5">
              <span className="text-[6px] uppercase tracking-widest text-white/40">Ad</span>
            </div>
          </div>
        ))}
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-0.5">
        {ads.map((_, i) => (
          <div
            key={i}
            className={`h-[2px] rounded-full transition-all duration-500 ${
              i === index ? 'w-4 bg-primary' : 'w-1.5 bg-border/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

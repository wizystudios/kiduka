import { useState, useEffect } from 'react';
import adDashboard from '@/assets/ad-dashboard.jpg';
import adMobilePay from '@/assets/ad-mobile-pay.jpg';
import adInventory from '@/assets/ad-inventory.jpg';
import adScanner from '@/assets/ad-scanner.jpg';
import adDelivery from '@/assets/ad-delivery.jpg';
import adReports from '@/assets/ad-reports.jpg';
import adLoyalty from '@/assets/ad-loyalty.jpg';
import adWhatsapp from '@/assets/ad-whatsapp.jpg';

const leftAds = [
  { src: adDashboard, label: 'Ripoti' },
  { src: adMobilePay, label: 'Malipo' },
  { src: adInventory, label: 'Stock' },
  { src: adScanner, label: 'Scanner' },
];

const rightAds = [
  { src: adDelivery, label: 'Delivery' },
  { src: adReports, label: 'Uchambuzi' },
  { src: adLoyalty, label: 'Tuzo' },
  { src: adWhatsapp, label: 'WhatsApp' },
];

const AdCard = ({ ads: adList, delay }: { ads: typeof leftAds; delay: number }) => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % adList.length);
        setVisible(true);
      }, 250);
    }, 4000 + delay);
    return () => clearInterval(timer);
  }, [adList.length, delay]);

  const ad = adList[index];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/20 w-[140px] h-[160px] shadow-sm flex-shrink-0">
      <img
        src={ad.src}
        alt={ad.label}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        width={140}
        height={160}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute bottom-2 left-2 right-2">
        <span className="text-[10px] font-bold text-white/90">{ad.label}</span>
      </div>
      <div className="absolute top-1 right-1.5">
        <span className="text-[6px] uppercase tracking-widest text-white/30">Ad</span>
      </div>
    </div>
  );
};

export const DesktopSideAds = () => (
  <div className="hidden lg:flex fixed inset-y-0 left-0 right-0 z-0 pointer-events-none">
    <div className="w-full max-w-[1400px] mx-auto flex items-center justify-between px-4">
      <div className="pointer-events-auto">
        <AdCard ads={leftAds} delay={0} />
      </div>
      <div className="pointer-events-auto">
        <AdCard ads={rightAds} delay={1500} />
      </div>
    </div>
  </div>
);

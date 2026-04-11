import { useState, useEffect } from 'react';
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

  const ad = ads[index];

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-2xl border border-border/30 h-[100px]">
        <img
          src={ad.src}
          alt={ad.tag}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          loading="lazy"
          width={512}
          height={512}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        <div className="relative h-full flex items-end p-3">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-white/60">{ad.tag}</span>
            <p className="text-sm font-bold text-white leading-tight mt-0.5">{ad.label}</p>
          </div>
        </div>
        <div className="absolute top-1.5 right-2">
          <span className="text-[7px] uppercase tracking-widest text-white/40">Ad</span>
        </div>
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-0.5 mt-1.5">
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

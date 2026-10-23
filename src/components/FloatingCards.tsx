import { useEffect, useMemo, useState } from 'react';
import cardScan from '@/assets/card-scan.jpg';
import cardAnalytics from '@/assets/card-analytics.jpg';
import cardShop from '@/assets/card-shop.jpg';
import cardInventory from '@/assets/card-inventory.jpg';
import cardPayment from '@/assets/card-payment.jpg';

const cards = [
  { src: cardScan, alt: 'Scan', label: 'Scan ya bidhaa' },
  { src: cardAnalytics, alt: 'Ripoti', label: 'Ripoti za biashara' },
  { src: cardShop, alt: 'Nunua', label: 'Ununuzi wa haraka' },
  { src: cardInventory, alt: 'Stock', label: 'Usimamizi wa stock' },
  { src: cardPayment, alt: 'Lipa', label: 'Malipo rahisi' },
];

const ROTATION_INTERVAL = 3200;

export const FloatingCards = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timeout: number | undefined;
    const interval = window.setInterval(() => {
      setVisible(false);

      timeout = window.setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % cards.length);
        setVisible(true);
      }, 220);
    }, ROTATION_INTERVAL);

    return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
  }, []);

  const visibleCards = useMemo(() => ({
    left: cards[activeIndex],
    leftShadow: cards[(activeIndex + 1) % cards.length],
    right: cards[(activeIndex + 2) % cards.length],
    rightShadow: cards[(activeIndex + 3) % cards.length],
  }), [activeIndex]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* MOBILE: one card top-left (curved), one card bottom-right (curved) — out of center content area */}
      <div className="md:hidden absolute inset-0">
        <div className="absolute -top-6 -left-6 rotate-[-12deg] opacity-70">
          <div className="h-28 w-20 overflow-hidden rounded-[2rem] border border-border/40 bg-card shadow-xl">
            <img src={visibleCards.left.src} alt="" className={`h-full w-full object-cover transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`} loading="lazy" />
          </div>
        </div>
        <div className="absolute -bottom-6 -right-6 rotate-[12deg] opacity-70">
          <div className="h-28 w-20 overflow-hidden rounded-[2rem] border border-border/40 bg-card shadow-xl">
            <img src={visibleCards.right.src} alt="" className={`h-full w-full object-cover transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`} loading="lazy" />
          </div>
        </div>
      </div>

      {/* DESKTOP: original split layout */}
      <div className="hidden md:block">
        {[cards.slice(0, 2), cards.slice(2, 5)].map((side, sideIndex) => <div key={sideIndex} className={`absolute top-1/2 -translate-y-1/2 flex flex-col gap-3 ${sideIndex === 0 ? 'left-2' : 'right-2'}`}>
          {side.map((card, i) => <div key={card.alt} className={`w-12 h-14 rounded-xl overflow-hidden shadow-lg border border-border/20 opacity-40 ${i % 2 === 0 ? '-rotate-6' : 'rotate-[4deg]'}`}>
            <img src={card.src} alt={card.alt} className="w-full h-full object-cover" loading="lazy" />
          </div>)}
        </div>)}
      </div>
    </div>
  );
};

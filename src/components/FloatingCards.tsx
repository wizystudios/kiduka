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

const FloatingCardItem = ({
  card,
  shadowCard,
  align,
  visible,
}: {
  card: (typeof cards)[number];
  shadowCard: (typeof cards)[number];
  align: 'left' | 'right';
  visible: boolean;
}) => (
  <div
    className={[
      'relative pointer-events-none',
      'h-36 w-24 sm:h-44 sm:w-28 md:h-52 md:w-36',
      align === 'left' ? 'rotate-[-6deg]' : 'rotate-[6deg]',
    ].join(' ')}
  >
    <div
      className={[
        'absolute inset-0 overflow-hidden rounded-[1.65rem] border border-border/30 bg-card/40 shadow-sm backdrop-blur-sm',
        align === 'left' ? 'translate-x-2 translate-y-2 rotate-[7deg]' : '-translate-x-2 translate-y-2 -rotate-[7deg]',
      ].join(' ')}
    >
      <img src={shadowCard.src} alt="" className="h-full w-full object-cover opacity-30 blur-[1px]" loading="lazy" />
    </div>

    <div
      className={[
        'absolute inset-0 overflow-hidden rounded-[1.65rem] border border-border/50 bg-card shadow-2xl transition-all duration-500 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
      ].join(' ')}
    >
      <img src={card.src} alt={card.alt} className="h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
        <div className="rounded-2xl border border-border/40 bg-background/85 px-2.5 py-2 backdrop-blur-md shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{card.alt}</p>
          <p className="mt-1 text-xs font-semibold leading-tight text-foreground sm:text-sm">{card.label}</p>
        </div>
      </div>
    </div>
  </div>
);

export const FloatingCards = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisible(false);

      window.setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % cards.length);
        setVisible(true);
      }, 220);
    }, ROTATION_INTERVAL);

    return () => window.clearInterval(interval);
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
      <div className="hidden md:flex mx-auto h-full max-w-3xl items-center justify-between px-4 md:px-6">
        <FloatingCardItem
          card={visibleCards.left}
          shadowCard={visibleCards.leftShadow}
          align="left"
          visible={visible}
        />
        <FloatingCardItem
          card={visibleCards.right}
          shadowCard={visibleCards.rightShadow}
          align="right"
          visible={visible}
        />
      </div>
    </div>
  );
};

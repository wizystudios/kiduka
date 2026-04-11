import cardScan from '@/assets/card-scan.jpg';
import cardAnalytics from '@/assets/card-analytics.jpg';
import cardShop from '@/assets/card-shop.jpg';
import cardInventory from '@/assets/card-inventory.jpg';
import cardPayment from '@/assets/card-payment.jpg';

const cards = [
  { src: cardScan, alt: 'Scan', delay: '0s', y: '0%' },
  { src: cardAnalytics, alt: 'Ripoti', delay: '0.5s', y: '15%' },
  { src: cardShop, alt: 'Nunua', delay: '1s', y: '5%' },
  { src: cardInventory, alt: 'Stock', delay: '1.5s', y: '20%' },
  { src: cardPayment, alt: 'Lipa', delay: '2s', y: '10%' },
];

export const FloatingCards = () => {
  const leftCards = cards.slice(0, 2);
  const rightCards = cards.slice(2, 5);

  return (
    <>
      {/* Left side floating cards */}
      <div className="fixed left-1 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-0 pointer-events-none">
        {leftCards.map((card, i) => (
          <div
            key={card.alt}
            className="w-12 h-14 rounded-xl overflow-hidden shadow-lg border border-border/20 opacity-40 animate-fade-in"
            style={{
              animationDelay: card.delay,
              transform: `translateY(${card.y}) rotate(${i % 2 === 0 ? -6 : 4}deg)`,
            }}
          >
            <img src={card.src} alt={card.alt} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>

      {/* Right side floating cards */}
      <div className="fixed right-1 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-0 pointer-events-none">
        {rightCards.map((card, i) => (
          <div
            key={card.alt}
            className="w-12 h-14 rounded-xl overflow-hidden shadow-lg border border-border/20 opacity-40 animate-fade-in"
            style={{
              animationDelay: card.delay,
              transform: `translateY(${card.y}) rotate(${i % 2 === 0 ? 6 : -4}deg)`,
            }}
          >
            <img src={card.src} alt={card.alt} className="w-full h-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>
    </>
  );
};

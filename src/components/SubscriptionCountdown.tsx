import { useState, useEffect } from 'react';

interface SubscriptionCountdownProps {
  targetDate: string;
  compact?: boolean;
}

export const SubscriptionCountdown = ({ targetDate, compact = false }: SubscriptionCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const formatNumber = (num: number) => num.toString().padStart(2, '0');

  if (compact) {
    return (
      <div className="flex items-center justify-center gap-1 text-sm font-mono">
        <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-bold">{timeLeft.days}d</span>
        <span className="text-muted-foreground">:</span>
        <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-bold">{formatNumber(timeLeft.hours)}h</span>
        <span className="text-muted-foreground">:</span>
        <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-bold">{formatNumber(timeLeft.minutes)}m</span>
        <span className="text-muted-foreground">:</span>
        <span className="bg-muted px-1.5 py-0.5 rounded text-xs font-bold">{formatNumber(timeLeft.seconds)}s</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      <div className="p-2 bg-muted rounded-xl">
        <p className="text-lg font-bold font-mono">{timeLeft.days}</p>
        <p className="text-[10px] text-muted-foreground">Siku</p>
      </div>
      <div className="p-2 bg-muted rounded-xl">
        <p className="text-lg font-bold font-mono">{formatNumber(timeLeft.hours)}</p>
        <p className="text-[10px] text-muted-foreground">Saa</p>
      </div>
      <div className="p-2 bg-muted rounded-xl">
        <p className="text-lg font-bold font-mono">{formatNumber(timeLeft.minutes)}</p>
        <p className="text-[10px] text-muted-foreground">Dakika</p>
      </div>
      <div className="p-2 bg-muted rounded-xl">
        <p className="text-lg font-bold font-mono">{formatNumber(timeLeft.seconds)}</p>
        <p className="text-[10px] text-muted-foreground">Sekunde</p>
      </div>
    </div>
  );
};

import { useState, useEffect } from 'react';

interface CountdownProps {
  targetDate: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const SubscriptionCountdown = ({ targetDate }: CountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

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

  const TimeBlock = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl w-16 h-16 flex items-center justify-center shadow-lg">
        <span className="text-2xl font-bold">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="text-xs text-muted-foreground mt-1 font-medium">{label}</span>
    </div>
  );

  return (
    <div className="flex items-center justify-center gap-2">
      <TimeBlock value={timeLeft.days} label="Siku" />
      <span className="text-2xl font-bold text-muted-foreground self-start mt-4">:</span>
      <TimeBlock value={timeLeft.hours} label="Saa" />
      <span className="text-2xl font-bold text-muted-foreground self-start mt-4">:</span>
      <TimeBlock value={timeLeft.minutes} label="Dakika" />
      <span className="text-2xl font-bold text-muted-foreground self-start mt-4">:</span>
      <TimeBlock value={timeLeft.seconds} label="Sekunde" />
    </div>
  );
};

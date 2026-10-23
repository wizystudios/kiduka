import { Button } from '@/components/ui/button';
import { KidukaLogo } from './KidukaLogo';
import { InstructionCards } from './InstructionMedia';

export default function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
    <div className="max-h-[90dvh] w-full max-w-lg space-y-5 overflow-y-auto rounded-3xl bg-background p-5 shadow-xl">
      <div className="flex items-center justify-between"><KidukaLogo size="sm" /><Button variant="ghost" size="sm" onClick={onComplete}>Ruka →</Button></div>
      <InstructionCards />
      <Button className="w-full" onClick={onComplete}>Anza sasa</Button>
    </div>
  </div>;
}

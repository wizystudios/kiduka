import { Button } from '@/components/ui/button';
import { KidukaLogo } from '@/components/KidukaLogo';
import { InstructionCards } from './InstructionMedia';

export function OnboardingPages({ onComplete }: { onComplete: () => void }) {
  return <div className="flex h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-4 py-5">
    <div className="w-full max-w-lg space-y-4 overflow-y-auto"><div className="flex justify-center"><KidukaLogo size="lg" /></div><InstructionCards /><Button onClick={onComplete} className="w-full">Anza sasa</Button></div>
  </div>;
}

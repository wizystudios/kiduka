import { ShoppingBag, Check } from 'lucide-react';

interface KidukaSuccessAnimationProps {
  amount: number;
  label: string;
  title?: string;
}

export const KidukaSuccessAnimation = ({ amount, label, title = 'Malipo Yamekamilika!' }: KidukaSuccessAnimationProps) => (
  <div className="py-10 text-center">
    <div className="relative mx-auto mb-6 h-32 w-32">
      {/* expanding brand rings */}
      <span className="absolute inset-0 rounded-[2rem] bg-primary/15 animate-ping" />
      <span className="absolute inset-3 rounded-[1.75rem] bg-success/20 animate-pulse" />

      {/* Kiduka mark */}
      <div
        className="relative flex h-32 w-32 -rotate-12 items-center justify-center rounded-[2rem] shadow-xl animate-in zoom-in duration-500"
        style={{ background: 'linear-gradient(135deg, #2dd4bf, #3b82f6, #8b5cf6)' }}
      >
        <div className="flex h-20 w-20 rotate-12 items-center justify-center rounded-3xl bg-white/95">
          <ShoppingBag className="h-10 w-10 text-primary animate-in slide-in-from-bottom-2 duration-700" />
        </div>
      </div>

      {/* confirmation badge */}
      <div className="absolute -bottom-1 -right-1 flex h-11 w-11 items-center justify-center rounded-full border-4 border-background bg-success shadow-lg animate-in zoom-in duration-700 delay-200">
        <Check className="h-5 w-5 text-white" strokeWidth={3.5} />
      </div>
    </div>

    <h3 className="text-xl font-bold text-success animate-in fade-in slide-in-from-bottom-2">{title}</h3>
    <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    <p className="mt-2 text-3xl font-extrabold">TSh {amount.toLocaleString()}</p>
    <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Kiduka · Biashara Smart</p>
  </div>
);

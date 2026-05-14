import { cn } from '@/lib/utils';
import nurathAvatarSrc from '@/assets/nurath-avatar.png';
import { Mic, Volume2, Loader2, AlertTriangle, Sparkles } from 'lucide-react';

type NurathState = 'idle' | 'listening' | 'speaking' | 'processing' | 'error';

interface NurathAvatarProps {
  state?: NurathState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  audioLevel?: number; // 0..1
  /** Show small status pill overlay on the avatar (default true) */
  showStatusBadge?: boolean;
  /** When true and state !== 'idle', forces the floating ring animation even with no audio */
  alwaysAnimateActive?: boolean;
}

const SIZE_MAP = {
  sm: 'h-12 w-12',
  md: 'h-20 w-20',
  lg: 'h-28 w-28',
} as const;

const STATE_META: Record<NurathState, { label: string; ring: string; bubble: string; Icon: typeof Mic }> = {
  idle:       { label: 'Tayari',     ring: 'ring-blue-200',  bubble: 'bg-muted text-foreground',                       Icon: Sparkles },
  listening:  { label: 'Nasikiliza', ring: 'ring-green-500', bubble: 'bg-green-500 text-white',                        Icon: Mic },
  speaking:   { label: 'Naongea',    ring: 'ring-blue-500',  bubble: 'bg-blue-500 text-white',                         Icon: Volume2 },
  processing: { label: 'Nafikiri',   ring: 'ring-amber-500', bubble: 'bg-amber-500 text-white',                        Icon: Loader2 },
  error:      { label: 'Hitilafu',   ring: 'ring-red-500',   bubble: 'bg-red-500 text-white',                          Icon: AlertTriangle },
};

export const NurathAvatar = ({
  state = 'idle',
  size = 'md',
  className,
  audioLevel = 0,
  showStatusBadge = true,
  alwaysAnimateActive = true,
}: NurathAvatarProps) => {
  const meta = STATE_META[state];
  const isActive = state === 'listening' || state === 'speaking';
  const pulse = isActive || (alwaysAnimateActive && state !== 'idle');
  const scale = 1 + Math.min(0.12, audioLevel * 0.4);
  const Icon = meta.Icon;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      data-nurath-state={state}
      data-nurath-size={size}
      role="img"
      aria-label={`Nurath — ${meta.label}`}
    >
      {pulse && (
        <span
          className={cn(
            'absolute inset-0 rounded-full opacity-60 animate-ping',
            state === 'listening' ? 'bg-green-400/40'
              : state === 'speaking' ? 'bg-blue-400/40'
              : state === 'processing' ? 'bg-amber-400/40'
              : state === 'error' ? 'bg-red-400/40'
              : 'bg-blue-300/30',
          )}
        />
      )}
      <div
        className={cn(
          'relative rounded-full ring-4 ring-offset-2 ring-offset-background overflow-hidden bg-blue-50 transition-transform duration-150',
          SIZE_MAP[size],
          meta.ring,
        )}
        style={{ transform: `scale(${scale.toFixed(3)})` }}
      >
        <img
          src={nurathAvatarSrc}
          alt="Nurath — msaidizi wa sauti"
          width={256}
          height={256}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>

      {showStatusBadge && (
        <span
          className={cn(
            'absolute -bottom-1 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shadow-sm whitespace-nowrap',
            meta.bubble,
          )}
          data-nurath-status-label
        >
          <Icon className={cn('h-3 w-3', state === 'processing' && 'animate-spin')} />
          {meta.label}
        </span>
      )}
    </div>
  );
};

export type { NurathState };

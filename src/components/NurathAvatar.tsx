import { cn } from '@/lib/utils';
import nurathAvatarSrc from '@/assets/nurath-avatar.png';

type NurathState = 'idle' | 'listening' | 'speaking' | 'processing' | 'error';

interface NurathAvatarProps {
  state?: NurathState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  audioLevel?: number; // 0..1
}

const SIZE_MAP = {
  sm: 'h-12 w-12',
  md: 'h-20 w-20',
  lg: 'h-28 w-28',
} as const;

export const NurathAvatar = ({ state = 'idle', size = 'md', className, audioLevel = 0 }: NurathAvatarProps) => {
  const ringColor =
    state === 'listening'
      ? 'ring-green-500'
      : state === 'speaking'
        ? 'ring-blue-500'
        : state === 'processing'
          ? 'ring-amber-500'
          : state === 'error'
            ? 'ring-red-500'
            : 'ring-blue-200';

  const pulse = state === 'listening' || state === 'speaking';
  const scale = 1 + Math.min(0.12, audioLevel * 0.4);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {pulse && (
        <span
          className={cn(
            'absolute inset-0 rounded-full opacity-60 animate-ping',
            state === 'listening' ? 'bg-green-400/40' : 'bg-blue-400/40',
          )}
        />
      )}
      <div
        className={cn(
          'relative rounded-full ring-4 ring-offset-2 ring-offset-background overflow-hidden bg-blue-50 transition-transform duration-150',
          SIZE_MAP[size],
          ringColor,
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
    </div>
  );
};

export type { NurathState };

import { Store } from 'lucide-react';

interface SokoniLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  animate?: boolean;
}

export const SokoniLogo = ({ size = 'md', showText = true, animate = true }: SokoniLogoProps) => {
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-8 w-8'
  };

  const outerSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-14 h-14'
  };

  const innerSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-9 h-9'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`relative ${animate ? 'animate-pulse' : ''}`}>
        {/* Gradient rotated square - matching Kiduka style */}
        <div 
          className={`${outerSizes[size]} rounded-xl transform -rotate-6 shadow-lg transition-transform hover:rotate-0 duration-300`}
          style={{ background: 'linear-gradient(135deg, #f97316, #ef4444, #ec4899)' }}
        >
          <div className={`${innerSizes[size]} bg-white rounded-lg absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-6 hover:rotate-0 transition-transform duration-300 flex items-center justify-center`}>
            <Store className={`${iconSizes[size]} text-orange-600`} />
          </div>
        </div>
        {/* Accent dot */}
        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full animate-bounce" />
      </div>
      
      {showText && (
        <div>
          <h1 className={`${textSizeClasses[size]} font-black bg-gradient-to-r from-orange-600 via-red-500 to-pink-600 bg-clip-text text-transparent tracking-tight`}>
            Sokoni
          </h1>
          {size !== 'sm' && (
            <p className="text-[10px] text-muted-foreground font-medium -mt-0.5">Marketplace</p>
          )}
        </div>
      )}
    </div>
  );
};

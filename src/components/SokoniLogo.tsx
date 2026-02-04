import { Store } from 'lucide-react';

interface SokoniLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  animate?: boolean;
}

export const SokoniLogo = ({ size = 'md', showText = true, animate = true }: SokoniLogoProps) => {
  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-10 w-10'
  };

  const containerSizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  return (
    <div className="flex items-center gap-2">
      {/* Sokoni Logo - derived from Kiduka design */}
      <div className={`relative ${animate ? 'animate-pulse' : ''}`}>
        <div className={`bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 ${containerSizes[size]} rounded-xl shadow-lg transform -rotate-6 transition-transform hover:rotate-0 duration-300`}>
          <div className="bg-white p-0.5 rounded-lg transform rotate-6 hover:rotate-0 transition-transform duration-300">
            <Store className={`${sizeClasses[size]} text-orange-600`} />
          </div>
        </div>
        {/* Accent elements */}
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

import { ShoppingBag } from 'lucide-react';
import { useState, useEffect } from 'react';

interface KidukaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  animate?: boolean;
}

export const KidukaLogo = ({ size = 'md', showText = true, animate = false }: KidukaLogoProps) => {
  const [isBuilding, setIsBuilding] = useState(animate);
  
  useEffect(() => {
    if (animate) {
      setIsBuilding(true);
      const timer = setTimeout(() => setIsBuilding(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [animate]);

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-7 w-7',
    lg: 'h-10 w-10',
    xl: 'h-14 w-14'
  };

  const outerSizes = {
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-22 h-22'
  };

  const innerSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-11 h-11',
    xl: 'w-15 h-15'
  };

  const dotSizes = {
    sm: { top: 'w-1.5 h-1.5', bottom: 'w-1 h-1' },
    md: { top: 'w-2 h-2', bottom: 'w-1.5 h-1.5' },
    lg: { top: 'w-2.5 h-2.5', bottom: 'w-2 h-2' },
    xl: { top: 'w-3 h-3', bottom: 'w-2.5 h-2.5' }
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  const subTextSizes = {
    sm: 'text-[8px]',
    md: 'text-[10px]',
    lg: 'text-xs',
    xl: 'text-sm'
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`relative ${isBuilding ? 'animate-bounce' : ''}`}>
        {/* Gradient rotated square background */}
        <div 
          className={`${outerSizes[size]} rounded-2xl transform -rotate-12 shadow-lg transition-all duration-500 ${isBuilding ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
          style={{ 
            background: 'linear-gradient(135deg, #2dd4bf, #3b82f6, #8b5cf6)',
            transitionDelay: isBuilding ? '0ms' : '200ms' 
          }}
        >
          {/* White inner card with icon */}
          <div className={`${innerSizes[size]} bg-white rounded-xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-12 flex items-center justify-center shadow-sm`}>
            <ShoppingBag className={`${iconSizes[size]} text-emerald-600`} />
          </div>
        </div>

        {/* Yellow accent dot - top right */}
        <div className={`absolute -top-1 -right-0 ${dotSizes[size].top} bg-amber-400 rounded-full`} />
        {/* Pink accent dot - bottom left */}
        <div className={`absolute -bottom-0.5 -left-1 ${dotSizes[size].bottom} bg-pink-400 rounded-full`} />
      </div>
      
      {showText && (
        <div className={`transition-all duration-500 ${isBuilding ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
          <h1 className={`${textSizeClasses[size]} font-black bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight`}>
            Kiduka
          </h1>
          <p className={`${subTextSizes[size]} text-muted-foreground font-medium -mt-0.5`}>Smart Business</p>
        </div>
      )}
    </div>
  );
};

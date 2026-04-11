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

  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-7 w-7',
    lg: 'h-10 w-10',
    xl: 'h-14 w-14'
  };

  const containerSizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
    xl: 'p-4'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`relative ${isBuilding ? 'animate-bounce' : ''}`}>
        <div 
          className={`bg-gradient-to-br from-success to-primary ${containerSizes[size]} rounded-xl shadow-md transition-all duration-500 ${isBuilding ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
          style={{ transitionDelay: isBuilding ? '0ms' : '200ms' }}
        >
          <ShoppingBag className={`${sizeClasses[size]} text-white`} />
        </div>
      </div>
      
      {showText && (
        <div className={`transition-all duration-500 ${isBuilding ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
          <h1 className={`${textSizeClasses[size]} font-black bg-gradient-to-r from-success to-primary bg-clip-text text-transparent tracking-tight`}>
            Kiduka
          </h1>
          <p className="text-[10px] text-muted-foreground font-medium">Biashara Smart</p>
        </div>
      )}
    </div>
  );
};

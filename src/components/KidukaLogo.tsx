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
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const containerSizes = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
    xl: 'p-5'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Unique Kiduka Logo Design with building animation */}
      <div className={`relative ${isBuilding ? 'animate-bounce' : ''}`}>
        <div 
          className={`bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 ${containerSizes[size]} rounded-2xl shadow-lg transform rotate-12 transition-all duration-500 ${isBuilding ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
          style={{ transitionDelay: isBuilding ? '0ms' : '200ms' }}
        >
          <div className={`bg-white p-1 rounded-lg transform -rotate-12 transition-all duration-300 ${isBuilding ? 'scale-0' : 'scale-100'}`}>
            <ShoppingBag className={`${sizeClasses[size]} text-emerald-600`} />
          </div>
        </div>
        {/* Accent dots with staggered animation */}
        <div 
          className={`absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full transition-all duration-300 ${isBuilding ? 'scale-0' : 'scale-100 animate-bounce'}`}
          style={{ transitionDelay: '400ms' }}
        />
        <div 
          className={`absolute -bottom-1 -left-1 w-2 h-2 bg-pink-400 rounded-full transition-all duration-300 ${isBuilding ? 'scale-0' : 'scale-100 animate-pulse'}`}
          style={{ transitionDelay: '600ms' }}
        />
      </div>
      
      {showText && (
        <div className={`transition-all duration-500 ${isBuilding ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
          <h1 className={`${textSizeClasses[size]} font-black bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight`}>
            Kiduka
          </h1>
          <p className="text-xs text-muted-foreground font-medium">Smart Business</p>
        </div>
      )}
    </div>
  );
};


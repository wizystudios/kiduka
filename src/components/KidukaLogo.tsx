
import { ShoppingBag } from 'lucide-react';

interface KidukaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  animate?: boolean;
}

export const KidukaLogo = ({ size = 'md', showText = true, animate = false }: KidukaLogoProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl'
  };

  return (
    <div className="flex items-center space-x-3">
      {/* Unique Kiduka Logo Design */}
      <div className={`relative ${animate ? 'animate-pulse' : ''}`}>
        <div className="bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 p-3 rounded-2xl shadow-lg transform rotate-12">
          <div className="bg-white p-1 rounded-lg transform -rotate-12">
            <ShoppingBag className={`${sizeClasses[size]} text-emerald-600`} />
          </div>
        </div>
        {/* Accent dots */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-bounce"></div>
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
      </div>
      
      {showText && (
        <div>
          <h1 className={`${textSizeClasses[size]} font-black bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight`}>
            Kiduka
          </h1>
          <p className="text-xs text-gray-500 font-medium">Smart Business</p>
        </div>
      )}
    </div>
  );
};

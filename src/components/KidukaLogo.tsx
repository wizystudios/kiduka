
import { Store } from 'lucide-react';

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
      <div className={`bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 p-2 rounded-xl shadow-lg ${animate ? 'animate-pulse' : ''}`}>
        <Store className={`${sizeClasses[size]} text-white`} />
      </div>
      {showText && (
        <div>
          <h1 className={`${textSizeClasses[size]} font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent`}>
            Kiduka
          </h1>
          <p className="text-xs text-gray-500">Smart POS System</p>
        </div>
      )}
    </div>
  );
};

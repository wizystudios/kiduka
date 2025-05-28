
import { useEffect, useState } from 'react';
import { KidukaLogo } from '@/components/KidukaLogo';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 animate-bounce">
        <KidukaLogo size="xl" showText={false} />
      </div>

      {/* App Name */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Kiduka</h1>
        <p className="text-purple-200 text-lg">Smart POS System</p>
        <p className="text-purple-300 text-sm mt-2">Loading your business tools...</p>
      </div>

      {/* Progress Bar */}
      <div className="w-64 bg-white/20 rounded-full h-2 mb-4">
        <div 
          className="bg-white rounded-full h-2 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress Text */}
      <p className="text-white/80 text-sm">{progress}%</p>

      {/* Animated Dots */}
      <div className="flex space-x-1 mt-6">
        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
};


import { useEffect, useState } from 'react';
import { KidukaLogo } from '@/components/KidukaLogo';

interface LoadingScreenProps {
  onComplete: () => void;
}

export const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing...');

  useEffect(() => {
    const texts = [
      'Initializing...',
      'Loading inventory...',
      'Setting up scanner...',
      'Preparing dashboard...',
      'Almost ready!'
    ];

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + 4; // Faster loading
        
        // Update loading text based on progress
        const textIndex = Math.floor((newProgress / 100) * texts.length);
        if (textIndex < texts.length) {
          setLoadingText(texts[textIndex]);
        }
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 300); // Shorter delay
          return 100;
        }
        return newProgress;
      });
    }, 40); // Faster interval

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-blue-600 to-purple-700 flex flex-col items-center justify-center p-6">
      {/* Logo with enhanced animation */}
      <div className="mb-8 transform scale-125 animate-bounce">
        <KidukaLogo size="xl" showText={false} animate />
      </div>

      {/* App Name with better styling */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-black text-white mb-2 tracking-tight">Kiduka</h1>
        <p className="text-emerald-200 text-xl font-medium">Smart Business Solution</p>
        <p className="text-white/80 text-sm mt-3 animate-pulse">{loadingText}</p>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="w-72 bg-white/20 rounded-full h-3 mb-4 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full h-3 transition-all duration-300 ease-out shadow-lg"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Progress Text */}
      <p className="text-white/90 text-sm font-medium">{progress}%</p>

      {/* Animated Elements */}
      <div className="flex space-x-2 mt-8">
        <div className="w-3 h-3 bg-emerald-400 rounded-full animate-bounce"></div>
        <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
      </div>
    </div>
  );
};

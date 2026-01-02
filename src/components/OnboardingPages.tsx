
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { KidukaLogo } from '@/components/KidukaLogo';
import { 
  Package, 
  Scan, 
  TrendingUp, 
  Users, 
  BarChart3, 
  ShoppingCart,
  ArrowRight
} from 'lucide-react';

interface OnboardingPagesProps {
  onComplete: () => void;
}

export const OnboardingPages = ({ onComplete }: OnboardingPagesProps) => {
  const [currentPage, setCurrentPage] = useState(0);

  const pages = [
    {
      title: "Karibu Kiduka",
      subtitle: "Mfumo wa Kisasa wa Mauzo",
      description: "Simamia stock yako, mauzo, na biashara yako kwa urahisi. Imeundwa kwa wafanyabiashara wa kisasa wanaotaka kukua.",
      icon: Package,
      color: "from-emerald-500 to-blue-500"
    },
    {
      title: "Scan na Uuze Moja Kwa Moja",
      subtitle: "Scanner ya Barcode Imejengwa Ndani",
      description: "Scan tu barcode za bidhaa kuziongeza kwenye stock au kuchakata mauzo moja kwa moja. Hakuna kuandika kwa mkono tena.",
      icon: Scan,
      color: "from-blue-500 to-purple-500"
    },
    {
      title: "Fuatilia Kila Kitu",
      subtitle: "Ripoti na Takwimu za Wakati Halisi",
      description: "Chunguza mauzo yako, viwango vya stock, na utendaji wa biashara yako kupitia ripoti na maelezo ya kina.",
      icon: TrendingUp,
      color: "from-purple-500 to-emerald-500"
    }
  ];

  const currentPageData = pages[currentPage];

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const featureIcons = [
    { icon: Package, label: 'Stock', color: 'bg-emerald-100 text-emerald-600' },
    { icon: ShoppingCart, label: 'Mauzo', color: 'bg-blue-100 text-blue-600' },
    { icon: Users, label: 'Watumiaji', color: 'bg-purple-100 text-purple-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 flex flex-col items-center justify-center p-4">
      {/* Logo - positioned closer to content */}
      <div className="mb-6">
        <KidukaLogo size="sm" animate />
      </div>

      {/* Main Content - No container/card, free flowing */}
      <div className="max-w-sm w-full text-center space-y-4">
        {/* Icon */}
        <div className={`mx-auto w-16 h-16 bg-gradient-to-br ${currentPageData.color} rounded-full flex items-center justify-center animate-scale-in shadow-lg`}>
          <currentPageData.icon className="h-8 w-8 text-white" />
        </div>

        {/* Text Content - Free, no container */}
        <div className="space-y-3 animate-fade-in">
          <h2 className="text-2xl font-bold text-gray-900">
            {currentPageData.title}
          </h2>
          <h3 className="text-base font-semibold text-emerald-600">
            {currentPageData.subtitle}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed px-2">
            {currentPageData.description}
          </p>
        </div>

        {/* Feature Icons - Only on first page */}
        {currentPage === 0 && (
          <div className="flex justify-center gap-6 py-4">
            {featureIcons.map((feature, index) => (
              <div key={index} className="flex flex-col items-center space-y-2">
                <div className={`w-10 h-10 ${feature.color} rounded-xl flex items-center justify-center`}>
                  <feature.icon className="h-5 w-5" />
                </div>
                <span className="text-xs text-gray-600 font-medium">{feature.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Page Indicators */}
        <div className="flex justify-center space-x-2 py-4">
          {pages.map((_, index) => (
            <div
              key={index}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                index === currentPage 
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500 scale-125' 
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={handleSkip} 
            className="flex-1 text-gray-500 border-gray-300 hover:bg-gray-50"
          >
            Ruka
          </Button>
          <Button 
            onClick={handleNext} 
            className="flex-1 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold"
          >
            {currentPage < pages.length - 1 ? (
              <>
                Endelea
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              'Anza Kutumia'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

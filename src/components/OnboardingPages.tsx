
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { KidukaLogo } from '@/components/KidukaLogo';
import { 
  Package, 
  Scan, 
  TrendingUp, 
  Users, 
  BarChart3, 
  ShoppingCart,
  ArrowRight,
  X
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 flex flex-col">
      {/* Header with Logo */}
      <div className="p-4 flex justify-between items-center">
        <KidukaLogo size="md" animate />
        <Button variant="ghost" onClick={handleSkip} className="text-gray-500 text-sm">
          <X className="h-3 w-3 mr-1" />
          Ruka
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            {/* Icon */}
            <div className={`mx-auto w-16 h-16 bg-gradient-to-br ${currentPageData.color} rounded-full flex items-center justify-center mb-4 animate-scale-in`}>
              <currentPageData.icon className="h-8 w-8 text-white" />
            </div>

            {/* Content */}
            <div className="space-y-3 animate-fade-in">
              <h2 className="text-lg font-bold text-gray-900">
                {currentPageData.title}
              </h2>
              <h3 className="text-sm font-semibold text-emerald-600">
                {currentPageData.subtitle}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {currentPageData.description}
              </p>
            </div>

            {/* Features Preview for current page */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {currentPage === 0 && (
                <>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Package className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-xs text-gray-600">Stock</span>
                  </div>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-600">Mauzo</span>
                  </div>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-xs text-gray-600">Watumiaji</span>
                  </div>
                </>
              )}
              {currentPage === 1 && (
                <>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Scan className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-xs text-gray-600">Scan Haraka</span>
                  </div>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Package className="h-4 w-4 text-orange-600" />
                    </div>
                    <span className="text-xs text-gray-600">Ongeza Bidhaa</span>
                  </div>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-600">Lipia</span>
                  </div>
                </>
              )}
              {currentPage === 2 && (
                <>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-xs text-gray-600">Takwimu</span>
                  </div>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-xs text-gray-600">Ripoti</span>
                  </div>
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-600">Watumiaji Wengi</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Navigation */}
      <div className="p-4">
        {/* Page Indicators */}
        <div className="flex justify-center space-x-2 mb-4">
          {pages.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentPage 
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500 scale-125' 
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Next Button */}
        <Button 
          onClick={handleNext} 
          className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white py-2 text-sm font-semibold"
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
  );
};

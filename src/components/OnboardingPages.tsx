
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
      <div className="p-6 flex justify-between items-center">
        <KidukaLogo size="lg" animate />
        <Button variant="ghost" onClick={handleSkip} className="text-gray-500">
          <X className="h-4 w-4 mr-2" />
          Ruka
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            {/* Icon */}
            <div className={`mx-auto w-20 h-20 bg-gradient-to-br ${currentPageData.color} rounded-full flex items-center justify-center mb-6 animate-scale-in`}>
              <currentPageData.icon className="h-10 w-10 text-white" />
            </div>

            {/* Content */}
            <div className="space-y-4 animate-fade-in">
              <h2 className="text-2xl font-bold text-gray-900">
                {currentPageData.title}
              </h2>
              <h3 className="text-lg font-semibold text-emerald-600">
                {currentPageData.subtitle}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {currentPageData.description}
              </p>
            </div>

            {/* Features Preview for current page */}
            <div className="mt-8 grid grid-cols-3 gap-4">
              {currentPage === 0 && (
                <>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-emerald-600" />
                    </div>
                    <span className="text-xs text-gray-600">Stock</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-600">Mauzo</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="text-xs text-gray-600">Watumiaji</span>
                  </div>
                </>
              )}
              {currentPage === 1 && (
                <>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Scan className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-xs text-gray-600">Scan Haraka</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <span className="text-xs text-gray-600">Ongeza Bidhaa</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-600">Lipia</span>
                  </div>
                </>
              )}
              {currentPage === 2 && (
                <>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="text-xs text-gray-600">Takwimu</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-xs text-gray-600">Ripoti</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
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
      <div className="p-6">
        {/* Page Indicators */}
        <div className="flex justify-center space-x-2 mb-6">
          {pages.map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
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
          className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white py-3 text-lg font-semibold"
        >
          {currentPage < pages.length - 1 ? (
            <>
              Endelea
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          ) : (
            'Anza Kutumia'
          )}
        </Button>
      </div>
    </div>
  );
};

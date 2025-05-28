
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
      title: "Welcome to Kiduka",
      subtitle: "Your Smart Point of Sale Solution",
      description: "Manage your inventory, sales, and business with ease. Built for modern retailers who want to grow.",
      icon: Package,
      color: "from-purple-500 to-blue-500"
    },
    {
      title: "Scan & Sell Instantly",
      subtitle: "Barcode Scanner Built-In",
      description: "Simply scan product barcodes to add them to your inventory or process sales instantly. No more manual entry.",
      icon: Scan,
      color: "from-blue-500 to-indigo-500"
    },
    {
      title: "Track Everything",
      subtitle: "Real-Time Analytics & Reports",
      description: "Monitor your sales, inventory levels, and business performance with detailed reports and insights.",
      icon: TrendingUp,
      color: "from-indigo-500 to-purple-500"
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Header with Logo */}
      <div className="p-6 flex justify-between items-center">
        <KidukaLogo size="lg" animate />
        <Button variant="ghost" onClick={handleSkip} className="text-gray-500">
          <X className="h-4 w-4 mr-2" />
          Skip
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
              <h3 className="text-lg font-semibold text-purple-600">
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
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="text-xs text-gray-600">Inventory</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-600">Sales</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span className="text-xs text-gray-600">Users</span>
                  </div>
                </>
              )}
              {currentPage === 1 && (
                <>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Scan className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-xs text-gray-600">Quick Scan</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-orange-600" />
                    </div>
                    <span className="text-xs text-gray-600">Add Product</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-600">Checkout</span>
                  </div>
                </>
              )}
              {currentPage === 2 && (
                <>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="text-xs text-gray-600">Analytics</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-xs text-gray-600">Reports</span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-600">Multi-User</span>
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
                  ? 'bg-gradient-to-r from-purple-500 to-blue-500 scale-125' 
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Next Button */}
        <Button 
          onClick={handleNext} 
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 text-lg font-semibold"
        >
          {currentPage < pages.length - 1 ? (
            <>
              Next
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          ) : (
            'Get Started'
          )}
        </Button>
      </div>
    </div>
  );
};

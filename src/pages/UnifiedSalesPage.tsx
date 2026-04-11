import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Zap } from 'lucide-react';
import { SalesPage } from '@/pages/SalesPage';
import { QuickSalePage } from '@/pages/QuickSalePage';

export const UnifiedSalesPage = () => {
  const [activeTab, setActiveTab] = useState('history');

  return (
    <div className="pb-24">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history" className="text-xs gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" />
              Historia
            </TabsTrigger>
            <TabsTrigger value="quick" className="text-xs gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              Mauzo Haraka
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="history" className="mt-0">
          <SalesPage />
        </TabsContent>

        <TabsContent value="quick" className="mt-0">
          <QuickSalePage />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UnifiedSalesPage;

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Zap } from 'lucide-react';
import { SalesPage } from '@/pages/SalesPage';
import { QuickSalePage } from '@/pages/QuickSalePage';
import { usePermissions } from '@/hooks/usePermissions';

export const UnifiedSalesPage = () => {
  const [activeTab, setActiveTab] = useState('history');
  const { can } = usePermissions();
  const canCreate = can('can_create_sales');

  return (
    <div className="pb-24">

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-4">
          <TabsList className={`grid w-full ${canCreate ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="history" className="text-xs gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" />
              Historia
            </TabsTrigger>
            {canCreate && (
              <TabsTrigger value="quick" className="text-xs gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Mauzo Haraka
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="history" className="mt-0">
          <SalesPage />
        </TabsContent>

        {canCreate && (
          <TabsContent value="quick" className="mt-0">
            <QuickSalePage />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default UnifiedSalesPage;

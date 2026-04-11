import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tag, RotateCcw, Store } from 'lucide-react';
import { CouponCodeManager } from '@/components/CouponCodeManager';
import { ReturnRequestManager } from '@/components/ReturnRequestManager';
import { StoreSettings } from '@/components/StoreSettings';

export const RewardsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'coupons');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next);
  };

  return (
    <div className="p-4 pb-24 overflow-x-hidden">
      <h1 className="text-lg font-bold text-foreground">Tuzo & Duka</h1>
      <p className="text-xs text-muted-foreground mb-4">Simamia coupons, returns, na duka lako</p>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="w-full grid grid-cols-3 rounded-2xl h-auto p-1">
          <TabsTrigger value="coupons" className="flex items-center gap-1 text-xs rounded-xl py-2">
            <Tag className="h-3.5 w-3.5" />
            Coupons
          </TabsTrigger>
          <TabsTrigger value="returns" className="flex items-center gap-1 text-xs rounded-xl py-2">
            <RotateCcw className="h-3.5 w-3.5" />
            Returns
          </TabsTrigger>
          <TabsTrigger value="duka" className="flex items-center gap-1 text-xs rounded-xl py-2">
            <Store className="h-3.5 w-3.5" />
            Duka Langu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="mt-4">
          <CouponCodeManager />
        </TabsContent>
        <TabsContent value="returns" className="mt-4">
          <ReturnRequestManager />
        </TabsContent>
        <TabsContent value="duka" className="mt-4">
          <StoreSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RewardsPage;

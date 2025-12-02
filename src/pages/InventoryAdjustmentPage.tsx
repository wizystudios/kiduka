import { PageHeader } from '@/components/PageHeader';
import { InventoryAdjustment } from '@/components/InventoryAdjustment';

export const InventoryAdjustmentPage = () => {
  return (
    <div className="page-container">
      <PageHeader 
        title="Marekebisho ya Stock" 
        subtitle="Rekodi mabadiliko ya stock" 
        backTo="/dashboard" 
      />
      
      <InventoryAdjustment />
    </div>
  );
};

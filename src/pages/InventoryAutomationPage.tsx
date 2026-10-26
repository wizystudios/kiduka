
import { InventoryAutomation } from '@/components/InventoryAutomation';

export const InventoryAutomationPage = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Sheria na Mielekeo ya Stock</h1>
      </div>
      <InventoryAutomation />
    </div>
  );
};

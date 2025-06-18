
import { InventoryAutomation } from '@/components/InventoryAutomation';

export const InventoryAutomationPage = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Uongozi Otomatiki wa Stock</h1>
        <p className="text-gray-600 mt-2">
          Tumia akili bandia kusimamia stock na kuagiza otomatiki kulingana na mielekeo
        </p>
      </div>
      <InventoryAutomation />
    </div>
  );
};

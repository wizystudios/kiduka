
import { WarrantyManager } from '@/components/WarrantyManager';

export const WarrantyPage = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Uongozi wa Warranty</h1>
        <p className="text-gray-600 mt-2">
          Fuatilia na simamia madai ya warranty kwa bidhaa zako
        </p>
      </div>
      <WarrantyManager />
    </div>
  );
};

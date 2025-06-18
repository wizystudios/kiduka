
import { MultiStoreManager } from '@/components/MultiStoreManager';

export const MultiStorePage = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Uongozi wa Maduka Mengi</h1>
        <p className="text-gray-600 mt-2">
          Simamia maduka yako yote kutoka mahali pamoja
        </p>
      </div>
      <MultiStoreManager />
    </div>
  );
};

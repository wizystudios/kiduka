
import { WhatsAppManager } from '@/components/WhatsAppManager';

export const WhatsAppPage = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">WhatsApp Business</h1>
        <p className="text-gray-600 mt-2">
          Uongozi wa ujumbe wa WhatsApp, risiti na mauzo
        </p>
      </div>
      <WhatsAppManager />
    </div>
  );
};

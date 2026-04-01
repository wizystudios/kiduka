import { WhatsAppManager } from '@/components/WhatsAppManager';
import { MessageSquare } from 'lucide-react';

export const WhatsAppPage = () => {
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-green-600" />
          WhatsApp Business
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tuma ujumbe, risiti na vikumbusho kupitia WhatsApp
        </p>
      </div>
      <WhatsAppManager />
    </div>
  );
};

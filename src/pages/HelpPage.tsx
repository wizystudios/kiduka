import { useState } from 'react';
import { HelpCenter } from '@/components/HelpCenter';
import { HelpSupportWidget } from '@/components/HelpSupportWidget';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

export const HelpPage = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto mb-4 flex justify-end">
        <Button className="rounded-2xl" onClick={() => setOpen(true)}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Fungua Chat ya Msaada
        </Button>
      </div>
      <HelpCenter />
      <HelpSupportWidget open={open} onClose={() => setOpen(false)} />
    </div>
  );
};

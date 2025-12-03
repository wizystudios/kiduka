import { useState } from 'react';
import { Calculator } from '@/components/Calculator';
import { Button } from '@/components/ui/button';
import { Calculator as CalcIcon } from 'lucide-react';

export default function CalculatorPage() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      {!isOpen && (
        <div className="flex items-center justify-center h-screen">
          <Button onClick={() => setIsOpen(true)} size="lg" className="rounded-full">
            <CalcIcon className="h-5 w-5 mr-2" />
            Fungua Kikokotoo
          </Button>
        </div>
      )}
      <Calculator isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
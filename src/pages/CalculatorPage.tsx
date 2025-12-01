import { PageHeader } from '@/components/PageHeader';
import { Calculator } from '@/components/Calculator';

export default function CalculatorPage() {
  return (
    <div className="page-container p-4 pb-24 md:p-6">
      <PageHeader 
        title="Kikokotoo"
        subtitle="Hesabu haraka"
      />
      <div className="mt-6">
        <Calculator />
      </div>
    </div>
  );
}
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, Package, Truck, XCircle } from 'lucide-react';

interface OrderProgressBarProps {
  status: string;
}

const ORDER_STEPS = [
  { key: 'new', label: 'Imepokelewa', icon: Clock },
  { key: 'confirmed', label: 'Imethibitishwa', icon: CheckCircle },
  { key: 'preparing', label: 'Inaandaliwa', icon: Package },
  { key: 'ready', label: 'Tayari', icon: Package },
  { key: 'shipped', label: 'Inasafirishwa', icon: Truck },
  { key: 'delivered', label: 'Imepelekwa', icon: CheckCircle },
];

export const getOrderProgress = (status: string): number => {
  if (status === 'cancelled') return 0;
  const stepIndex = ORDER_STEPS.findIndex(s => s.key === status);
  if (stepIndex === -1) return 0;
  return Math.round(((stepIndex + 1) / ORDER_STEPS.length) * 100);
};

export const OrderProgressBar = ({ status }: OrderProgressBarProps) => {
  const progress = getOrderProgress(status);
  const isCancelled = status === 'cancelled';

  if (isCancelled) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-destructive font-medium">
            <XCircle className="h-3 w-3" /> Imeghairiwa
          </span>
          <span className="text-destructive">0%</span>
        </div>
        <Progress value={0} className="h-2" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Maendeleo ya Oda</span>
        <span className="font-bold text-primary">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between">
        {ORDER_STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const currentStep = ORDER_STEPS.findIndex(s => s.key === status) + 1;
          const isCompleted = currentStep >= stepNum;
          const StepIcon = step.icon;
          
          return (
            <div key={step.key} className="flex flex-col items-center" style={{ width: `${100 / ORDER_STEPS.length}%` }}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {isCompleted ? <CheckCircle className="h-3 w-3" /> : <span className="text-[8px]">{stepNum}</span>}
              </div>
              <span className={`text-[8px] mt-1 text-center leading-tight ${isCompleted ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

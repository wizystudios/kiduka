import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Scale } from 'lucide-react';

interface WeightSelectorProps {
  product: {
    id: string;
    name: string;
    price: number;
  };
  onAddToCart: (product: any, weightData: { weight: number; unit: string; totalPrice: number }) => void;
  onClose: () => void;
}

const WEIGHT_PRESETS = [
  { label: '1/4 kg', value: 0.25, unit: 'kg' },
  { label: '1/2 kg', value: 0.5, unit: 'kg' },
  { label: '1 kg', value: 1, unit: 'kg' },
  { label: '2 kg', value: 2, unit: 'kg' },
  { label: '5 kg', value: 5, unit: 'kg' },
];

export const WeightSelector = ({ product, onAddToCart, onClose }: WeightSelectorProps) => {
  const [selectedWeight, setSelectedWeight] = useState<number>(0.5);
  const [customWeight, setCustomWeight] = useState<string>('');
  const [useCustom, setUseCustom] = useState(false);

  const getCurrentWeight = () => {
    return useCustom ? parseFloat(customWeight) || 0 : selectedWeight;
  };

  const getTotalPrice = () => {
    return getCurrentWeight() * product.price;
  };

  const handleAddToCart = () => {
    const weight = getCurrentWeight();
    if (weight > 0) {
      onAddToCart(product, {
        weight,
        unit: 'kg',
        totalPrice: getTotalPrice()
      });
      onClose();
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto border shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Chagua Uzito</h3>
      </div>

      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">{product.name}</p>
        <p className="text-sm">Bei kwa kg: TZS {product.price.toLocaleString()}</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">Chagua Uzito wa Kawaida</Label>
          <div className="grid grid-cols-3 gap-2">
            {WEIGHT_PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant={!useCustom && selectedWeight === preset.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedWeight(preset.value);
                  setUseCustom(false);
                }}
                className="h-12"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium mb-2 block">Au Ingiza Uzito Mwenyewe</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.1"
              min="0.1"
              placeholder="Mfano: 1.5"
              value={customWeight}
              onChange={(e) => {
                setCustomWeight(e.target.value);
                setUseCustom(true);
              }}
              className="flex-1"
            />
            <Badge variant="outline" className="px-3 py-2">kg</Badge>
          </div>
        </div>

        <div className="bg-accent/30 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm">Uzito:</span>
            <span className="font-semibold">{getCurrentWeight()} kg</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Jumla:</span>
            <span className="font-semibold text-lg text-primary">
              TZS {getTotalPrice().toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Funga
          </Button>
          <Button 
            onClick={handleAddToCart} 
            disabled={getCurrentWeight() <= 0}
            className="flex-1"
          >
            Ongeza Kwenye Cart
          </Button>
        </div>
      </div>
    </div>
  );
};
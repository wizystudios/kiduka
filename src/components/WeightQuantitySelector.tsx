import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Product {
  id: string;
  name: string;
  price: number;
  unit_type?: string;
  min_quantity?: number;
}

interface WeightQuantitySelectorProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
}

const WEIGHT_PRESETS = [
  { value: 0.25, label: '0.25' },
  { value: 0.5, label: '0.5' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 5, label: '5' },
];

export const WeightQuantitySelector = ({ product, onClose, onAddToCart }: WeightQuantitySelectorProps) => {
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  const [customQuantity, setCustomQuantity] = useState<string>('');
  const [useCustom, setUseCustom] = useState(false);

  const getCurrentQuantity = () => {
    return useCustom ? parseFloat(customQuantity) || 0 : selectedQuantity;
  };

  const getTotalPrice = () => {
    return product.price * getCurrentQuantity();
  };

  const getUnitDisplay = () => {
    switch (product.unit_type) {
      case 'kg': return 'Kilogramu (kg)';
      case 'g': return 'Gramu (g)';
      case 'ltr': return 'Lita (ltr)';
      case 'ml': return 'Millilita (ml)';
      default: return 'Kipande';
    }
  };

  const handleAddToCart = () => {
    const quantity = getCurrentQuantity();
    const minQuantity = product.min_quantity || 0.1;
    
    if (quantity < minQuantity) {
      alert(`Kiwango cha chini ni ${minQuantity} ${product.unit_type || 'kipande'}`);
      return;
    }
    
    onAddToCart(product, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">{product.name}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-sm text-gray-600">
            Bei: TZS {product.price.toLocaleString()} kwa {product.unit_type || 'kipande'}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Unit Type Display */}
          <div>
            <Label className="text-sm font-medium">Aina ya Kipimo</Label>
            <div className="mt-1">
              <Badge variant="secondary" className="text-xs">
                {getUnitDisplay()}
              </Badge>
            </div>
          </div>

          {/* Preset Quantities */}
          <div>
            <Label className="text-sm font-medium mb-2">Chagua Kiasi</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {WEIGHT_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={!useCustom && selectedQuantity === preset.value ? "default" : "outline"}
                  onClick={() => {
                    setSelectedQuantity(preset.value);
                    setUseCustom(false);
                  }}
                  className="text-sm h-8"
                >
                  {preset.label} {product.unit_type}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Quantity */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="useCustom"
                checked={useCustom}
                onChange={(e) => setUseCustom(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="useCustom" className="text-sm">Ingiza kiasi maalumu</Label>
            </div>
            
            {useCustom && (
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.1"
                  value={customQuantity}
                  onChange={(e) => setCustomQuantity(e.target.value)}
                  placeholder={`Ingiza kiasi (kwa ${product.unit_type})`}
                  className="flex-1"
                />
                <span className="flex items-center text-sm text-gray-500 px-2">
                  {product.unit_type}
                </span>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Kiasi:</span>
              <span className="text-sm">
                {getCurrentQuantity()} {product.unit_type}
              </span>
            </div>
            <div className="flex justify-between items-center mb-4">
              <span className="text-lg font-bold">Jumla:</span>
              <span className="text-lg font-bold text-green-600">
                TZS {getTotalPrice().toLocaleString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Ghairi
            </Button>
            <Button 
              onClick={handleAddToCart}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={getCurrentQuantity() <= 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ongeza Kwenye Mauzo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
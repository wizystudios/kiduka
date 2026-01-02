import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Store, MapPin, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PublishToSokoniProps {
  product: {
    id: string;
    name: string;
    price: number;
    stock_quantity: number;
    description?: string | null;
  };
  onPublished?: () => void;
}

export const PublishToSokoni = ({ product, onPublished }: PublishToSokoniProps) => {
  const { user, userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    quantity: product.stock_quantity.toString(),
    price: product.price.toString(),
    description: product.description || '',
    location: '',
    phone: ''
  });

  const handlePublish = async () => {
    if (!user || !formData.quantity || !formData.price) {
      toast.error('Tafadhali jaza sehemu zote zinazohitajika');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('marketplace_listings')
        .insert({
          seller_id: user.id,
          product_name: product.name,
          description: formData.description || product.description,
          price: parseFloat(formData.price),
          quantity: parseInt(formData.quantity),
          unit: 'pcs',
          location: formData.location || null,
          listing_type: 'sale',
          status: 'active',
          contact_info: {
            business_name: userProfile?.business_name || '',
            phone: formData.phone || ''
          }
        });

      if (error) throw error;

      toast.success(`"${product.name}" imeongezwa Sokoni!`);
      setOpen(false);
      onPublished?.();
    } catch (error: any) {
      console.error('Error publishing to Sokoni:', error);
      toast.error('Imeshindwa kutuma Sokoni: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-primary">
          <Store className="h-3 w-3 mr-1" />
          Sokoni
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Tuma Sokoni
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <p className="font-medium text-sm">{product.name}</p>
            <p className="text-xs text-muted-foreground">
              Bei: TSh {product.price.toLocaleString()} | Stock: {product.stock_quantity}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Idadi ya Kuuza *</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="10"
              />
            </div>
            <div>
              <Label>Bei (TSh) *</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="5000"
              />
            </div>
          </div>

          <div>
            <Label>Maelezo</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Maelezo zaidi ya bidhaa..."
              rows={2}
            />
          </div>

          <div>
            <Label className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Eneo (Mahali ulipo)
            </Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Mwananyamala, Dar es Salaam"
            />
          </div>

          <div>
            <Label className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              Namba ya Simu
            </Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="0712 345 678"
            />
          </div>

          <Button 
            className="w-full" 
            onClick={handlePublish}
            disabled={loading}
          >
            {loading ? 'Inatuma...' : 'Tuma Sokoni'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Phone, User, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { useSokoniCustomer } from '@/hooks/useSokoniCustomer';

interface SokoniCustomerAuthProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const SokoniCustomerAuth = ({ open, onOpenChange, onSuccess }: SokoniCustomerAuthProps) => {
  const { register, login } = useSokoniCustomer();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const formatPhone = (value: string) => {
    // Remove non-numeric characters
    let cleaned = value.replace(/\D/g, '');
    
    // Handle Tanzania phone format
    if (cleaned.startsWith('0')) {
      cleaned = '255' + cleaned.slice(1);
    } else if (!cleaned.startsWith('255') && cleaned.length > 0) {
      if (cleaned.length >= 9) {
        cleaned = '255' + cleaned;
      }
    }
    
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formattedPhone = formatPhone(phone);
    
    if (formattedPhone.length < 12) {
      toast.error('Tafadhali ingiza nambari sahihi ya simu');
      return;
    }

    setLoading(true);
    
    try {
      let customer;
      
      if (mode === 'register') {
        customer = await register(formattedPhone, name || undefined);
        if (customer) {
          toast.success('Akaunti imeundwa! Karibu Sokoni');
        }
      } else {
        customer = await login(formattedPhone);
        if (customer) {
          toast.success(`Karibu tena${customer.name ? ', ' + customer.name : ''}!`);
        } else {
          // If login fails, suggest registration
          toast.error('Nambari hii haijaandikishwa. Jisajili kwanza.');
          setMode('register');
          setLoading(false);
          return;
        }
      }

      if (customer) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error('Imeshindwa. Tafadhali jaribu tena.');
      }
    } catch (error) {
      toast.error('Kuna tatizo. Jaribu tena.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            {mode === 'login' ? 'Ingia Sokoni' : 'Jisajili Sokoni'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              Nambari ya Simu
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Tutahifadhi oda na vipendwa vyako
            </p>
          </div>

          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1">
                <User className="h-4 w-4" />
                Jina Lako (si lazima)
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Jina lako"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Subiri...' : (mode === 'login' ? 'Ingia' : 'Jisajili')}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm"
            >
              {mode === 'login' ? 'Hauna akaunti? Jisajili' : 'Una akaunti? Ingia'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

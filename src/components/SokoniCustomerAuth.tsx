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
import { Phone, User, LogIn, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SokoniCustomerAuthProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STORAGE_KEY = 'sokoni_customer_phone';

export const SokoniCustomerAuth = ({ open, onOpenChange, onSuccess }: SokoniCustomerAuthProps) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);

  const formatPhone = (value: string) => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '255' + cleaned.slice(1);
    } else if (!cleaned.startsWith('255') && cleaned.length >= 9) {
      cleaned = '255' + cleaned;
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

    if (!pin || pin.length < 4) {
      toast.error('PIN lazima iwe angalau tarakimu 4');
      return;
    }

    if (mode === 'register' && pin !== confirmPin) {
      toast.error('PIN hazifanani. Tafadhali jaribu tena.');
      return;
    }

    setLoading(true);
    
    try {
      if (mode === 'register') {
        // Check if phone already exists
        const { data: existing } = await supabase
          .from('sokoni_customers' as any)
          .select('id')
          .eq('phone', formattedPhone)
          .single();

        if (existing) {
          toast.error('Nambari hii tayari imeandikishwa. Ingia badala yake.');
          setMode('login');
          setLoading(false);
          return;
        }

        // Register with PIN
        const { data, error } = await supabase
          .from('sokoni_customers' as any)
          .insert([{ phone: formattedPhone, name: name || null, pin }])
          .select()
          .single();

        if (error) throw error;
        
        localStorage.setItem(STORAGE_KEY, formattedPhone);
        toast.success('Akaunti imeundwa! Karibu Sokoni');
        onOpenChange(false);
        onSuccess?.();
      } else {
        // Login - verify PIN
        const { data, error } = await supabase
          .from('sokoni_customers' as any)
          .select('*')
          .eq('phone', formattedPhone)
          .single();

        if (error || !data) {
          toast.error('Nambari hii haijaandikishwa. Jisajili kwanza.');
          setMode('register');
          setLoading(false);
          return;
        }

        const customer = data as any;
        
        // If customer has no PIN yet (legacy), set it
        if (!customer.pin) {
          await supabase
            .from('sokoni_customers' as any)
            .update({ pin })
            .eq('id', customer.id);
          
          localStorage.setItem(STORAGE_KEY, formattedPhone);
          toast.success(`Karibu tena${customer.name ? ', ' + customer.name : ''}! PIN yako imewekwa.`);
          onOpenChange(false);
          onSuccess?.();
          return;
        }

        // Verify PIN
        if (customer.pin !== pin) {
          toast.error('PIN si sahihi. Tafadhali jaribu tena.');
          setLoading(false);
          return;
        }

        localStorage.setItem(STORAGE_KEY, formattedPhone);
        toast.success(`Karibu tena${customer.name ? ', ' + customer.name : ''}!`);
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      toast.error('Kuna tatizo. Jaribu tena.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {mode === 'login' ? 'Ingia Sokoni' : 'Jisajili Sokoni'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground text-center">
            {mode === 'login' ? 'Ingiza nambari yako na PIN kuingia' : 'Unda akaunti yako salama'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-1 text-xs">
              <Phone className="h-3 w-3" />
              Nambari ya Simu
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-2xl h-11"
              required
            />
          </div>

          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1 text-xs">
                <User className="h-3 w-3" />
                Jina Lako
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Jina lako kamili"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-2xl h-11"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="pin" className="flex items-center gap-1 text-xs">
              <Lock className="h-3 w-3" />
              PIN (Nambari ya Siri)
            </Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="rounded-2xl h-11 text-center tracking-[0.5em] text-lg"
              required
            />
            <p className="text-[10px] text-muted-foreground">Angalau tarakimu 4</p>
          </div>

          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPin" className="flex items-center gap-1 text-xs">
                <Lock className="h-3 w-3" />
                Thibitisha PIN
              </Label>
              <Input
                id="confirmPin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className="rounded-2xl h-11 text-center tracking-[0.5em] text-lg"
                required
              />
            </div>
          )}

          <Button type="submit" className="w-full rounded-full h-11" disabled={loading}>
            {loading ? 'Subiri...' : (mode === 'login' ? 'Ingia' : 'Jisajili')}
          </Button>

          <div className="text-center">
            <Button
              type="button"
              variant="link"
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setPin(''); setConfirmPin(''); }}
              className="text-xs"
            >
              {mode === 'login' ? 'Hauna akaunti? Jisajili' : 'Una akaunti? Ingia'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

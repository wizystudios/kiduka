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
import { Phone, User, Lock, ShieldCheck, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SokoniCustomerAuthProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STORAGE_KEY = 'sokoni_customer_phone';

const checkPasswordPolicy = (pw: string) => ({
  minLength: pw.length >= 8,
  hasNumbers: (pw.match(/\d/g) || []).length >= 3,
  hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw),
  hasUppercase: /[A-Z]/.test(pw),
});

export const SokoniCustomerAuth = ({ open, onOpenChange, onSuccess }: SokoniCustomerAuthProps) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const policy = checkPasswordPolicy(pin);
  const allPassed = Object.values(policy).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formattedPhone = formatPhone(phone);
    
    if (formattedPhone.length < 12) {
      toast.error('Tafadhali ingiza nambari sahihi ya simu');
      return;
    }

    if (mode === 'register') {
      if (!allPassed) {
        toast.error('Nywila haikidhi masharti yote ya usalama');
        return;
      }
      if (pin !== confirmPin) {
        toast.error('Nywila hazifanani. Tafadhali jaribu tena.');
        return;
      }
    } else {
      if (!pin || pin.length < 4) {
        toast.error('Tafadhali ingiza nywila yako');
        return;
      }
    }

    setLoading(true);
    
    try {
      if (mode === 'register') {
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
        
        if (!customer.pin) {
          await supabase
            .from('sokoni_customers' as any)
            .update({ pin })
            .eq('id', customer.id);
          
          localStorage.setItem(STORAGE_KEY, formattedPhone);
          toast.success(`Karibu tena${customer.name ? ', ' + customer.name : ''}! Nywila yako imewekwa.`);
          onOpenChange(false);
          onSuccess?.();
          return;
        }

        if (customer.pin !== pin) {
          toast.error('Nywila si sahihi. Tafadhali jaribu tena.');
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

  const PolicyItem = ({ passed, label }: { passed: boolean; label: string }) => (
    <div className="flex items-center gap-1.5 text-[11px]">
      {passed ? <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" /> : <XCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
      <span className={passed ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}>{label}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-center">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {mode === 'login' ? 'Ingia Sokoni' : 'Jisajili Sokoni'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground text-center">
            {mode === 'login' ? 'Ingiza nambari yako na nywila kuingia' : 'Unda akaunti yako salama'}
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
              Nywila
            </Label>
            <div className="relative">
              <Input
                id="pin"
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Angalau herufi 8' : 'Nywila yako'}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="rounded-2xl h-11 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && pin.length > 0 && (
            <div className="p-2.5 bg-muted/50 rounded-2xl space-y-1">
              <PolicyItem passed={policy.minLength} label="Angalau herufi 8" />
              <PolicyItem passed={policy.hasNumbers} label="Angalau nambari 3" />
              <PolicyItem passed={policy.hasSpecial} label="Herufi maalum (!@#$...)" />
              <PolicyItem passed={policy.hasUppercase} label="Herufi kubwa (A-Z)" />
            </div>
          )}

          {mode === 'register' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPin" className="flex items-center gap-1 text-xs">
                <Lock className="h-3 w-3" />
                Thibitisha Nywila
              </Label>
              <Input
                id="confirmPin"
                type="password"
                placeholder="Rudia nywila"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="rounded-2xl h-11"
                required
              />
              {confirmPin && pin !== confirmPin && (
                <p className="text-xs text-destructive">Nywila hazifanani</p>
              )}
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

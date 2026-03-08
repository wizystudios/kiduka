import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, CheckCircle, KeyRound } from 'lucide-react';
import { toast } from 'sonner';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ForgotPasswordDialog = ({ open, onOpenChange }: ForgotPasswordDialogProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Ingiza barua pepe sahihi');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) throw error;
      setSent(true);
      toast.success('Kiungo cha kubadilisha nywila kimetumwa!');
    } catch (error: any) {
      toast.error(error.message || 'Imeshindwa kutuma');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setEmail('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
        <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-5 text-center border-b border-border">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold">Sahau Nywila?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {sent ? 'Angalia barua pepe yako' : 'Tutakutumia kiungo cha kubadilisha nywila'}
          </p>
        </div>

        <div className="p-5 space-y-4">
          {sent ? (
            <div className="text-center space-y-3">
              <CheckCircle className="h-12 w-12 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                Kiungo cha kubadilisha nywila kimetumwa kwenye <strong>{email}</strong>. 
                Angalia inbox yako na ubonyeze kiungo.
              </p>
              <Button onClick={handleClose} className="w-full">Sawa</Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Barua pepe yako"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">Ghairi</Button>
                <Button onClick={handleSend} disabled={loading || !email} className="flex-1">
                  {loading ? 'Inatuma...' : 'Tuma Kiungo'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AdminPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: string;
  description?: string;
}

const ADMIN_PASSWORD = 'NURATHZUBERI';

export const AdminPasswordDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  action,
  description 
}: AdminPasswordDialogProps) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = () => {
    if (password === ADMIN_PASSWORD) {
      setPassword('');
      setError(false);
      setAttempts(0);
      onConfirm();
      onClose();
    } else {
      setError(true);
      setAttempts(prev => prev + 1);
      toast.error('Nenosiri si sahihi');
      
      if (attempts >= 2) {
        toast.error('Umejaribu mara nyingi. Tafadhali wasiliana na msimamizi.');
      }
    }
  };

  const handleClose = () => {
    setPassword('');
    setError(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-destructive" />
            Uthibitisho wa Admin
          </DialogTitle>
          <DialogDescription>
            Toa nenosiri la admin ili kuendelea na: <strong>{action}</strong>
          </DialogDescription>
        </DialogHeader>

        {description && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">{description}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-password">Nenosiri la Admin</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Ingiza nenosiri..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                className={`pl-10 pr-10 ${error ? 'border-destructive' : ''}`}
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {error && (
              <p className="text-xs text-destructive">Nenosiri si sahihi. Jaribu tena.</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Ghairi
          </Button>
          <Button onClick={handleSubmit} disabled={!password}>
            <Shield className="h-4 w-4 mr-2" />
            Thibitisha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

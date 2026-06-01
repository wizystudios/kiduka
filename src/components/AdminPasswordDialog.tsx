import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Lock, Eye, EyeOff, AlertTriangle, KeyRound, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AdminPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: string;
  description?: string;
}

type Mode = 'verify' | 'setup' | 'change';

export const AdminPasswordDialog = ({ open, onClose, onConfirm, action, description }: AdminPasswordDialogProps) => {
  const [mode, setMode] = useState<Mode>('verify');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Determine if password is set
  useEffect(() => {
    if (!open) return;
    setPassword(''); setNewPassword(''); setConfirmPw('');
    setError(null); setLockUntil(null);
    (async () => {
      const { data, error: e } = await supabase.rpc('has_admin_password_set');
      if (e) { setError('Imeshindikana kuwasiliana na seva'); return; }
      setMode(data ? 'verify' : 'setup');
    })();
  }, [open]);

  useEffect(() => {
    if (!lockUntil) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [lockUntil]);

  const lockSecondsLeft = lockUntil ? Math.max(0, Math.ceil((lockUntil - now) / 1000)) : 0;
  const isLocked = lockSecondsLeft > 0;

  const handleVerify = async () => {
    if (!password || isLocked) return;
    setSubmitting(true); setError(null);
    try {
      const { data, error: e } = await supabase.rpc('verify_admin_password', { p_password: password });
      if (e) throw e;
      const res = data as any;
      if (res?.success) {
        toast.success('Nenosiri limethibitishwa');
        onConfirm();
        onClose();
      } else if (res?.error === 'locked') {
        const secs = Number(res?.retry_after_seconds || 0);
        setLockUntil(Date.now() + secs * 1000);
        setError(`Akaunti imefungwa kwa muda. Subiri ${secs}s.`);
      } else if (res?.error === 'not_set') {
        setMode('setup');
      } else if (res?.error === 'forbidden') {
        setError('Huna ruhusa ya admin');
      } else {
        setError('Nenosiri si sahihi');
      }
    } catch (err: any) {
      setError(err.message || 'Imeshindikana');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetOrChange = async () => {
    setError(null);
    if (newPassword.length < 6) { setError('Nenosiri jipya lazima liwe na herufi 6 au zaidi'); return; }
    if (newPassword !== confirmPw) { setError('Nywila mbili hazifanani'); return; }
    setSubmitting(true);
    try {
      const { data, error: e } = await supabase.rpc('set_admin_password', {
        p_new_password: newPassword,
        p_current_password: mode === 'change' ? password : null,
      });
      if (e) throw e;
      const res = data as any;
      if (res?.success) {
        toast.success(mode === 'setup' ? 'Nenosiri jipya limewekwa' : 'Nenosiri limebadilishwa');
        onConfirm();
        onClose();
      } else if (res?.error === 'current_password_invalid') {
        setError('Nenosiri la sasa si sahihi');
      } else if (res?.error === 'weak_password') {
        setError('Nenosiri ni dhaifu mno');
      } else if (res?.error === 'forbidden') {
        setError('Huna ruhusa');
      } else {
        setError('Imeshindikana kuhifadhi');
      }
    } catch (err: any) {
      setError(err.message || 'Imeshindikana');
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === 'setup' ? 'Weka Nenosiri la Admin'
    : mode === 'change' ? 'Badilisha Nenosiri'
    : 'Uthibitisho wa Admin';

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
        <div className="flex min-h-full flex-col">
          <SheetHeader className="border-b border-border bg-destructive/5 p-5 text-left">
            <SheetTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" /> {title}
            </SheetTitle>
            <SheetDescription>{action}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 p-5">
            {description && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">{description}</AlertDescription>
              </Alert>
            )}

            {mode === 'setup' && (
              <Alert>
                <KeyRound className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Bado hujaweka nenosiri la admin. Weka nenosiri jipya hapa chini.
                </AlertDescription>
              </Alert>
            )}

            {mode === 'verify' && (
              <div className="space-y-2">
                <Label className="text-xs">Nenosiri la Admin</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    placeholder="Ingiza nenosiri..."
                    className="pl-10 pr-10"
                    autoFocus
                    disabled={isLocked || submitting}
                  />
                  <Button type="button" variant="ghost" size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShow(s => !s)}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <button type="button" className="text-xs text-primary hover:underline"
                  onClick={() => setMode('change')}>
                  Badilisha nenosiri
                </button>
              </div>
            )}

            {(mode === 'setup' || mode === 'change') && (
              <div className="space-y-3">
                {mode === 'change' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nenosiri la sasa</Label>
                    <Input type="password" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nenosiri la sasa" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Nenosiri jipya</Label>
                  <Input type="password" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Angalau herufi 6" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Thibitisha nenosiri jipya</Label>
                  <Input type="password" value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Andika tena" />
                </div>
                {mode === 'change' && (
                  <button type="button" className="text-xs text-muted-foreground hover:underline"
                    onClick={() => { setMode('verify'); setError(null); }}>
                    ← Rudi kwenye uthibitisho
                  </button>
                )}
              </div>
            )}

            {isLocked && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Imefungwa. Jaribu tena baada ya {lockSecondsLeft}s
                </AlertDescription>
              </Alert>
            )}

            {error && !isLocked && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          <SheetFooter className="border-t border-border p-5 sm:flex-row gap-2">
            <Button variant="outline" className="rounded-full flex-1"
              onClick={onClose} disabled={submitting}>Ghairi</Button>
            {mode === 'verify' ? (
              <Button className="rounded-full flex-1" disabled={!password || submitting || isLocked}
                onClick={handleVerify}>
                {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <Shield className="h-4 w-4 mr-1" /> Thibitisha
              </Button>
            ) : (
              <Button className="rounded-full flex-1"
                disabled={submitting || !newPassword || !confirmPw}
                onClick={handleSetOrChange}>
                {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                <KeyRound className="h-4 w-4 mr-1" />
                {mode === 'setup' ? 'Weka' : 'Badilisha'}
              </Button>
            )}
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
};

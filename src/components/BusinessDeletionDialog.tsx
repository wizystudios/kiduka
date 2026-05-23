import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  expectedName: string; // business_name OR full_name OR email
  onDeleted?: () => void;
}

const SCOPE_OPTIONS = [
  { key: 'products', label: 'Bidhaa + Inventory' },
  { key: 'sales', label: 'Mauzo + Risiti' },
  { key: 'customers', label: 'Wateja + Madeni ya kitabu' },
  { key: 'loans', label: 'Mikopo midogo' },
  { key: 'orders', label: 'Oda za Sokoni + Returns' },
  { key: 'staff', label: 'Wafanyakazi/Wasaidizi' },
  { key: 'branches', label: 'Matawi' },
  { key: 'finance', label: 'Mapato/Matumizi/Bookkeeping' },
] as const;

export const BusinessDeletionDialog = ({ open, onOpenChange, ownerId, expectedName, onDeleted }: Props) => {
  const [mode, setMode] = useState<'selective' | 'full'>('selective');
  const [confirmation, setConfirmation] = useState('');
  const [scope, setScope] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode('selective');
      setConfirmation('');
      setScope({});
    }
  }, [open]);

  const selectedCount = Object.values(scope).filter(Boolean).length;
  const nameMatches = confirmation.trim().toLowerCase() === expectedName.trim().toLowerCase();
  const canSubmit = nameMatches && (mode === 'full' || selectedCount > 0) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload = mode === 'full' ? { all: true } : scope;
      const { data, error } = await supabase.rpc('admin_delete_business', {
        p_owner_id: ownerId,
        p_confirmation_name: confirmation,
        p_scope: payload as any,
      });
      if (error) throw error;
      const res = data as any;
      if (!res?.success) {
        toast.error(res?.error === 'name_mismatch' ? 'Jina halilingani' : `Hitilafu: ${res?.error || 'unknown'}`);
        return;
      }
      const counts = res?.deleted || {};
      const total = Object.values(counts).reduce((s: number, n: any) => s + (Number(n) || 0), 0);
      toast.success(`Imefutwa: rekodi ${total} kutoka kwa jedwali ${Object.keys(counts).length}`);
      onDeleted?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Imeshindikana kufuta');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Futa Data ya Biashara
          </DialogTitle>
          <DialogDescription>
            Biashara: <span className="font-semibold text-foreground">{expectedName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'selective' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 rounded-full"
              onClick={() => setMode('selective')}
            >
              Chagua kipande
            </Button>
            <Button
              type="button"
              variant={mode === 'full' ? 'destructive' : 'outline'}
              size="sm"
              className="flex-1 rounded-full"
              onClick={() => setMode('full')}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Futa nzima
            </Button>
          </div>

          {mode === 'selective' ? (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {SCOPE_OPTIONS.map(opt => (
                <label key={opt.key} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted cursor-pointer">
                  <Checkbox
                    checked={!!scope[opt.key]}
                    onCheckedChange={(v) => setScope(s => ({ ...s, [opt.key]: !!v }))}
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
              {selectedCount === 0 && (
                <p className="text-xs text-muted-foreground text-center">Chagua angalau sehemu moja</p>
              )}
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Hii itafuta <strong>kila kitu</strong>: bidhaa, mauzo, wateja, oda, madeni, wafanyakazi, matawi,
                mapato/matumizi, ads, coupons, na biashara yenyewe. Haiwezi kurudishwa.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          <div className="space-y-1.5">
            <Label className="text-xs">
              Andika jina sahihi kuthibitisha (jina lenyewe ndio "nywila"):
            </Label>
            <div className="p-2 rounded-xl bg-muted text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Andika hii hasa:</p>
              <p className="font-mono text-sm font-bold select-all break-all">{expectedName}</p>
            </div>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={expectedName}
              className="rounded-2xl"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {confirmation && !nameMatches && (
              <p className="text-xs text-destructive">Jina halilingani bado — nakili hasa kutoka juu</p>
            )}
            {confirmation && nameMatches && (
              <p className="text-xs text-green-600">✓ Jina linalingana</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)} disabled={submitting}>
            Ghairi
          </Button>
          <Button
            variant="destructive"
            className="rounded-full"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {mode === 'full' ? 'Futa Biashara Nzima' : `Futa Vilivyochaguliwa (${selectedCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

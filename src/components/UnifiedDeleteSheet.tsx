import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface UnifiedDeleteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  itemName: string;
  description?: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
}

export const UnifiedDeleteSheet = ({
  open,
  onOpenChange,
  title,
  itemName,
  description,
  confirmLabel = 'Futa',
  onConfirm,
}: UnifiedDeleteSheetProps) => {
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setConfirmation('');
  }, [open]);

  const nameMatches = confirmation.trim().toLowerCase() === itemName.trim().toLowerCase();

  const handleConfirm = async () => {
    if (!nameMatches || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        <div className="flex min-h-full flex-col">
          <SheetHeader className="border-b border-border bg-destructive/5 p-5 text-left">
            <SheetTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> {title}
            </SheetTitle>
            <SheetDescription className="break-words">{itemName}</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 items-center justify-center p-5">
            <div className="w-full max-w-sm space-y-4 rounded-3xl border border-destructive/20 bg-destructive/5 p-5 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
              <div>
                <p className="text-sm font-semibold">Thibitisha ufutaji</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {description || 'Hatua hii haiwezi kurejeshwa. Andika jina hili hasa ili kuendelea.'}
                </p>
              </div>
              <div className="rounded-2xl bg-background p-3">
                <p className="text-[10px] text-muted-foreground">Andika hii:</p>
                <p className="break-all font-mono text-sm font-bold select-all">{itemName}</p>
              </div>
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={itemName}
                className="rounded-2xl text-center"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              {confirmation && !nameMatches && (
                <p className="text-xs text-destructive">Jina halilingani bado</p>
              )}
            </div>
          </div>

          <SheetFooter className="border-t border-border p-5 sm:flex-row gap-2">
            <Button variant="outline" className="rounded-full flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>
              Ghairi
            </Button>
            <Button variant="destructive" className="rounded-full flex-1" onClick={handleConfirm} disabled={!nameMatches || submitting}>
              {submitting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1 h-4 w-4" />}
              {confirmLabel}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
};
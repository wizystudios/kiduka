import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useLanguage } from '@/contexts/LanguageContext';

interface InstallAppButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  fullWidth?: boolean;
}

export const InstallAppButton = ({
  className = '',
  variant = 'default',
  size = 'lg',
  fullWidth = true,
}: InstallAppButtonProps) => {
  const { isInstalled, canInstall, install, instructions } = useInstallPrompt();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);

  if (isInstalled) {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-3 text-primary ${
          fullWidth ? 'w-full' : ''
        } ${className}`}
      >
        <span className="relative flex h-6 w-6 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
          <span className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary">
            <Check className="h-4 w-4 text-primary-foreground animate-in zoom-in duration-500" />
          </span>
        </span>
        <span className="text-sm font-semibold">{t('app_installed')}</span>
      </div>
    );
  }

  const handleClick = async () => {
    setBusy(true);
    const outcome = await install();
    setBusy(false);
    if (outcome === 'unavailable') {
      toast.info(t('install_manual_hint'), { description: instructions });
    } else if (outcome === 'accepted') {
      toast.success(t('app_installed'));
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      disabled={busy}
      className={`${fullWidth ? 'w-full' : ''} h-12 rounded-full text-base font-semibold ${className}`}
    >
      {busy ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <Download className="mr-2 h-5 w-5" />
      )}
      {busy ? t('installing') : t('install_app')}
      {!canInstall && !busy && <span className="sr-only"> ({instructions})</span>}
    </Button>
  );
};

export default InstallAppButton;

import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface LanguageSwitcherProps {
  variant?: 'compact' | 'full' | 'grid';
  className?: string;
}

export const LanguageSwitcher = ({ variant = 'compact', className = '' }: LanguageSwitcherProps) => {
  const { language, setLanguage, languages, current, t } = useLanguage();

  const change = (code: typeof language) => {
    setLanguage(code);
    const next = languages.find((l) => l.code === code);
    toast.success(`${next?.flag} ${t('language_changed')}: ${next?.label}`);
  };

  if (variant === 'grid') {
    return (
      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 ${className}`}>
        {languages.map((lang) => {
          const active = lang.code === language;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => change(lang.code)}
              className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted/50'
              }`}
            >
              <span className="text-xl leading-none">{lang.flag}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{lang.label}</span>
                <span className="block truncate text-[10px] text-muted-foreground">{lang.english}</span>
              </span>
              {active && <Check className="h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-9 gap-2 rounded-full ${className}`}
          aria-label={t('choose_language')}
        >
          <span className="text-base leading-none">{current.flag}</span>
          {variant === 'full' ? (
            <span className="text-sm">{current.label}</span>
          ) : (
            <Globe className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[60] w-52 bg-popover">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => change(lang.code)}
            className="flex items-center gap-2"
          >
            <span className="text-lg leading-none">{lang.flag}</span>
            <span className="flex-1">{lang.label}</span>
            {lang.code === language && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;

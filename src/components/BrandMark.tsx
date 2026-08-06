import { ShoppingBag } from 'lucide-react';

interface BrandMarkProps {
  /** Business name shown as the main title */
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Print / html2canvas safe brand mark.
 * Avoids rotated transforms and gradient text (both render broken in canvas exports).
 */
export const BrandMark = ({ title = 'Kiduka', subtitle, size = 'md' }: BrandMarkProps) => {
  const box = size === 'sm' ? 'w-9 h-9' : size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';
  const icon = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';
  const titleSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className="flex items-center gap-3">
      <div className={`${box} rounded-2xl flex items-center justify-center bg-primary`}>
        <ShoppingBag className={`${icon} text-primary-foreground`} />
      </div>
      <div className="leading-tight">
        <p className={`${titleSize} font-bold text-foreground`}>{title}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
};

export default BrandMark;

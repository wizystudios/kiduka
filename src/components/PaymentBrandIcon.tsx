interface BrandSpec {
  label: string;
  short: string;
  bg: string;
  fg: string;
}

const BRANDS: Record<string, BrandSpec> = {
  mpesa: { label: 'M-Pesa', short: 'M', bg: 'bg-[#E60000]', fg: 'text-white' },
  vodacom: { label: 'M-Pesa', short: 'M', bg: 'bg-[#E60000]', fg: 'text-white' },
  airtel: { label: 'Airtel Money', short: 'A', bg: 'bg-[#ED1C24]', fg: 'text-white' },
  airtelmoney: { label: 'Airtel Money', short: 'A', bg: 'bg-[#ED1C24]', fg: 'text-white' },
  tigopesa: { label: 'Mixx by Yas', short: 'Y', bg: 'bg-[#00A9E0]', fg: 'text-white' },
  mixx: { label: 'Mixx by Yas', short: 'Y', bg: 'bg-[#00A9E0]', fg: 'text-white' },
  halopesa: { label: 'HaloPesa', short: 'H', bg: 'bg-[#F7941D]', fg: 'text-white' },
  azampesa: { label: 'AzamPesa', short: 'AZ', bg: 'bg-[#0B7A3B]', fg: 'text-white' },
  tpesa: { label: 'T-Pesa', short: 'T', bg: 'bg-[#7B1FA2]', fg: 'text-white' },
  crdb: { label: 'CRDB Bank', short: 'C', bg: 'bg-[#0B6B3A]', fg: 'text-white' },
  nmb: { label: 'NMB Bank', short: 'N', bg: 'bg-[#1B4F9C]', fg: 'text-white' },
  nbc: { label: 'NBC Bank', short: 'NB', bg: 'bg-[#00539B]', fg: 'text-white' },
  equity: { label: 'Equity Bank', short: 'E', bg: 'bg-[#B01116]', fg: 'text-white' },
  exim: { label: 'Exim Bank', short: 'EX', bg: 'bg-[#004C97]', fg: 'text-white' },
  other_bank: { label: 'Benki Nyingine', short: 'B', bg: 'bg-slate-700', fg: 'text-white' },
  other: { label: 'Nyingine', short: '•', bg: 'bg-slate-500', fg: 'text-white' },
};

export const paymentBrandLabel = (network?: string | null) =>
  BRANDS[(network || '').toLowerCase()]?.label || (network || '').toUpperCase();

const SIZES = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
};

interface PaymentBrandIconProps {
  network?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export const PaymentBrandIcon = ({ network, size = 'md', className = '' }: PaymentBrandIconProps) => {
  const key = (network || '').toLowerCase();
  const brand = BRANDS[key] || BRANDS.other;

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl font-extrabold tracking-tight shadow-sm ${brand.bg} ${brand.fg} ${SIZES[size]} ${className}`}
      aria-label={brand.label}
      title={brand.label}
    >
      {brand.short}
    </div>
  );
};

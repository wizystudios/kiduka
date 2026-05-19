import { useBusinessContext, BusinessRole } from '@/hooks/useBusinessContext';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useState } from 'react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

const roleLabel: Record<BusinessRole, string> = {
  owner: 'Mmiliki',
  co_owner: 'Mmiliki Mwenza',
  branch_manager: 'Meneja Tawi',
  cashier: 'Mhasibu Mauzo',
  salesperson: 'Muuzaji',
  inventory_officer: 'Afisa Stoo',
  accountant: 'Mhasibu',
  assistant: 'Msaidizi',
};

export const BusinessSwitcher = () => {
  const { businesses, currentBusinessId, setCurrentBusinessId, loading } = useBusinessContext();
  const [open, setOpen] = useState(false);

  if (loading || businesses.length === 0) return null;

  const current = businesses.find(b => b.business_id === currentBusinessId) ?? businesses[0];

  // Single business — just show the name as a chip
  if (businesses.length === 1) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1.5 text-xs">
        <Building2 className="h-3.5 w-3.5 text-primary" />
        <span className="font-semibold text-foreground">{current.business_name}</span>
        <span className="text-muted-foreground">· {roleLabel[current.role]}</span>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-primary/20 transition">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span className="max-w-[140px] truncate">{current.business_name}</span>
          <span className="text-[10px] text-muted-foreground">· {roleLabel[current.role]}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 rounded-2xl">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Biashara zako ({businesses.length})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {businesses.map(b => (
          <DropdownMenuItem
            key={b.business_id}
            onClick={() => setCurrentBusinessId(b.business_id)}
            className="flex items-center justify-between gap-2 rounded-xl"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{b.business_name}</p>
              <p className="text-[10px] text-muted-foreground">{roleLabel[b.role]}</p>
            </div>
            {b.business_id === currentBusinessId && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

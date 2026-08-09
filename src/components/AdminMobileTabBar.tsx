import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, ChevronDown } from 'lucide-react';

export interface AdminTabItem {
  value: string;
  label: string;
  badge?: number;
}

interface Props {
  tabs: AdminTabItem[];
  active: string;
  onChange: (value: string) => void;
}

/**
 * Compact mobile navigation for the admin panel:
 * a sticky one-line pill strip for instant switching plus a grid sheet
 * that exposes every section at once.
 */
export const AdminMobileTabBar = ({ tabs, active, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const current = tabs.find((t) => t.value === active) || tabs[0];

  return (
    <div className="md:hidden">
      <div className="sticky top-0 z-30 -mx-1 mb-3 flex items-center gap-2 bg-background/95 px-1 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
          aria-label="Sehemu zote"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span className="max-w-[84px] truncate">{current?.label}</span>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>

        <div className="no-scrollbar flex flex-1 items-center gap-1.5 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={`relative h-9 flex-shrink-0 rounded-full border px-3 text-[11px] font-medium transition-colors ${
                active === tab.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground'
              }`}
            >
              {tab.label}
              {!!tab.badge && tab.badge > 0 && (
                <Badge className="absolute -top-1 -end-1 h-4 min-w-4 justify-center p-0 text-[9px]" variant="destructive">
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader className="text-start">
            <SheetTitle>Sehemu zote</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  onChange(tab.value);
                  setOpen(false);
                }}
                className={`relative h-14 rounded-2xl border px-3 text-sm font-medium ${
                  active === tab.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground'
                }`}
              >
                {tab.label}
                {!!tab.badge && tab.badge > 0 && (
                  <Badge className="absolute top-1.5 end-1.5 h-4 min-w-4 justify-center p-0 text-[9px]" variant="destructive">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminMobileTabBar;

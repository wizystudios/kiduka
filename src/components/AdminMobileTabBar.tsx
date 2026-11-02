import { Badge } from '@/components/ui/badge';
import { Building2, Users, Wallet, Headset, type LucideIcon } from 'lucide-react';

export interface AdminTabItem {
  value: string;
  label: string;
  badge?: number;
  group: string;
}

interface Props {
  tabs: AdminTabItem[];
  active: string;
  onChange: (value: string) => void;
}

const GROUP_META: Record<string, { icon: LucideIcon; hint: string }> = {
  Biashara: { icon: Building2, hint: 'Hali ya duka, matawi, mauzo na bidhaa' },
  Watumiaji: { icon: Users, hint: 'Akaunti, nenosiri, ruhusa na shughuli' },
  Fedha: { icon: Wallet, hint: 'Usajili, malipo na mapato' },
  Huduma: { icon: Headset, hint: 'Msaada, mawasiliano, Sokoni na matangazo' },
};

/**
 * Two-level admin navigation: pick an area, then a section inside it.
 */
export const AdminMobileTabBar = ({ tabs, active, onChange }: Props) => {
  const groups = Array.from(new Set(tabs.map((t) => t.group)));
  const activeGroup = tabs.find((t) => t.value === active)?.group || groups[0];
  const groupBadge = (g: string) => tabs.filter((t) => t.group === g).reduce((s, t) => s + (t.badge || 0), 0);
  const meta = GROUP_META[activeGroup];

  return (
    <div className="sticky top-0 z-30 mb-4 space-y-3 bg-background/95 py-2 backdrop-blur">
      <div className="grid grid-cols-4 gap-1 rounded-3xl bg-muted p-1">
        {groups.map((g) => {
          const b = groupBadge(g);
          const Icon = GROUP_META[g]?.icon || Building2;
          const on = activeGroup === g;
          return (
            <button
              key={g}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(tabs.find((t) => t.group === g)!.value)}
              className={`relative flex min-w-0 flex-col items-center gap-1 rounded-3xl px-1 py-2 text-[11px] font-semibold transition-all sm:flex-row sm:justify-center sm:gap-2 sm:text-sm ${
                on ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{g}</span>
              {b > 0 && (
                <Badge variant="destructive" className="absolute right-1 top-1 h-4 min-w-4 justify-center p-0 text-[9px]">{b}</Badge>
              )}
            </button>
          );
        })}
      </div>
      {meta && <p className="px-1 text-xs text-muted-foreground">{meta.hint}</p>}
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
        {tabs.filter((t) => t.group === activeGroup).map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`relative h-9 flex-shrink-0 rounded-full px-4 text-xs font-medium transition-colors ${
              active === tab.value ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {!!tab.badge && tab.badge > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -end-1 h-4 min-w-4 justify-center p-0 text-[9px]">{tab.badge}</Badge>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminMobileTabBar;

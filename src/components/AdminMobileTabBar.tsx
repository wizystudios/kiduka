import { Badge } from '@/components/ui/badge';

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

/**
 * Two-level admin navigation: pick a group, then a section inside it.
 * Same layout on phone and big screen so only a few choices show at once.
 */
export const AdminMobileTabBar = ({ tabs, active, onChange }: Props) => {
  const groups = Array.from(new Set(tabs.map((t) => t.group)));
  const activeGroup = tabs.find((t) => t.value === active)?.group || groups[0];
  const groupBadge = (g: string) => tabs.filter((t) => t.group === g).reduce((s, t) => s + (t.badge || 0), 0);

  return (
    <div className="sticky top-0 z-30 mb-4 space-y-2 bg-background/95 py-2 backdrop-blur">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {groups.map((g) => {
          const b = groupBadge(g);
          return (
            <button
              key={g}
              type="button"
              onClick={() => onChange(tabs.find((t) => t.group === g)!.value)}
              className={`relative h-10 rounded-2xl border text-sm font-semibold transition-colors ${
                activeGroup === g ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground'
              }`}
            >
              {g}
              {b > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -end-1 h-4 min-w-4 justify-center p-0 text-[9px]">{b}</Badge>
              )}
            </button>
          );
        })}
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {tabs.filter((t) => t.group === activeGroup).map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`relative h-9 flex-shrink-0 rounded-full border px-4 text-xs font-medium transition-colors ${
              active === tab.value ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
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

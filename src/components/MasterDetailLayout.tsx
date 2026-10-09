import { ReactNode } from 'react';
import { MousePointerClick } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MasterDetailLayoutProps {
  list: ReactNode;
  detail: ReactNode;
  hasSelection: boolean;
  className?: string;
  emptyText?: string;
}

/**
 * Desktop: persistent list on the left, detail pane on the right, both
 * filling the remaining viewport height and scrolling independently.
 * Mobile: list only (pages open details in a sheet).
 */
export function MasterDetailLayout({ list, detail, hasSelection, className, emptyText }: MasterDetailLayoutProps) {
  return (
    <div
      className={cn(
        'min-w-0 md:grid md:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] md:gap-0 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]',
        'md:h-[calc(100dvh-11rem)] md:overflow-hidden md:rounded-3xl md:border md:border-border/60 md:bg-card',
        className,
      )}
    >
      <div className="min-w-0 md:h-full md:overflow-y-auto md:border-r md:border-border/60 md:p-3">
        {list}
      </div>
      <aside className="hidden min-w-0 md:block md:h-full md:overflow-y-auto md:bg-muted/20 md:p-5">
        {hasSelection ? detail : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MousePointerClick className="h-6 w-6" />
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">{emptyText || 'Chagua kipengele upande wa kushoto kuona maelezo yake hapa.'}</p>
          </div>
        )}
      </aside>
    </div>
  );
}

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MasterDetailLayoutProps {
  list: ReactNode;
  detail: ReactNode;
  hasSelection: boolean;
  className?: string;
}

export function MasterDetailLayout({ list, detail, hasSelection, className }: MasterDetailLayoutProps) {
  return (
    <div className={cn('min-w-0 lg:grid lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:gap-4', className)}>
      <div className="min-w-0 lg:max-h-[calc(100dvh-13rem)] lg:overflow-y-auto lg:border-r lg:border-border lg:pr-4">
        {list}
      </div>
      <aside className="hidden min-w-0 lg:block">
        {hasSelection ? detail : (
          <div className="flex min-h-72 items-center justify-center border border-dashed border-border bg-muted/20 p-8 text-center">
            <p className="max-w-xs text-sm text-muted-foreground">Chagua kipengele upande wa kushoto kuona maelezo yake hapa.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
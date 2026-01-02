import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CloudOff, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface OfflineIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSync: Date | null;
  onSync: () => void;
}

export const OfflineIndicator = ({
  isOnline,
  isSyncing,
  pendingChanges,
  lastSync,
  onSync
}: OfflineIndicatorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Haijawahi';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Sasa hivi';
    if (minutes < 60) return `Dakika ${minutes} zilizopita`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Saa ${hours} zilizopita`;
    
    return date.toLocaleDateString('sw-TZ');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative h-8 w-8 p-0"
        >
          {isOnline ? (
            <Cloud className="h-4 w-4 text-green-500" />
          ) : (
            <CloudOff className="h-4 w-4 text-orange-500" />
          )}
          
          {pendingChanges > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
            >
              {pendingChanges > 9 ? '9+' : pendingChanges}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">Mtandaoni</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-600">Offline</span>
              </>
            )}
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mabadiliko yanayosubiri:</span>
              <span className="font-medium">{pendingChanges}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sawazishwa mwisho:</span>
              <span className="font-medium">{formatLastSync(lastSync)}</span>
            </div>
          </div>

          {!isOnline && (
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-orange-700 dark:text-orange-300">
              Data zitasawazishwa mara mtandao utakaporudi.
            </div>
          )}

          {isOnline && (
            <Button 
              size="sm" 
              className="w-full" 
              onClick={() => {
                onSync();
                setIsOpen(false);
              }}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Inasawazisha...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Sawazisha Sasa
                </>
              )}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

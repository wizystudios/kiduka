import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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

  const getStatusColor = () => {
    if (!isOnline) return 'text-orange-500';
    if (pendingChanges > 0) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <CloudOff className={`h-4 w-4 ${getStatusColor()}`} />;
    if (isSyncing) return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
    if (pendingChanges > 0) return <AlertCircle className={`h-4 w-4 ${getStatusColor()}`} />;
    return <Cloud className={`h-4 w-4 ${getStatusColor()}`} />;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative h-8 w-8 p-0"
        >
          {getStatusIcon()}
          
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
      
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b">
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
        </div>

        <div className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-muted rounded">
              <p className="text-muted-foreground">Zinasubiri</p>
              <p className="font-semibold text-foreground">{pendingChanges}</p>
            </div>
            <div className="p-2 bg-muted rounded">
              <p className="text-muted-foreground">Sync mwisho</p>
              <p className="font-semibold text-foreground">{formatLastSync(lastSync)}</p>
            </div>
          </div>

          {!isOnline && (
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-orange-700 dark:text-orange-300">
              Data zitasawazishwa mara mtandao utakaporudi.
            </div>
          )}

          {isOnline && pendingChanges > 0 && (
            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-300">
              Una mabadiliko {pendingChanges} yanayosubiri kusawazishwa.
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

// Compact sync status card for dashboard/sidebar
export const SyncStatusCard = ({
  isOnline,
  isSyncing,
  pendingChanges,
  lastSync,
  onSync
}: OfflineIndicatorProps) => {
  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Haijawahi';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Sasa hivi';
    if (minutes < 60) return `Dakika ${minutes}`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Saa ${hours}`;
    
    return date.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short' });
  };

  return (
    <Card className={`${!isOnline ? 'border-orange-300 bg-orange-50 dark:bg-orange-900/20' : ''}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Cloud className="h-4 w-4 text-green-500" />
            ) : (
              <CloudOff className="h-4 w-4 text-orange-500" />
            )}
            <span className="text-sm font-medium">
              {isOnline ? 'Mtandaoni' : 'Offline'}
            </span>
          </div>
          
          {pendingChanges > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingChanges} zinasubiri
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Sync: {formatLastSync(lastSync)}</span>
          
          {isOnline && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={onSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

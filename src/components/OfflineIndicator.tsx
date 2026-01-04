import { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff, AlertCircle, History, Trash2, Download, Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SyncLogEntry } from '@/utils/offlineDatabase';

interface OfflineIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSync: Date | null;
  onSync: () => void;
  syncHistory?: SyncLogEntry[];
  onClearHistory?: () => void;
}

export const OfflineIndicator = ({
  isOnline,
  isSyncing,
  pendingChanges,
  lastSync,
  onSync,
  syncHistory = [],
  onClearHistory
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

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Sasa';
    if (minutes < 60) return `${minutes}m`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    
    return date.toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short' });
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

  const getLogIcon = (entry: SyncLogEntry) => {
    switch (entry.type) {
      case 'download':
        return <Download className="h-3 w-3 text-blue-500" />;
      case 'upload':
        return <Upload className="h-3 w-3 text-green-500" />;
      case 'conflict':
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <CheckCircle2 className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getLogStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'partial':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'failed':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getTableName = (table: string) => {
    const names: Record<string, string> = {
      products: 'Bidhaa',
      customers: 'Wateja',
      sales: 'Mauzo',
      sales_items: 'Vitu vya mauzo',
      all: 'Zote'
    };
    return names[table] || table;
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
      
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
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
            <span className="text-xs text-muted-foreground">
              Sync: {formatLastSync(lastSync)}
            </span>
          </div>
        </div>

        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="status" className="text-xs">Hali</TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <History className="h-3 w-3 mr-1" />
              Historia
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="p-3 space-y-3 mt-0">
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
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <div className="flex items-center justify-between px-3 py-2 border-b">
              <span className="text-xs text-muted-foreground">
                {syncHistory.length} shughuli
              </span>
              {syncHistory.length > 0 && onClearHistory && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 px-2 text-xs"
                  onClick={onClearHistory}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Futa
                </Button>
              )}
            </div>
            
            <ScrollArea className="h-48">
              {syncHistory.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Hakuna historia ya sync
                </div>
              ) : (
                <div className="divide-y">
                  {syncHistory.map((entry) => (
                    <div key={entry.id} className="p-2 hover:bg-muted/50">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">{getLogIcon(entry)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium truncate">
                              {getTableName(entry.table)}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`text-[10px] px-1 py-0 ${getLogStatusColor(entry.status)}`}
                            >
                              {entry.itemCount}
                            </Badge>
                          </div>
                          {entry.details && (
                            <p className="text-[10px] text-muted-foreground truncate">
                              {entry.details}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
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
}: Omit<OfflineIndicatorProps, 'syncHistory' | 'onClearHistory'>) => {
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

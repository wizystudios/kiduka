/**
 * Lightweight transaction & system event logger (admin-focused).
 * Stores logs in IndexedDB so they survive offline and can be inspected
 * from Mobile QA. Owners can view, but the audience is admin/debug.
 */
import { offlineDB } from './offlineDatabase';

export type TxnLevel = 'info' | 'warn' | 'error' | 'success';
export type TxnScope =
  | 'cart'
  | 'checkout'
  | 'payment'
  | 'sync'
  | 'conflict'
  | 'stock'
  | 'system';

export interface TxnLog {
  id: string;
  timestamp: number;
  scope: TxnScope;
  step: string;        // e.g. "add_item", "validate_payment", "supabase_upsert"
  level: TxnLevel;
  code?: string;       // error code or HTTP status, e.g. "PGRST116", "23505"
  message: string;
  context?: Record<string, any>;
}

const MAX_LOGS = 500;

class TransactionLogger {
  async log(entry: Omit<TxnLog, 'id' | 'timestamp'>) {
    try {
      await offlineDB.addTransactionLog({
        ...entry,
        id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        timestamp: Date.now(),
      });
      // mirror to console for live debugging
      const tag = `[${entry.scope}/${entry.step}]`;
      const msg = entry.code ? `${tag} ${entry.code} ${entry.message}` : `${tag} ${entry.message}`;
      if (entry.level === 'error') console.error(msg, entry.context || '');
      else if (entry.level === 'warn') console.warn(msg, entry.context || '');
      else console.log(msg, entry.context || '');
    } catch (e) {
      // never throw from logger
      console.warn('txnLogger failed', e);
    }
  }

  info(scope: TxnScope, step: string, message: string, context?: Record<string, any>) {
    return this.log({ scope, step, message, level: 'info', context });
  }
  success(scope: TxnScope, step: string, message: string, context?: Record<string, any>) {
    return this.log({ scope, step, message, level: 'success', context });
  }
  warn(scope: TxnScope, step: string, message: string, code?: string, context?: Record<string, any>) {
    return this.log({ scope, step, message, level: 'warn', code, context });
  }
  error(scope: TxnScope, step: string, message: string, code?: string, context?: Record<string, any>) {
    return this.log({ scope, step, message, level: 'error', code, context });
  }

  async list(limit = MAX_LOGS): Promise<TxnLog[]> {
    return offlineDB.getTransactionLogs(limit);
  }

  async clear(): Promise<void> {
    return offlineDB.clearTransactionLogs();
  }
}

export const txnLogger = new TransactionLogger();

// Expose a global hook so any module/page can log without importing
if (typeof window !== 'undefined') {
  (window as any).kidukaLog = txnLogger;
}

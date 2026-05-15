// Lightweight in-memory event bus so a single floating NurathAvatar can mirror
// the live state of the active voice pipeline (VoicePOS), regardless of route.

import type { NurathState } from '@/components/NurathAvatar';

export type NurathLogKind = 'state' | 'mic' | 'transcript' | 'error' | 'info';

export interface NurathLogEvent {
  id: string;
  at: number;
  kind: NurathLogKind;
  message: string;
  state?: NurathState;
  meta?: Record<string, unknown>;
}

export interface NurathSnapshot {
  state: NurathState;
  audioLevel: number;
  isListening: boolean;
  active: boolean; // a pipeline (VoicePOS) is mounted/owning the bus
  enabled: boolean; // user has turned always-on wake listening on
  needsGesture: boolean;
  updatedAt: number;
}

export type NurathCommand =
  | { type: 'start'; source?: 'float' | 'page' | 'wake' | 'system' }
  | { type: 'stop'; source?: 'float' | 'page' | 'wake' | 'system' }
  | { type: 'open-logs' };

const MAX_LOGS = 200;

let snapshot: NurathSnapshot = {
  state: 'idle',
  audioLevel: 0,
  isListening: false,
  active: false,
  enabled: false,
  needsGesture: false,
  updatedAt: Date.now(),
};

let logs: NurathLogEvent[] = [];

const stateListeners = new Set<(s: NurathSnapshot) => void>();
const logListeners = new Set<(l: NurathLogEvent[]) => void>();
const commandListeners = new Set<(command: NurathCommand) => void>();

const notifyState = () => stateListeners.forEach(fn => fn(snapshot));
const notifyLogs = () => logListeners.forEach(fn => fn(logs));

export const nurathBus = {
  getSnapshot: () => snapshot,
  getLogs: () => logs,

  publishState(patch: Partial<NurathSnapshot>) {
    snapshot = { ...snapshot, ...patch, updatedAt: Date.now() };
    notifyState();
  },

  setActive(active: boolean) {
    if (snapshot.active === active) return;
    snapshot = { ...snapshot, active, updatedAt: Date.now() };
    notifyState();
  },

  log(kind: NurathLogKind, message: string, meta?: Record<string, unknown>, state?: NurathState) {
    const entry: NurathLogEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: Date.now(),
      kind,
      message,
      state: state ?? snapshot.state,
      meta,
    };
    logs = [entry, ...logs].slice(0, MAX_LOGS);
    notifyLogs();
  },

  clearLogs() {
    logs = [];
    notifyLogs();
  },

  dispatch(command: NurathCommand) {
    commandListeners.forEach(fn => fn(command));
  },

  subscribeState(fn: (s: NurathSnapshot) => void) {
    stateListeners.add(fn);
    fn(snapshot);
    return () => stateListeners.delete(fn);
  },

  subscribeLogs(fn: (l: NurathLogEvent[]) => void) {
    logListeners.add(fn);
    fn(logs);
    return () => logListeners.delete(fn);
  },

  subscribeCommands(fn: (command: NurathCommand) => void) {
    commandListeners.add(fn);
    return () => commandListeners.delete(fn);
  },
};

// Voice POS undo stack — keeps last N reversible cart mutations
// so the user can say "Nurath tendua" or tap "Tendua" to roll back.

export type CartUndoEntry = {
  id: string;
  at: number;
  description: string;       // e.g. "Ongezwa Juice 1"
  // The full cart snapshot BEFORE the mutation. Restoring sets cart to this.
  previousCartJson: string;
};

const STACK_LIMIT = 5;
let stack: CartUndoEntry[] = [];
const listeners = new Set<(s: CartUndoEntry[]) => void>();

const notify = () => listeners.forEach((fn) => fn([...stack]));

export const voiceUndoStack = {
  push(entry: Omit<CartUndoEntry, 'id' | 'at'>) {
    stack = [
      { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, at: Date.now() },
      ...stack,
    ].slice(0, STACK_LIMIT);
    notify();
  },
  pop(): CartUndoEntry | null {
    const [head, ...rest] = stack;
    stack = rest;
    notify();
    return head ?? null;
  },
  peek(): CartUndoEntry | null {
    return stack[0] ?? null;
  },
  clear() {
    stack = [];
    notify();
  },
  list(): CartUndoEntry[] {
    return [...stack];
  },
  subscribe(fn: (s: CartUndoEntry[]) => void) {
    listeners.add(fn);
    fn([...stack]);
    return () => listeners.delete(fn);
  },
};

// Detect Swahili/English undo intent on a transcript.
const UNDO_PATTERNS = [
  /\btendua\b/i,
  /\bondoa la mwisho\b/i,
  /\brudisha nyuma\b/i,
  /\bundo\b/i,
  /\bcancel last\b/i,
];
export const isUndoCommand = (text: string) => UNDO_PATTERNS.some((re) => re.test(text));

// Detect explicit confirm/cancel utterances for the pending confirmation.
const CONFIRM_PATTERNS = [/\bthibitisha\b/i, /\bndiyo\b/i, /\bsawa\b/i, /\bconfirm\b/i, /\byes\b/i];
const CANCEL_PATTERNS = [/\bghairi\b/i, /\bhapana\b/i, /\bsitishe\b/i, /\bcancel\b/i, /\bno\b/i];
export const isConfirmCommand = (text: string) => CONFIRM_PATTERNS.some((re) => re.test(text));
export const isCancelCommand = (text: string) => CANCEL_PATTERNS.some((re) => re.test(text));

## Plan

### 1. Voice POS Confirmation + Undo

- In `VoicePOS.tsx`, intercept `add_to_sale`, `clear_sale`, and `complete_sale` tool results.
- Before applying, show a Nurath spoken confirm ("Nithibitishie kuongeza Juice 1?") + on-screen confirm chip with `Thibitisha` / `Ghairi` buttons (5s auto-cancel).
- After applying, push action onto an `undoStack` (last 5). Show "Tendua" toast for 8s; voice command "Nurath tendua" rolls back the last cart mutation.
- Persist undo log into `nurath_logs` with `stage='confirm'|'undo'`.

### 2. E2E Voice POS Test Harness

- New `src/components/qa/VoicePOSE2EPanel.tsx` in Mobile QA "Sauti" tab.
- Scripted scenarios (e.g. "nahitaji kununua juice", "ongeza soda 2", "maliza muuzo") simulated by feeding transcript into the existing pipeline (no real mic).
- Asserts: (a) intent matched, (b) product resolved, (c) cart subtotal correct, (d) stock_quantity decremented after `complete_sale`, (e) sale row + sales_items inserted.
- Results table with pass/fail + diff; CSV export.

### 3. Wake-Word Regression Panel

- Extend existing `WakeWordTestPanel.tsx` with an **Automated Regression** mode.
- Iterates a fixture list (~25 aliases: nurath, nura, nurati, new wrath, nu rath, noor ath, etc.), each with expected match=true/false.
- For each: feeds through `detectWake`, records `interim/final`, `confidence` (synthetic 0.7 default), `latency` (perf.now diff), `pass/fail`. Total summary "X/Y passed".
- Persisted to `nurath_logs` with `stage='regression'`.

### 4. Supabase Linter to 0

- Run linter, then migration to:
  - Drop public list policies on storage buckets where unintended (keep `product-images` read-only by object path; require auth for listing `email-assets` and `qa-screenshots` if flagged).
  - Re-revoke `EXECUTE` from `public` on remaining `SECURITY DEFINER` functions surfaced by linter (any added since last pass).
- Re-run linter; iterate until 0.

### Files

- Edit: `src/components/VoicePOS.tsx`, `src/components/qa/WakeWordTestPanel.tsx`, `src/pages/MobileQAPage.tsx`

# Create: `src/components/qa/VoicePOSE2EPanel.tsx`, `src/utils/voiceConfirmStack.ts`

- Migration: storage policy + function grants tightening.

Scope is large; I'll execute sequentially, verifying linter at the end.,YES ITS LARGE BUT STILL WE HAVE TOKEN SO TAKE YOURTIME DO NOT RUSH TO EXCUTE WE NEED ALL TO BE PERFECT
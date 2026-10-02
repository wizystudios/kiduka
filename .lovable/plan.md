# Finish Kiduka’s open workflows and redesign transaction screens

## What will change

### 1. Navigation and profile
- Keep Kiduka’s top and bottom navigation visible on the scanner, payment, completed-sale, receipt, and invoice views.
- Fit those screens between the two bars instead of covering the entire phone display.
- Place the profile avatar at the far-right edge of the top bar and open the existing curved profile menu from it.
- Remove the microphone button from the top bar because Nurath is disabled.

### 2. Completed sale, receipt, and invoice design
- Replace the current sparse “Mauzo Yamekamilika” screen with a compact Kiduka transaction summary: branded header, customer greeting, prominent amount and payment state, transaction details, purchased items, totals, and clear print/download/share/continue actions.
- Use the first supplied image’s strong hierarchy without copying Vodacom branding: Kiduka blue/green, real business name, payment provider identity, clear rows, and payment-state treatment.
- Use one shared document design for receipts and invoices; only the title, number, due information, and payment state change.
- Support visually distinct `Amelipa`, `Sehemu`, and `Hajalipa` states.
- Replace the old English “Receipt Options” card and HTML download with the existing Kiduka document renderer and actual print/PDF/image sharing paths.

### 3. Payments and Lipa Namba
- Wire the existing real mobile-network/bank marks into the live checkout.
- Redesign the customer payment panel around a large scannable QR, provider, account holder, Lipa Namba/account number, amount, copy, share, and confirmation actions.
- Use the Kiduka shopping-bag success animation for cash, mobile, and bank payments.
- Save payment status, provider, account/reference, and transaction identifier with the sale instead of discarding them.

### 4. Branch data isolation
- Restrict branch staff to their assigned branch across products, sales, customers, expenses, inventory movements, dashboard totals, invoices, scanner searches, and offline downloads/cache.
- Stamp the assigned branch on new data created by branch staff.
- Enforce the same restriction in database access rules so it cannot be bypassed from the browser.
- Owners, approved business-wide roles, and the super admin retain the appropriate wider view.

### 5. Sales become editable invoices
- Create one real invoice for each completed sale and link it to that sale.
- Reuse the existing invoice editor and autosave so customer, items, status, and notes remain editable after checkout.
- Bring Quick Sale onto the same sales/inventory/invoice path so stock and reports remain consistent.

### 6. Registration and Arabic
- Confirm Sheria continues opening as a right-side panel and connect any missing new-business registration/sign-in entry points.
- Correct right-to-left spacing and alignment on dashboard, payment, receipt, and invoice screens; preserve Swahili content where Arabic translations do not yet exist rather than showing broken layouts.

## Technical details
- Add one branch-aware access helper and replace business-wide member policies on branch-owned tables.
- Add or normalize sale payment-detail fields and enforce one invoice per sale.
- Upgrade IndexedDB stores and queries with branch filtering; clear incompatible whole-business caches for branch staff during upgrade.
- Reuse `BusinessDocument`, `PaymentBrandIcon`, and `KidukaSuccessAnimation` as the shared visual sources instead of maintaining duplicate receipt/payment implementations.
- Keep all app colors in semantic design tokens and preserve the existing rounded Kiduka design language.

## Verification
- Check mobile and desktop layouts with the scanner, payment, completed-sale, receipt, and invoice screens open; confirm both navigation bars remain usable.
- Sign into the preview, then create a branch, add staff, transfer them, deactivate them, and verify matching activity entries and branch-only data.
- Complete cash, mobile, and bank sales; confirm payment visuals, receipt/PDF output, invoice autosave/editing, stock changes, and payment states.
- Switch to Arabic and inspect dashboard, payment, receipt, and invoice alignment.
- Walk PIN/fingerprint sign-in where the browser/device supports it; report any hardware-only limitation clearly.

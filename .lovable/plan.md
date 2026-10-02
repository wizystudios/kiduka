# Kiduka: sale-to-receipt flow, payment QR, invoices, Sheria signup, branch walkthrough

## 1. Sale finish flow (scanner page)
- Remove the "Mauzo Yamekamilika" animation card after a sale. Show only the receipt.
- Remove the floating back/home circle buttons from the receipt layer. Use one clean header bar that matches the scanner page: a close (X) button, the title "Risiti", and the business name.
- One receipt, shown once. Merge the "Tuma risiti kwa mteja" step into the same receipt screen as share actions (WhatsApp, picha, PDF, chapisha). No second receipt screen.
- Closing the receipt resets the cart and goes back to the scanner, ready for the next customer. This is the expected flow.
- The Kiduka success animation stays only inside the payment screen. It shows briefly when payment is confirmed, then moves straight to the receipt.

## 2. Payment / Lipa Namba QR redesign (see the "Shiriki Lipa Namba" picture)
- Rebuild the QR share card in the same style as the receipt: a blue header with the Kiduka mark, business name, and the network badge with its real icon. Below that, a white card with a large centered QR, the Lipa Namba in big text, the account name, and the amount if there is one, then a "Powered by Kiduka" footer.
- Fix the overflow and cut-off: the card fits the phone width, the buttons sit in a fixed bottom row (Pakua / PDF / Picha) and never spill off screen, and the helper text is not cut off.
- Use the same card for the QR on the checkout payment screen, so customers see one consistent design.

## 3. Invoices page: one list
- Merge "Ankara Zilizohifadhiwa" and "Ankara Kutoka Mauzo" into one list sorted by date, newest first. A small chip on each row shows where it came from (Mauzo / Mwenyewe). There are no separate sections. Search and filter by status still work across everything.

## 4. Sheria self-signup
- The registration panel creates a real business account: business name, owner name, email, phone and password, using the same password rules as the rest of the app.
- After signup: create the profile with the owner role and the business record, sign in right away when the account is confirmed, then open the business's own empty main shop.
- If email confirmation is required, show a clear "angalia barua pepe" message instead of failing silently.

## 5. Profile menu to notifications
- Add a "Taarifa" entry, with the unread count, to the rise-up profile menu (top-right avatar and the bottom Zaidi button). It opens the Outlook-style notifications page.

## 6. Branch walkthrough (signed in, in the preview)
- Create a test branch, then create a staff user for it through the existing branch screen.
- Sign in as that staff member and confirm Products, Sales, Invoices and Customers show only that branch's records, with no main-shop items.
- Transfer the staff member to a second branch, deactivate them, and confirm each step appears in the activity log with matching entries.
- Sign up a new test business through Sheria and confirm it lands on its own empty shop.
- Fix anything that fails. Test records are clearly named (for example "TEST Tawi") so you can remove them afterwards.

## 7. Not possible here
- Fingerprint/PIN sign-in on a real phone needs your physical device. The PIN path will be checked in the browser; the fingerprint step stays with you.

## Technical details
- `ScannerPage.tsx`: drop the floating ArrowLeft/Home buttons while `showReceipt` is open; replace `EnhancedReceiptPrinter` + `DigitalReceiptService` with a single receipt sheet: header (X), `BusinessDocument`, an action row, and WhatsApp send folded in. On close: clear the cart and `completedSale`.
- `EnhancedReceiptPrinter.tsx`: remove the `KidukaSuccessAnimation` block; add the WhatsApp share action.
- New `LipaNambaCard.tsx` renders the branded QR card for both `LipaNambaPage` share and `PaymentMethodDialog`; export it through the existing `captureElementAsImage`/PDF utils.
- `InvoicesPage.tsx`: normalize saved and sale-derived invoices into one array and render with a single list component.
- `BusinessRegistrationPanel.tsx` / Sheria: call `supabase.auth.signUp` with metadata (role owner, business_name, phone); the existing triggers create the profile, subscription and business; then `signInWithPassword` and navigate to `/dashboard`.
- `ProfileMenuSheet.tsx`: add a notifications link with an unread badge.
- Walkthrough via Playwright with the injected session plus the newly created staff account.

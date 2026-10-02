# Complete Kiduka, Sokoni, Matawi and Malipo audit

## Goal
Finish the repeated items as one verified workflow across owner, customer and admin views, on phone-sized and large screens.

## Build
- Make scanner sales atomic: save sale, items, invoice and stock changes together, then open the shared receipt with the real shop name.
- Replace the old public receipt placeholder with the same trusted receipt design and real business identity.
- Upgrade Matawi pricing into a live super-admin editor with database-backed free, base, branch and overage amounts; every preview and Malipo charge uses that same source.
- Rebuild Malipo subscription checkout around the official ClickPesa token, initiation and status endpoints. Ignore client-supplied totals, confirm paid amount server-side, and activate only after ClickPesa confirms the exact expected amount.
- Add a private payment-proof upload and owner payment ledger showing billed amount, paid amount, outstanding balance, status, reference and purchased limits.
- Add a safe owner request flow for uploaded proof; admin approval remains server-controlled and snapshots paid entitlements.
- Fix the high-impact responsive mismatches on Matawi and Malipo, while preserving Sokoni’s working grids and desktop list/detail pattern.
- Fix the product-photo storage rule and other directly related payment/security issues found in the audit.

## Verify
- Make one real scanner sale using the existing test product and confirm the saved sale, linked invoice, stock deduction and receipt shop name.
- Verify owner, customer/Sokoni and super-admin flows at 393px phone size and 1280px large-screen size.
- Verify Matawi totals match Malipo’s expected amount before any provider request.
- Test provider initiation without fabricating success; only an actual phone authorization and confirmed ClickPesa status may be reported as paid.
- Run build, browser, database, storage, dependency and backend security checks.

## External boundary
The preview can reproduce the real phone viewport, but cannot physically control the user’s handset. The final live payment needs the owner to approve the USSD prompt on that handset; the system will then verify it automatically.

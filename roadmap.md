# Kiduka completion roadmap

## Current requested corrections
- [x] Restore the existing desktop welcome design without redesigning it: original two left / three right decorative cards and desktop spacing restored.
- [x] Add the Kiduka logo, distinct full-frame images and speaking videos of at least five seconds to ServiceHUB cards: three 1080p six-second clips, MP4/WebM playback, branded downloaded cards.
- [x] Change the large-business extra employee fee from TSh 500 to TSh 5,000 in live billing and tests: public live pricing displays 5,000 and concrete tests pass.
- [x] Diagnose and fix navigation freeze risks: remove landing global scroll lock, add actual worker fetch aborts and exclude private/media caching; repeated public route changes pass without runtime errors. Authenticated reproduction remains blocked below.

## ServiceHUB
- [x] Remove customer captures and authentication Sokoni button; consolidate internal support into ServiceHUB.
- [x] Add private admin inquiry management, status tracking and durable email/WhatsApp replies; unauthenticated access rejected.
- [x] Verify booking and question submissions: two unique emails recorded sent; recipient inbox is not accessible.
- [ ] Verify signed-in admin inquiry, reply and resolution flow (self-session mint again returned no matching account; requires user sign-in as system admin). Receiving email in the recipient inbox remains unverified; only sender acceptance is verified.
- [x] Resolve Project monitoring branch finding: owner edits omit admin-managed features, all feature/type controls consistently restricted; concrete payload tests pass.
- [x] Public ServiceHUB navigation on mobile and desktop, signed in or out.
- [x] Return announcement, existing visual media and WhatsApp-shareable service cards.
- [x] Persist appointment requests/questions and notify the confirmed business email; two audit requests recorded as sent.
- [x] Verify public form and navigation at phone and desktop sizes; downloaded share card verified.

- [x] Keep top and bottom navigation visible on scanner, completed-sale, payment, and receipt screens.
- [x] Redesign completed-sale and receipt/invoice surfaces from the supplied transaction references while preserving Kiduka branding.
- [x] Connect payment provider icons, large QR/Lipa Namba presentation, and Kiduka success animation to live checkout.
- [x] Place the profile control at the far right and remove the Nurath microphone from the top bar.
- [x] Enforce branch isolation for products, customers, sales, expenses, inventory, invoices, and offline data in both UI and database access rules.
- [x] Save every sale as an editable invoice with payment state and branch/payment details.
- [x] Finish Sheria/right-side registration and Arabic RTL alignment for dashboard, receipts, and payments.
- [x] Validate signed-in page access, branch management loading, payments, invoice editing, scanner navigation, profile placement, and Arabic RTL.
- [x] Branch walkthrough (TEST Tawi / TEST Tawi 2, Wigan): assign, transfer, deactivate, audit log, staff isolation.
- [x] Real sale receipt flow, profile menu -> notifications, Arabic RTL fixes (bars, switches, admin width, search icons).
- [x] Full audit (owner, customer/Sokoni, admin, global UI/UX) and fixes: branch scoping on quick-sale/debt transactions, quick-sale stock decrement, abandoned-cart dedupe, return stock restore by product id, dead Add User removed, dark-mode nav bars, legacy scanner page removed, typos and Swahili labels.
- [ ] Fingerprint/PIN sign-in on the owner's physical phone (needs the user's device).
- [ ] New business self-signup end to end (needs a real inbox to confirm the email).
- [x] ClickPesa mobile-money flow uses configured credentials and official provider confirmation.
- [x] Admin panel to edit billing_settings prices.
- [x] Server-side purchase verification for product reviews; customer PIN and delivered-order items checked, public inserts cannot claim verification.
- [x] Matawi fee calculator (database-priced preview) + Malipo charges database amount_due
- [x] Wide screens: side sheets dock as a right pane (list stays visible)
- [ ] Complete one live HarakaPay charge (requires the owner to approve the USSD prompt on their physical phone)
- [x] Inline list+detail layout for Bidhaa and Mauzo; docked right panes remain available elsewhere
- [x] Overage pricing: TSh 1,000 per extra product and per extra customer
- [x] Product photo uploads save to the owner's folder and show in Sokoni
- [x] Super-admin price editor (/billing-plans), linked from Matawi
- [x] Sokoni desktop Deals tab: product feed added below banners
- [x] Historical extra staff pricing: TSh 2,000 small / TSh 500 large; superseded by current requested correction above.
- [x] Full phone + computer audit in the test preview; physical-device-only checks remain with the owner
- [x] Sokoni test product photo stored in the owner's folder and linked to the product gallery
- [x] Sokoni cards resolve the real business name through the public storefront view
- [x] Scanner sale, invoice, line items and stock deduction are one atomic database transaction
- [x] Private payment-proof upload and owner-visible payment ledger
- [x] Product-image upload ownership rule requires the authenticated object owner

## Current completion
- [x] Verify 5,000-product threshold and live pricing consistency; public preview, Matawi and admin bills use current rules; branch employees excluded from HQ count.
- [x] Complete customer and Sokoni order desktop list/detail views; verified signed-in with real records.
- [x] Add visual onboarding, real app captures, and a 3.03-second AI clip to Huduma; playback verified.
- [x] Repair staff route, menu and data-loading gaps; fail-closed access tests pass.
- [ ] Signed-in branch-staff end-to-end verification (needs approval to use a specific staff account; current session is system admin).
- [x] Verify centered branch name, adjacent Hai badge, location in settings, spacing and persistent desktop branch list.
- [x] Scanner sale Ttt, TSh 250; ShopWithUs receipt, linked invoice and stock 25→24 verified; current unpaid balance displayed.
- [ ] Physical-phone payment approval, fingerprint and camera scan (owner device required).

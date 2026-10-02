# Project Architecture Rules

- Scope operational records by the active branch in both client queries and database policies, because branch staff must never see or sync another branch's data.
- Persist every completed sale as a linked editable invoice, because receipts, payment state, and post-sale corrections share one durable source.
- Keep transaction documents on the shared BusinessDocument renderer, because receipts and invoices must retain identical visual structure.
- Complete scanner sales through one database transaction that writes the sale, items, invoice, and stock deduction together, because partial sales and oversold stock are unacceptable.
- Compute every owner's bill in the database (`compute_business_billing`, prices in `billing_settings`) and snapshot what was paid into `paid_entitlements` on activation, because charges and entitlements must come from one server-side source the client cannot alter.
- Confirm ClickPesa payments server-side against the provider and the database-calculated amount before activating service, because client totals and unauthenticated callbacks are not proof of payment.
- Show a Lipa Namba QR only from an owner-uploaded official image, because a generated QR cannot actually take payments.
- Keep desktop record pages as a persistent left list and right detail pane, because floating overlays and hover-expanding navigation block work on wide screens.

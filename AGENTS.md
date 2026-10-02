# Project Architecture Rules

- Scope operational records by the active branch in both client queries and database policies, because branch staff must never see or sync another branch's data.
- Persist every completed sale as a linked editable invoice, because receipts, payment state, and post-sale corrections share one durable source.
- Keep transaction documents on the shared BusinessDocument renderer, because receipts and invoices must retain identical visual structure.- Compute every owner's bill in the database (`compute_business_billing`, prices in `billing_settings`) and snapshot what was paid into `paid_entitlements` on activation, because charges and entitlements must come from one server-side source the client cannot alter.
- Show a Lipa Namba QR only from an owner-uploaded official image, because a generated QR cannot actually take payments.

# Project Architecture Rules

- Keep ServiceHUB publicly routable outside operational access gates; validate submissions server-side into a private request table and send through the shared email sender, because guests need support without exposing inquiries or choosing email recipients.
- Manage ServiceHUB inquiries and durable replies through a server-verified super-admin endpoint; email recipients come from stored requests and WhatsApp opening is not proof of sending, because support records and communications require private, accurate tracking.
- Keep branch feature updates in the shared branchFeaturePayload helper, because ordinary identity edits must not submit admin-managed entitlements or fail their database guard.

- Scope operational records by the active branch in both client queries and database policies, because branch staff must never see or sync another branch's data.
- Persist every completed sale as a linked editable invoice, because receipts, payment state, and post-sale corrections share one durable source.
- Keep transaction documents on the shared BusinessDocument renderer, because receipts and invoices must retain identical visual structure.
- Complete scanner sales through one database transaction that writes the sale, items, invoice, and stock deduction together, because partial sales and oversold stock are unacceptable.
- Compute every owner's bill in the database (`compute_business_billing`, prices in `billing_settings`) and snapshot what was paid into `paid_entitlements` on activation, because charges and entitlements must come from one server-side source the client cannot alter.
- Confirm ClickPesa payments server-side against the provider and the database-calculated amount before activating service, because client totals and unauthenticated callbacks are not proof of payment.
- Show a Lipa Namba QR only from an owner-uploaded official image, because a generated QR cannot actually take payments.
- Keep desktop record pages as a persistent left list and right detail pane, because floating overlays and hover-expanding navigation block work on wide screens.
- Resolve staff page access through an explicit fail-closed route registry and wait for branch scope before rendering, because hidden menus alone cannot enforce granted access.
- Keep public instructional media free of customer identifiers and distinguish generated footage from real app captures, because marketing must not expose operational records or misrepresent the interface.

- Expose only public pricing fields through the public pricing RPC and read admin bills from the server, because preview calculators and admin displays must not diverge from actual usage charges.

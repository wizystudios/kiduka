# Project Architecture Rules

- Enrich the single Sonner stream in place with notification details, QR and view links while preserving IDs and original actions, because all toast APIs and legacy callers must remain covered without duplicate messages.
- Resolve client roles exclusively from the protected server role lookup and preserve that role during profile edits, because unavailable lookups and editable metadata must not unlock owner controls.
- Keep practice receipts explicitly marked JARIBIO on a public, database-free route with artificial-only shared payloads, because QR verification must work across tabs without touching operational records.

- Initialize missing owner roles from active, creator-matched business ownership in a database trigger, never user metadata, because new owners must receive the same server-verified staff-management access as existing owners without promoting staff.

- Render the public welcome page directly for first-time visitors; never replace it with automatic onboarding, because instructional media belongs in ServiceHUB rather than blocking entry.

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
- Resolve staff page and action access from the shared permission catalog (fail-closed route registry, in-page checks, and database triggers via assistant_can), and wait for branch scope before rendering, because hidden menus alone cannot enforce granted access; staff, branch and platform management stay owner-only to prevent privilege escalation.
- Keep public instructional media free of customer identifiers and distinguish generated footage from real app captures, because marketing must not expose operational records or misrepresent the interface.
- Use explicit-play, poster-backed ServiceHUB videos and pause sibling players on playback, because speech must remain audible without competing audio or eager media downloads.
- Keep authenticated/cross-origin requests and streaming media outside the service-worker cache, and abort timed-out navigation fetches, because private data and stalled media must not obstruct fresh pages.

- Expose only public pricing fields through the public pricing RPC and read admin bills from the server, because preview calculators and admin displays must not diverge from actual usage charges.
- Mount the sonner Toaster globally in App.tsx, because most pages report errors through sonner and an unmounted toaster silently hides every message.
- Store staff reports with business/branch scope and server-validated review transitions; authors cannot approve their own reports because owner review is a separate authority.
- Keep platform announcements and release choices in authenticated, RLS-protected tables; only server-verified super admins publish messages because browser state is not administrative authority.
- Retire the legacy app-shell worker with a same-path cleanup worker and keep manifest installability and IndexedDB data sync; release acknowledgements do not pin old JavaScript because stale pages must not obstruct customers.
- Derive stock forecasts from actual sale items and persist stock reorder rules; never simulate ordering or claim supplier delivery because no supplier sending integration exists.
- When a super admin selects a business, render the dedicated AdminBusinessWorkspace (its own owner-scoped queries and sections) instead of the system-wide tabs, because global panels filtered after the fact show other businesses' data and irrelevant sections.
- Grant owner to role-less accounts only through the server `claim_owner_role` check (refuses anyone with staff records), because new self-registered owners have no business yet and must not be locked out while staff must never self-promote.
- Gate every edge function that sends messages, emails, reminders or payment prompts through `_shared/caller.ts` (service/admin, own-address, or RLS-visible recipient checks), because public endpoints must not reach arbitrary people.
- Neutralize spreadsheet exports with `src/lib/safeCell.ts`, and publish owner ads only after admin approval (`approved_at`), because user text must not run as formulas and ads must not go live unpaid.
- Send app emails only from per-feature edge functions through `_shared/app-email.ts` (consent check + email_send_log, then the managed send helper); database triggers hand off owner emails via a stored `owner_email_notifications` row id, because the browser and the database must never choose recipients or hold send credentials.
- Record unpaid or partly paid sales as customer debt through the server `record_sale_debt` RPC (creates the customer if needed, updates balance, invoice and ledger), because a completed sale with an unpaid balance must always appear in Madeni.

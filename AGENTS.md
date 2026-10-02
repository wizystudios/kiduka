# Project Architecture Rules

- Scope operational records by the active branch in both client queries and database policies, because branch staff must never see or sync another branch's data.
- Persist every completed sale as a linked editable invoice, because receipts, payment state, and post-sale corrections share one durable source.
- Keep transaction documents on the shared BusinessDocument renderer, because receipts and invoices must retain identical visual structure.
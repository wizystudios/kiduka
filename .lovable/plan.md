# Matawi fee calculator, Malipo wiring, big-screen split layout, full audit

## 1. Branch fees calculator on Matawi
- New "Kikokotoo cha Ada" panel at the top of the Matawi page (same flat home-page style).
- Shows live usage (staff, products, customers, branches) and the monthly charge, using the database bill (`get_my_billing`). The page never calculates prices itself.
- Shows the free tier (2 staff incl. owner, 20 products, 10 customers), the basic plan (TSh 30,000: 5 staff, 100 products, 200 customers), TSh 20,000 per branch (max 3 staff), and extra charges over each limit.
- "What if" sliders let the owner preview the price with more staff, products, customers or branches. A new database preview function returns the price from the same pricing rules.
- A "Lipa sasa" button opens Malipo with the exact amount due.

## 2. Malipo wiring
- Malipo (subscription page) always charges `amount_due` from the database, never a typed or default number.
- Once paid and approved, the paid limits are saved (already built) and the free-plan blocks lift automatically.
- **Blocked:** a real charge needs your payment provider's API key and documentation. Until then the "pay by phone" step stays connected to the current ClickPesa function plus admin approval. The full real-sale-to-payment test runs once you send the key.

## 3. Big-screen split layout (two panes)
Research: large-screen apps (Gmail, Outlook, Shopify admin, Linear, Square dashboard) use a list on the left and details on the right instead of stretching one page across the whole screen.
- On screens 1024px and wider, list pages become **list + details**. Tapping a row opens its details in a right-side pane, and the list stays visible.
- First pages: Bidhaa, Mauzo, Ankara (Invoices), Wateja, Matawi, Arifa (Notifications), Sokoni oda.
- Content gets a max width so forms and receipts stop stretching on wide screens.
- Phones and tablets keep the current full-screen pages and sheets.
- One shared split-view layout that every page reuses.

## 4. Full audit (security + design), Kiduka vs Sokoni
- Security: rerun the security scan and linter, check that every table is limited to its owner, branch or public use as intended, check functions anyone can call, and check storage buckets.
- Design: check Kiduka vs Sokoni for matching colors, rounded corners, empty states, loading states and RTL, then fix mismatches.
- Owner, customer and admin flows: walk them at phone and desktop sizes with screenshots, then fix what breaks.

## 5. Security finding: review replies readable by everyone
Shop replies to product reviews show on public Sokoni pages, so public reading looks intended. Plan: keep public reading but show only replies whose review exists and whose seller is active, and keep writing limited to the shop owner.

## Technical notes
- New SQL function `preview_business_billing(p_staff, p_products, p_customers, p_branches)` reusing `billing_settings` (SECURITY INVOKER, authenticated only).
- New `SplitView` layout component: `lg:grid-cols-[minmax(320px,420px)_1fr]`, with the selected item kept in the URL (`?id=`).
- The roadmap is updated with each item. Real payment charging stays open until the API key arrives.

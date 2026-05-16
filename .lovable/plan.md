
# Mpango wa Kazi — Changamoto za Wateja

Mambo ni mengi, kwa hiyo nitayagawa katika **awamu 4** ambazo nitafanya **sequentially** (moja baada ya nyingine) katika loops zinazofuata. Kila awamu itakuwa na deliverables zinazoonekana mara moja kwenye preview.

---

## Awamu 1 — Bug Fixes & Matawi (Loop 1)

**1.1 Makundi → Ongeza Msaidizi bug**
- Chunguza form ya kuongeza msaidizi kwenye `GroupsPage` / `AssistantHarakaManager` — angalia console + error halisi.
- Hakikisha `assistant_permissions` row inaundwa, password validation inafanya kazi, na owner_id inawekwa sahihi.
- Fix RLS au insert logic kulingana na error.

**1.2 Matawi — Owner anaona kila kitu**
- Ongeza filter ya **"Tawi Lote"** (default) kwenye Dashboard, Mauzo, Ripoti.
- Hakikisha queries za sales/expenses/products zinatumia `owner_id` (sio `branch_id`) kwa owner, ili matokeo yote ya matawi yote yajumuishwe.
- Branch selector dropdown juu ya kila ripoti — owner anaweza kuchagua tawi moja au "Yote".

---

## Awamu 2 — Mauzo Reports + Export (Loop 2)

**2.1 Filters kamili kwenye `UnifiedSalesPage`**
- Pills: Leo · Wiki · Mwezi · Mwaka · **Maalum** (date range picker)
- Specific year/month/week selectors (dropdowns) zinazofungua sub-filters.

**2.2 Total summary cards juu**
- Jumla ya mauzo, idadi ya risiti, faida, mteja mpya — kwa kipindi kilichochaguliwa.

**2.3 Export PDF + CSV**
- Tumia `exportUtils.ts` iliyopo + ongeza PDF (jsPDF) yenye Kiduka branding.
- Button "Pakua Ripoti" → chagua PDF au CSV.

---

## Awamu 3 — Lipa Namba QR System + Risiti (Loops 3–4)

**3.1 Owner Lipa Namba Setup** (mpya)
- Migration: jedwali `owner_payment_numbers` (owner_id, network, lipa_namba, account_name, is_default).
- Settings page mpya: "Lipa Namba Zangu" — owner anachagua mtandao (M-Pesa, Tigo Pesa, Airtel Money, Halopesa, Azampesa) na anaweka namba zake.
- Badge **"MPYA"** kwenye Settings na banner ya tangazo dashboard (kama vile ads zingine zinavyofanya kazi), click → /settings/lipa-namba.

**3.2 QR Generator per customer/debt**
- Tumia `qrcode` npm package (au qrcode.react ipo).
- QR encodes: `kiduka://pay?to=<lipa_namba>&network=<network>&amount=<balance>&ref=<debt_id>&customer=<name>`
- Wakati owner ana-click "Lipa" kwa mdaiwa → dialog inaonyesha QR + namba + maelekezo ya USSD ya mtandao husika.

**3.3 WhatsApp + Email + Auto-clear**
- WhatsApp message ya deni inajumuisha link `/pay/:debtId` yenye QR + Lipa Namba zote.
- Email template `debt-reminder` inaongezewa QR image (data URL) + Lipa Namba.
- Edge function mpya `confirm-debt-payment` (au extend `clickpesa-webhook`) — wakati malipo yanapokelewa au owner anathibitisha manually → `customer_transactions.payment_status='paid'`, `customers.outstanding_balance -= amount`, mteja anatolewa kwenye Wadaiwa.

**3.4 Risiti HTML + QR scannable + SMS/WA**
- `EnhancedReceiptPrinter` itoe HTML kamili (sio plain text) + QR inayoelekeza `/receipt/:saleId` (tayari ipo).
- Vifungo viwili kwenye risiti dialog: **"Tuma WhatsApp"** (wa.me) + **"Tuma SMS"** (edge function `send-sms` iliyopo).
- Input ya namba ya simu ya mteja kabla ya kutuma.

---

## Awamu 4 — Sokoni UI (Loop 5)

**4.1 Hamisha tabs juu**
- "Top Deals · Top Ranking · Bidhaa Mpya" zihame kutoka sehemu zao za sasa na ziwe **horizontal pills** baada ya "Zote" kwenye filter bar ya juu ya `SokoniMarketplace`.
- Ondoa vifungo vya "Zaidi" (kila kategoria inafunguka kama tab kamili).

**4.2 Bottom nav background**
- `SokoniBottomNav` → `bg-white` na border ya juu nyepesi.

---

## Technical Notes

**Migrations zinazohitajika:**
- `owner_payment_numbers` (jedwali jipya + RLS)
- Index kwenye `customer_transactions(owner_id, payment_status)` kwa speed
- Trigger ya kufuta deni auto wakati payment_status inabadilika kuwa 'paid'

**Edge functions:**
- `confirm-debt-payment` (mpya) — manual confirmation + auto-clear
- Extend `send-transactional-email` kuongeza QR image kwenye debt reminder template

**Vifurushi:**
- `qrcode` (kama haipo) au tumia component iliyopo

**Foreseen warnings:** Supabase linter inaweza kutoa warnings za search_path kwenye function mpya — nitarekebisha mara moja.

---

## Mpangilio wa Utekelezaji

| Loop | Awamu | Kile unachoona |
|------|-------|----------------|
| 1 (sasa baada ya approval) | 1.1 + 1.2 | Msaidizi anaongezwa, owner anaona ripoti za matawi yote |
| 2 | 2 | Filters + export PDF/CSV kwenye Mauzo |
| 3 | 3.1 + 3.2 | Lipa Namba setup + QR generator |
| 4 | 3.3 + 3.4 | Auto-clear deni + risiti HTML kwa WA/SMS |
| 5 | 4 | Sokoni nav makeover |

Baada ya kupitisha mpango huu nitaanza **Awamu 1** mara moja.

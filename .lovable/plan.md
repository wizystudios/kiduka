# Mpango wa Kazi — Awamu 5

Kazi yote itafanyika kwa mpangilio huu. Baada ya kila awamu nitakupa update fupi kabla ya kuendelea.

## Awamu 1 — Zana za Super Admin (kipaumbele cha kwanza)

**Lengo:** Admin aweze kutafuta biashara, kuchagua sehemu za kufuta, au kufuta biashara nzima kwa uthibitisho wa kuandika jina halisi.

- **Search box** kwenye `SuperAdminDashboard` (component ya kuchagua biashara) — search kwa: jina la biashara, jina la mmiliki, email, simu. Debounce 300ms (hakuna kitufe).
- **Modal mpya `BusinessDeletionDialog`** ikiwa na sehemu mbili:
  1. **Futa kipande kipande** — checkboxes: Bidhaa, Mauzo, Wateja, Oda za Sokoni, Madeni, Wafanyakazi, Matawi, Ada/Subscription, Logs.
  2. **Futa biashara nzima** — kitufe chekundu kinachofungua hatua ya uthibitisho.
- **Uthibitisho wa kufuta:** Mtumiaji aandike **jina kamili sahihi la biashara** (au la mtumiaji ikiwa anafuta user). Input ikilinganishwa case-insensitive. Hakuna nenosiri tofauti — jina lenyewe ndio nenosiri (ulivyochagua).
- **DB:** RPC mpya `admin_delete_business(business_id, confirmation_name, scope)` — `SECURITY DEFINER`, inathibitisha `super_admin`, inalinganisha jina, kisha inafuta kwa mpangilio sahihi wa FK (sales_items → sales → products → customers → loans → orders → branches → members → business).
- **Audit log:** Kila kitendo cha kufuta kinahifadhiwa kwenye `admin_notifications` na sababu/scope.

## Awamu 2 — Risiti ya Oda (Customer-facing)

**Lengo:** Baada ya checkout au kufuatilia oda, mteja apate risiti inayoweza kupakuliwa/kuchapishwa, ikifungwa na tracking code.

- Ukurasa mpya `/risiti/:trackingCode` (`OrderReceiptPage.tsx`) — unatumia `track_sokoni_order` RPC (inahitaji simu + code) au public view salama.
- Risiti inaonyesha: logo ya Kiduka, jina la duka, code ya SKN, bidhaa, jumla, hali ya malipo, QR code, tarehe.
- Button mbili: **Pakua PDF** (kutumia `jspdf` + `html2canvas` — tayari iko kwenye project? nitakagua), na **Chapisha** (window.print na print-stylesheet).
- Link ya risiti inaongezwa kwenye: ukurasa wa checkout success, `OrderTrackingPage`, na WhatsApp confirmation message.

## Awamu 3 — OrderTracking Manual Refresh + Auto-retry

**Lengo:** Mteja aweze kupata hali mpya bila kuandika tena code/simu.

- **State persistence:** Baada ya search ya kwanza ya mafanikio, hifadhi `{phone, code}` kwenye `sessionStorage` ya tab hiyo.
- **Manual refresh button** (icon ya RotateCw) — inaita RPC tena na badge ya "Imesasishwa sasa hivi".
- **Auto-retry polling:** Polling kila sekunde 30 ikiwa oda iko kwenye hali tendaji (`new`, `confirmed`, `out_for_delivery`). Inasimama ikifika `delivered` au `cancelled`.
- **Exponential backoff** kwa makosa ya mtandao: 5s → 10s → 20s → 60s, max retries 5.
- **Visibility API:** Polling inasimama tab inapokuwa hidden, na kuanza tena ikirudi.

## Awamu 4 — Rate Limit + Lockout kwa `sokoni_verify_pin`

**Tahadhari:** Backend yetu haina primitives za rate limiting bado, kwa hivyo implementation ni ad-hoc kupitia jedwali. Nimethibitisha umeomba waziwazi.

- Jedwali jipya `sokoni_pin_attempts` (phone, attempt_count, last_attempt_at, locked_until). RLS: `false` kwa wote (service role tu).
- Logic ndani ya `sokoni_verify_pin` RPC:
  - Kabla ya kuthibitisha: kagua kama `locked_until > now()` → rudisha `{success: false, error: 'locked', retry_after}`.
  - PIN ikiwa sahihi: futa rekodi ya jaribio.
  - PIN ikiwa mbaya: ongeza `attempt_count`. Baada ya **5 fails ndani ya dakika 15** → lock kwa **dakika 30**.
- Frontend (`SokoniCustomerAuth`) inaonyesha countdown timer ikiwa imefungwa.

## Awamu 5 — Dashibodi ya Takwimu za Mauzo na Bidhaa

**Lengo:** Mmiliki aone afya ya biashara haraka.

- Ukurasa mpya `SalesInventoryAnalyticsPage` (au upanue `SalesAnalyticsPage` iliyopo). Inatumia `business_id` (sio `owner_id`) kupitia hook ya `useBusinessContext`.
- **Chart 1 — Mauzo ya kila siku** (Line chart, siku 30 zilizopita) — Recharts.
- **Chart 2 — Bidhaa bora 10** (Bar chart, idadi + mapato).
- **Widget 3 — Tahadhari za stock ndogo** (orodha ya bidhaa zenye `stock_quantity <= low_stock_threshold`, na CTA ya kwenda kuongeza stock).
- **Realtime refresh** kupitia Supabase Realtime channel kwenye `sales` na `products`.

## Awamu 6 — Uthibitisho wa Business Ownership

Baada ya awamu zote, nitafanya ukaguzi:
- Kuhakikisha queries zote mpya nilizoongeza zinatumia `business_id` (sio `owner_id`).
- Kuongeza `business_id` filter kwenye dashibodi mpya.
- Kukagua kuwa RLS mpya hairuhusu mtumiaji wa biashara A kuona data ya biashara B.

---

## Maelezo ya kiufundi muhimu

- **Migrations:** Awamu 1, 4 zinahitaji migration mpya za DB.
- **Edge functions:** Hakuna edge function mpya — `sokoni_verify_pin` ni RPC ya DB tayari.
- **Files mpya:** ~6 components, 1 page, 2 migrations, 0 edge functions.
- **Files zinazohaririwa:** `SuperAdminDashboard`, `OrderTrackingPage`, `SokoniCustomerAuth`, navigation config.
- **Hakuna mabadiliko ya schema kwa tables zinazomilikiwa na mteja** — backfill ya `business_id` ilikamilika tayari.

## Vitu visivyofanyika

- Sitabadilisha logic ya auth ya watumiaji wa kawaida (signup/login).
- Sitaongeza receipt PDF kwa POS sales za ndani — tu kwa Sokoni orders (ulivyoomba).
- Sitatengeneza dashibodi mpya ya BI nzima — nitapanua `SalesAnalyticsPage` iliyopo kuepuka duplication.

---

**Ukikubali, nitaanza Awamu 1 mara moja na nitakupa update fupi kila awamu inapokamilika.**

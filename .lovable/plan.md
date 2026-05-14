
# Mpango Mkuu — Nurath + Security + Email Notifications

Tutafanya kazi hii kwa awamu tatu mfululizo katika run moja. Kwa sababu emails zinahitaji domain + email infrastructure, nitafungua dialog ya email setup kwanza halafu nitaendelea moja kwa moja na kazi nyingine wakati DNS inaverify.

---

## Awamu 1 — Nurath UX kwa watumiaji wa kawaida

### 1.1 Status Banner (Swahili + English)
Banner mpya juu ya `VoicePOS` itaonyesha sababu rahisi ya kushindwa kujibu:
- Mic blocked → "Ruhusu maikrofoni kwenye kivinjari / Allow microphone access"
- No speech signal → "Sisikii sauti — sema kwa karibu zaidi / I can't hear you — speak closer"
- Network/API issue → "Tatizo la mtandao au seva / Network or server issue"
- All good but waiting → "Niko tayari, sema 'Nurath' / Ready, say 'Nurath'"

Banner inategemea state ya `permissionState`, `lastAudioSignalAtRef`, na `lastApiError`.

### 1.2 "Verify my microphone" one-tap test
Kitufe kipya kidogo ndani ya VoicePOS:
- Inarekodi sample ya sekunde 3
- Inahesabu peak audio level kupitia `AnalyserNode`
- Inarudisha matokeo: "Mic inafanya kazi vizuri (level: NN%)" au "Hakuna sauti imefika"
- Inahifadhi log moja `kind: 'mic-test'` kwenye `nurath_logs`

### 1.3 Configurable auto-reset thresholds
Kuongeza constants kwenye `VoicePOS.tsx`:
```
NURATH_THRESHOLDS = {
  noAudioMs: 12000,           // sekunde 12 bila sauti → reset
  recognitionStaleMs: 20000,  // sekunde 20 bila event → restart
  wakeFailuresBeforeReset: 5, // baada ya 5 wake fails mfululizo
  permissionRecheckMs: 30000, // recheck permission kila sek 30
}
```
`recoverHandsfreeListening` itatumia thresholds hizi badala ya hard-coded values, na ita-recover bila ku-interrupt session ya sasa kama bado iko hai.

---

## Awamu 2 — Super Admin Security & Diagnostics

### 2.1 Server-side guard kwa diagnostics
- Kufunga RLS kali zaidi kwenye `nurath_logs` (tayari iko, tutahakiki SELECT ni `super_admin` only)
- Edge function mpya `nurath-admin-export` inafanya server-side role check kabla ya kurudisha logs/exports. Hata mtu ajaribu kufungua `/diagnostics` URL moja kwa moja, edge function itarejesha 403 isipokuwa ana role `super_admin`
- Component `NurathDiagnosticsPanel` ita-fetch kupitia edge function hii badala ya `supabase.from('nurath_logs').select` ya client-side

### 2.2 Incident Summary (saa 1 iliyopita)
Kitufe kipya "Incident Summary" kwenye `NurathDiagnosticsPanel`:
- Inakusanya logs za saa 1 zilizopita
- Inahesabu: total sessions, total failures, top error types (no-wake, no-speech, no-response, system-error), shops affected (top 10 by failure count)
- Inazalisha PDF kupitia `exportToPDF` na pia inatoa option ya kutuma email kwa super admin (template `nurath-incident-summary`) — itatumia email infra ya Awamu 3

---

## Awamu 3 — Email System (consent-aware)

### 3.1 Email infrastructure
Kwa sababu hakuna domain wala infra bado, nitafungua dialog ya email setup. Baada ya domain kuchaguliwa, nitafanya scaffolding ya transactional emails (`send-transactional-email` + queue) na auth emails kwa branding ya Kiduka.

### 3.2 Consent toggles
**Owner consent** (`profiles.email_notifications_enabled` boolean, default true):
- Sehemu mpya kwenye `Mipangilio (Settings)` → "Arifa za Email"
- Toggles tofauti kwa kila aina: security, business operations, subscription. Owner anaweza kuzima zote au baadhi.

**Customer consent** (`sokoni_customers.email_marketing_consent` + `email_transactional_consent`):
- Checkout form: checkbox "Nakubali kupokea email za order updates" (inayotakiwa kwa transactional)
- Profile page ya customer: toggle ya kuzima/kuwasha

### 3.3 Email templates (Kiduka brand: blue/green/white, logo, footer ya ads/system links)
Templates zote zitakuwa na: header na logo ya Kiduka, content, footer yenye link ya kufungua app + ad slot dynamic kutoka `ads` table, na unsubscribe footer (system-managed).

**Owner emails:**
- `owner-login-alert` — kuingia kwa device mpya
- `owner-settings-changed` — mabadiliko muhimu ya settings
- `owner-subscription-request` — confirmation ya ombi la subscription
- `owner-large-transaction` — muamala mkubwa
- `owner-low-stock` — stock chini
- `owner-new-debt` — deni jipya limeingia
- `owner-new-sokoni-order` — order mpya ya Sokoni

**Customer emails:**
- `customer-order-confirmation` — order imepokelewa
- `customer-order-status` — status update (confirmed/shipped/delivered)
- `customer-order-receipt` — risiti
- `customer-review-thanks` — asante kwa kutoa review
- `customer-return-update` — return request status

### 3.4 Trigger wiring
Kila template itaitwa kupitia `supabase.functions.invoke('send-transactional-email', ...)` kutoka:
- Code ya client (kwa actions kama login, settings change, checkout, review)
- Database webhooks → edge function (kwa events kama large transaction, low stock, new debt, status change)

Kila mahali pa kutuma, code itacheck consent kwanza:
```ts
if (!profile.email_notifications_enabled) return;
if (!profile.email_consent[category]) return;
```

---

## Mpangilio wa kazi

1. **Kwanza:** Fungua email setup dialog (user achague domain)
2. **Wakati DNS inaverify:** Anza Awamu 1 (Nurath UX) na Awamu 2 (admin guard + incident summary UI)
3. **Baada ya domain kuwa tayari:** Setup email infra → scaffold templates → wire triggers → ongeza consent UI

---

## Nini hakitafanyika sasa
- **Marketing emails / newsletters** — hazitaungwa mkono (deliverability rule)
- **Customer activity beyond transactional** — review thanks ni borderline; nitaiweka kama transactional kwa sababu inatokana na action ya mteja
- **Receiving email replies** — emails ni outbound tu

---

Je, niendelee na mpango huu? (Ukikubali nitafungua email setup dialog kwanza halafu nitaendelea moja kwa moja na Nurath na security work.)

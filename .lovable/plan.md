
# Mpango: Mobile QA ya Sauti + Nurath Mpya Kabisa

Hii ni kazi kubwa yenye sehemu mbili kuu: (A) zana za uchunguzi wa sauti ndani ya **Mobile QA**, na (B) kujenga upya **Nurath** kuwa msaidizi kamili wa sauti mwenye avatar.

---

## Sehemu A — Mobile QA: Voice Diagnostics (admin/owner-only kama kawaida)

### A1. Lugha ya Speech Recognition
- Lazimisha `recognition.lang = 'sw-TZ'` kila run (hakuna fallback ya Kiingereza kwenye recognition).
- Onyesha kwenye kila kipande cha timeline lugha iliyotumika + voice ya TTS iliyochaguliwa (jina, lang code).
- Kifungo cha "Test Lugha" Mobile QA → kinaonyesha lugha ya sasa na list ya voices za `sw-*` zilizopo kwenye kifaa.

### A2. Voice Timeline (per-utterance)
Kila muamala wa sauti utahifadhiwa kwenye `voiceTimelineLogger` (in-memory + IndexedDB). Vituo:
- `onstart` — mic imeanza
- `interim` — kila partial transcript + confidence
- `final` — final transcript + confidence
- `wake-match` — neno gani limelingana (`nurath`, `nura`, `nurati`...) na njia (alias/fuzzy/phrase)
- `strip` — transcript baada ya kuondoa wake-word
- `backend-call` — wakati request imetumwa kwenda `voice-pos-assistant`
- `backend-response` — wakati jibu limefika + status
- `tts-start` / `tts-end`
- Latency (ms) kati ya hatua

UI: tab mpya **"Sauti"** ndani ya Mobile QA, expandable rows per utterance.

### A3. Confidence + Interim/Final filter
- Onyesha `confidence` (0–1) na badge `INTERIM` / `FINAL` kwa kila transcript.
- Slider ya minimum confidence (default 0.6) — chini ya hapo zinaonyeshwa kwa rangi nyekundu na hazitumwi kwa AI.

### A4. Timeout + Retry
- Edge function `voice-pos-assistant`: timeout client-side ya **8s**, retry mara **2** na exponential backoff (500ms, 1500ms).
- Sheria zinaonyeshwa kwenye Mobile QA tab Sauti (kisanduku cha "Sheria za Timeout"):
  - Timeout: 8000ms kwa request moja
  - Retries: 2
  - Backoff: 500ms → 1500ms
  - Total max wait: ~11s kabla ya kumwambia mtumiaji "Sina mtandao mzuri"

### A5. Wake-Word Test Screen
- Tab/section "Jaribio la Nurath".
- Button "Anza Kusikiliza" → mic inawaka, inakaa wazi 30s.
- Sema "Nurath" mara kadhaa; kila jaribio linaonyesha:
  - Transcript ghafi
  - Match: ✅/❌
  - Alias/method iliyolingana
  - Confidence
  - Sababu ya kufeli (mfano: "edit-distance > 1", "no token in transcript")
- Counter: detected X / Y attempts.

---

## Sehemu B — Nurath Mpya (Full Voice Agent)

### B1. Avatar
- SVG/PNG ya **mwanamke wa Kiislamu mwenye hijab, akitabasamu**, rangi za brand (blue/green).
- Itazalishwa kwa imagegen (`premium`, transparent PNG).
- Inaonyeshwa: idle (tabasamu), listening (pulse ring), speaking (mouth animation rahisi via CSS).

### B2. Uwezo Mpya wa Nurath (tool-calling)
Nurath atatumia AI gateway na **tool-calling** (Vercel AI SDK style kwenye edge function) ili afanye kazi kweli, sio kujibu tu.

Tools zitakazoongezwa:
1. `search_products(query)` — kutoka catalog ya owner au Sokoni.
2. `add_to_cart(productId, qty)` — anaongeza POS cart au Sokoni cart.
3. `list_cart()` — anasoma cart.
4. `checkout(paymentMethod)` — anakamilisha mauzo.
5. `place_sokoni_order(items, address)` — wateja wa Sokoni.
6. `get_stock(productId)` na `get_sales_today()` — maswali ya owner.
7. `navigate(route)` — anapeleka ukurasa.

Mtiririko wa mfano:
- Mtumiaji: "Nurath, nataka kununua kinywaji"
- Nurath: "Sawa, una chaguo gani — soda, juisi, au maji?"
- Mtumiaji: "Juisi"
- Nurath: anaita `search_products("juisi")` → anaonyesha kwenye skrini + "Nimepata Azam Juisi 500ml kwa TZS 1,500. Niagize?"
- Mtumiaji: "Ndio, agiza"
- Nurath: anaita `add_to_cart` + `place_sokoni_order` → "Order yako imewekwa, namba SKN-XXXX."

### B3. Kiswahili Sanifu Pekee
- System prompt ngumu: Kiswahili sanifu cha Tanzania, hakuna Kiingereza, hakuna kubuni data.
- Kama hakuna data: "Sina taarifa hiyo kwa sasa."
- Speech rate 0.84, voice `sw-TZ` (au best Swahili voice inayopatikana).

### B4. Utambuzi wa "Nurath" Hata Zaidi
- Kuongeza phonetic aliases zaidi: `nooraat`, `nurahh`, `nuraat`, `nurat`, `nurra`.
- Multi-pass: kama interim ina alias yoyote → triggered.
- Visual feedback haraka (avatar inawaka) hata kabla ya final transcript.

### B5. Permissions
- Owner: anaweza kuuliza data ya biashara yake, kufanya mauzo, ku-check stock.
- Customer kwenye Sokoni: anaweza kutafuta, kuongeza cart, ku-place order.
- Assistant: tools chache kulingana na permissions zilizopo.

---

## Faili Zitakazobadilishwa/Kuongezwa

**Mpya:**
- `src/utils/voiceTimelineLogger.ts` — logger maalum ya timeline.
- `src/components/NurathAvatar.tsx` — avatar component.
- `src/assets/nurath-avatar.png` — generated image.
- `src/components/qa/VoiceTimelinePanel.tsx`
- `src/components/qa/WakeWordTestPanel.tsx`

**Kubadilishwa:**
- `src/components/VoicePOS.tsx` — ku-integrate logger, avatar, stricter sw-TZ, expanded aliases.
- `src/utils/voiceAssistantSpeech.ts` — sw-TZ pekee.
- `supabase/functions/voice-pos-assistant/index.ts` — tool-calling, timeout/retry, Kiswahili strict.
- `src/pages/MobileQAPage.tsx` — tabs mpya za Sauti & Wake-Word.

---

## Maswali Kabla Ya Kuanza

1. **Avatar style**: Unataka illustration (cartoon-ish, friendly) au semi-realistic? Nashauri illustration ili ikae vizuri kwenye brand.
2. **Tool-calling scope**: Nianze na tools zote 7 hapo juu, au tuanze na chache (search + add to cart + checkout) kisha tuongeze?
3. **Customer voice kwenye Sokoni**: Iwe enabled kwa wateja wote wa Sokoni au kwa owner pekee mwanzoni?

Kazi hii ni kubwa — nakadiria itahitaji **migration ndogo** (kuhifadhi voice timeline logs) na **deploy ya edge function**. Nikipata majibu ya maswali matatu hapo juu naanza mara moja.

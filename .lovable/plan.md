## Lengo
Hamisha umiliki wa data kutoka kwa **mtu (owner_id = auth user)** kwenda kwa **biashara (business_id)**. Hii itaruhusu:
- Biashara moja kuwa na wamiliki wengi (co-owners), wasaidizi, mameneja wa matawi.
- Data kuendelea kuwepo hata kama mmiliki mmoja ataondoka/akifa.
- Mfumo wa majukumu unaopanuka: Owner, Branch Manager, Cashier, Accountant, n.k.

## Mkakati: Awamu 3 zisizovunja chochote

### Awamu A — Schema mpya (bila kuvunja ya zamani)
1. Unda jedwali jipya `businesses`:
   - `id`, `name`, `tin`, `nida`, `license`, `phone`, `email`, `region`, `district`, `created_at`
2. Unda jedwali `business_members` (M2M users ↔ businesses):
   - `business_id`, `user_id`, `role` (enum: `owner`, `co_owner`, `branch_manager`, `cashier`, `salesperson`, `inventory_officer`, `accountant`, `assistant`)
   - `branch_id` (nullable — kwa wafanyakazi waliopangwa kwenye tawi moja)
   - `is_active`, `joined_at`
3. Unda enum mpya `business_role` na security definer functions:
   - `get_user_business_id(uuid)` → business ya msingi ya mtumiaji
   - `is_business_member(uuid business, uuid user)`
   - `has_business_role(uuid business, uuid user, business_role)`
   - `can_access_business_data(uuid business_id)` — analog ya `can_access_owner_data` lakini kwa business

### Awamu B — Ongeza `business_id` kwenye jedwali zote (nullable mwanzoni)
Jedwali zinazohitaji `business_id`:
`products, sales, sales_items, customers, customer_transactions, expenses, income_records, journal_entries, micro_loans, loan_payments, discounts, coupon_codes, business_ads, business_branches, owner_payment_numbers, marketplace_listings, sokoni_orders, inventory_movements, inventory_snapshots, whatsapp_messages, user_activities, abandoned_carts, business_compliance, business_contracts`.

Backfill script:
- Kwa kila `owner_id` ya kipekee, tengeneza row moja kwenye `businesses` (jina = `profiles.business_name`).
- Tengeneza row kwenye `business_members` (`user_id = owner_id`, `role = 'owner'`).
- Update kila jedwali: `business_id = <new business.id>` kulingana na `owner_id`.
- Kwa wasaidizi waliopo kwenye `assistant_permissions`: tengeneza `business_members` rows na `role = 'assistant'`.

### Awamu C — Hamisha RLS na code
1. Ongeza RLS policies mpya zinazotumia `can_access_business_data(business_id)` **sambamba** na zile za zamani.
2. Update code ya frontend kwa awamu:
   - Tengeneza hook mpya `useBusinessContext()` inayorudisha `business_id` na `role` ya mtumiaji wa sasa.
   - Hatua kwa hatua, badilisha queries kutoka `.eq('owner_id', dataOwnerId)` kwenda `.eq('business_id', businessId)`.
3. Baada ya code yote kuhama: weka `business_id` `NOT NULL`, ondoa RLS za zamani na column `owner_id` (au iache kama audit field).

## Maamuzi yanayohitajika kabla sijaanza

1. **Wigo wa awamu ya kwanza**: Nianze na **Awamu A pekee** (unda `businesses` + `business_members` + backfill, bila kubadilisha RLS au code yoyote ya queries)? Hii ni salama 100% — hakuna kitu kitavunjika, na tutapata msingi wa kujenga juu yake.

2. **Majukumu (roles)**: Nianzishe na seti kamili (`owner`, `co_owner`, `branch_manager`, `cashier`, `salesperson`, `inventory_officer`, `accountant`, `assistant`) au tuanze na `owner`, `manager`, `assistant` tu na tuongeze baadaye?

3. **Biashara nyingi kwa mtumiaji mmoja**: Mtumiaji aweze kuwa member wa biashara zaidi ya moja (mfano: mfanyakazi wa biashara mbili tofauti) au mtu mmoja = biashara moja tu kwa sasa?

## Kwa nini awamu, sio mara moja?
Refactor kamili kwa mara moja ingehitaji kubadilisha ~80+ files, RLS policies zote, na hatari ya kupoteza data ni kubwa sana. Mbinu ya awamu inahakikisha:
- Hakuna downtime.
- Tunaweza ku-rollback awamu yoyote.
- Tunajaribu kila awamu na watumiaji halisi kabla ya kuendelea.

## Pendekezo
Nipe ruhusa nianze na **Awamu A pekee** sasa (migration moja salama). Baada ya kuthibitisha data ime-backfill vizuri, tutaendelea na Awamu B.

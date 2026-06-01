# Mpango wa Kazi

## 1. Rekebisha Admin Password (siyo kuiondoa)
- **Tatizo**: `AdminPasswordDialog.tsx` ina nenosiri lililo hardcoded (`5112Kharif@1`) na halifanyi kazi tena.
- **Suluhisho**:
  - Ondoa hardcoded string. Tumia Supabase RPC mpya `verify_admin_password(p_password)` ambayo huangalia hash iliyohifadhiwa kwenye jedwali jipya `admin_secrets` (super_admin pekee anaweza ku-set).
  - Ikiwa admin (super_admin) hajaweka nenosiri bado, dialog itaonyesha "Weka nenosiri jipya" badala ya kuomba la zamani (first-time setup).
  - Onyesha "Sahau nenosiri?" link inayowezesha super_admin kureset kupitia email OTP.
  - Andika rekodi kwenye `admin_audit_log` kila jaribio (mafanikio/kushindwa) ili kuzuia brute-force (lockout baada ya majaribio 5 kwa dakika 15).
- **Mahali pa kutumia**: Mahali pote ambapo `AdminPasswordDialog` huitwa sasa hivi (kufuta user/biashara, vitendo nyeti vya super-admin).

## 2. Popups zote ziwe Sheet ya kulia (kufanana na Deletion)
- **Lengo**: Kila modal/dialog katika app iwe `Sheet side="right"` badala ya centered `Dialog`.
- **Mtindo wa kawaida**:
  - `w-full sm:max-w-md`, `rounded-l-3xl`, header yenye border, footer yenye action buttons.
- **Files za kubadilisha** (zenye `<Dialog>` au `<AlertDialog>` zinazotumika kama fomu/uthibitisho):
  - `AdminPasswordDialog.tsx`
  - `BusinessDeletionDialog.tsx` (tayari iko sawa)
  - Dialogs nyingine zote zinazotumika ndani ya `src/components/` na `src/pages/` (nitafanya scan na kubadilisha zote zinazotumika kama panel za vitendo). Toast notifications na inline confirmations hazitabadilishwa.
- **Isipokuwa**: Onboarding modal (tayari ni centered backdrop kwa design system) na top alert banners hazibadiliki.

## 3. Maliza kazi zilizosalia (kwa mpangilio)

### 3a. PDF/Printable Receipt (Awamu 2)
- Route mpya `/risiti/:trackingCode` (`ReceiptPrintPage.tsx`) yenye:
  - Layout yenye logo, jina la biashara, items, jumla, QR code ya tracking.
  - Print button (`window.print()`) + "Pakua PDF" button kupitia `html2canvas` + `jspdf`.
- Link kutoka ukurasa wa checkout success na OrderTrackingPage.

### 3b. OrderTrackingPage refresh polish
- Tayari ina auto-refresh; ongeza:
  - Visual countdown ya next refresh (mfano "Inasasishwa kwa 24s").
  - Exponential backoff retry ikiwa fetch inashindwa (1s → 2s → 4s, max 30s) na toast ya kosa baada ya majaribio 3.

### 3c. Super Admin "Logi" tab UI (Awamu 6 sehemu)
- Tab mpya katika `SuperAdminDashboard` "Logi za Biashara":
  - Inaonyesha `business_audit_logs` per biashara iliyochaguliwa.
  - Filters: table_name, action (INSERT/UPDATE/DELETE), date range.
  - Export to CSV button.
- Real-time subscription kwa logs mpya.

### 3d. Per-business view kwa kila tab ya admin (Watumiaji/Usajili/Bidhaa, n.k.)
- Wakati biashara imechaguliwa kwenye Combobox, kila tab ndani ya `SuperAdminDashboard` itaonyesha data ya biashara hiyo tu (sio global).
- Kuwa na toggle "Biashara hii tu / Mfumo mzima" juu ya kila tab.

## Technical Details
- Migration mpya: `admin_secrets(id, password_hash, updated_by, updated_at)`, `admin_password_attempts(id, admin_id, success, attempted_at, ip)`, RPC `verify_admin_password`, `set_admin_password`, `reset_admin_password_request`.
- Bcrypt hashing kupitia `pgcrypto` (`crypt`, `gen_salt('bf')`).
- Dependencies mpya: `jspdf`, `html2canvas` kwa PDF generation.
- Hakuna mabadiliko kwenye RLS za biashara — admin password ni layer ya ziada juu ya super_admin role check.

## Mpangilio wa utekelezaji
1. Migration ya admin_secrets + RPCs
2. Rewrite `AdminPasswordDialog` kuwa Sheet ya kulia + first-time setup flow
3. Convert dialogs nyingine za vitendo kuwa Sheet ya kulia
4. PDF Receipt page + route
5. OrderTracking countdown + backoff
6. Super Admin Logi tab + per-business filtering kwa tabs zote

# NARA AC — ROOT CAUSE INVESTIGATION REPORT (`BUG-01` – `BUG-16` & `BR-16`, `BR-17`, `BR-42`, `BR-47`)

**Project:** NARA AC — Sistem Pengelolaan Jadwal dan Pengingat Service AC (`A26-CS054`)  
**Company Identity:** CV. Nara Teknindotama (NIB: `2805250066735` · AHU: `AHU-0045403-AH.01.14 Tahun 2025` · NPWP: `10.000.000.0-258.288`)  
**Repository:** `https://github.com/KuatRiawan/Nara-AC.Dev.git`  
**Audit Date:** 17 Oktober 2026  

---

## 1. Executive Summary

This report documents the root-cause investigation for all 16 reported defects (`BUG-01` through `BUG-16`), 4 business-rule compliance checks (`BR-16`, `BR-17`, `BR-42`, `BR-47`), and 1 additional schema column bug discovered during deep inspection (`BUG-17` on `technician_availability.teknisi_id`). Each issue was traced to its exact file, function, and line numbers across `frontend/`, `backend/`, `ai-service/`, `data-science/`, and PostgreSQL migrations before applying targeted remediations and cleaning up excessive code comments.

---

## 2. Detailed Root Cause Analysis (`BUG-01` – `BUG-17`)

### `BUG-01` — Gallery Image Preview Opens Out of Position & Scrolls Underlying Page
- **Affected Files:** `frontend/src/components/landing/GallerySection.jsx`
- **Reproduction Steps:** Scroll down to `#galeri` on `LandingPage`, click any documentation photo card, and attempt to scroll or press `Escape`/Arrow keys.
- **Root Cause:**
  1. The lightbox modal was rendered inline inside `<section id="galeri" className="... relative overflow-hidden">` and `<div className="... relative z-10">` rather than via `createPortal(..., document.body)`. Because parent elements created a local stacking context (`z-10`) and Framer Motion cards applied CSS `transform` (`whileInView` / `hover:-translate-y-1`), the modal stacked beneath the sticky navbar (`z-40`) and shifted relative to the section container.
  2. Opening the lightbox did not lock `document.body` scroll (`position: fixed; top: -${scrollY}px`), allowing the background page to scroll while the preview was open.
  3. The image container forced `aspect-[16/10]` without `max-h-[58vh] w-auto object-contain`, and lacked `Escape`/`ArrowLeft`/`ArrowRight` keyboard listeners and focus restoration.
- **Fix Summary:** Rendered the lightbox via `createPortal(..., document.body)` at `z-[100]`, locked and restored `window.scrollY` without jumping the underlying page, preserved natural image aspect ratios (`object-contain`), and added keyboard navigation (`Escape`, `←`, `→`) and focus restoration.

### `BUG-02` — Stiff / Jarring Animation in "Sistem Layanan Terpadu & Transparan"
- **Affected Files:** `frontend/src/components/landing/DigitalExperienceSection.jsx`
- **Reproduction Steps:** Scroll to `#pengalaman-digital` on `LandingPage` and observe or click through Tabs 1, 2, and 3.
- **Root Cause:**
  1. `useReducedMotion()` was not used, so auto-cycling intervals (`3800ms` / `4200ms`) and continuous CSS animations (`animate-bounce` on `<BellRing />`, `animate-ping` on temperature badges, `animate-pulse` on `<Wind />`) ran perpetually even when users hovered over controls or enabled `prefers-reduced-motion`.
  2. Tab panels had different heights without a stabilizing container (`min-h-[520px]`), causing vertical layout shifts every time the user switched tabs.
  3. Tab 3 linked to `/customer/units` instead of the valid route `/customer/ac-units`, and the chat demo modal used a `bg-slate-900` button (`BUG-08`) rendered inside `overflow-hidden` instead of `createPortal`.
- **Fix Summary:** Added `useReducedMotion()`, paused auto-cycling on hover/interaction, replaced jarring springs and continuous bounce/ping effects with smooth `[0.22, 1, 0.36, 1]` transitions, stabilized tab panel height, fixed the `/customer/ac-units` route link, and rendered the chat demo modal via `createPortal`.

### `BUG-03` — Footer Copyright Year and Text Consistency
- **Affected Files:** `frontend/src/hooks/useBusinessProfile.js`, `LandingPage.jsx`, `BookingPage.jsx`, `StatusPage.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `StaffLoginPage.jsx`, `FeedbackPage.jsx`, `TermsConditionsPage.jsx`, `PrivacyPolicyPage.jsx`, `NotFoundPage.jsx`, `CustomerPortal.jsx`, `DashboardLayout.jsx`
- **Reproduction Steps:** Inspect the footer across public pages, legal pages, customer portal, and admin/technician layouts.
- **Root Cause:**
  1. `TermsConditionsPage.jsx` and `PrivacyPolicyPage.jsx` rendered `&copy; {new Date().getFullYear()} CV. Nara Teknindotama (NIB: 2805250066735). Seluruh hak cipta dilindungi.` (adding extra NIB text to the copyright line).
  2. `StatusPage.jsx`, `BookingPage.jsx`, and `DashboardLayout.jsx` either omitted the copyright footer or used dynamic `new Date().getFullYear()` instead of a centralized constant.
- **Fix Summary:** Exported `COPYRIGHT_TEXT = '© 2026 CV. Nara Teknindotama. Seluruh hak cipta dilindungi.'` from `useBusinessProfile.js` and applied the exact string across every public, legal, customer, technician, and admin footer.

### `BUG-04` — Disorganized Timeline Layout on Status Tracking, Landing Page & Technician Detail
- **Affected Files:** `frontend/src/pages/StatusPage.jsx`, `frontend/src/pages/LandingPage.jsx`, `frontend/src/pages/TechnicianJobDetail.jsx`
- **Reproduction Steps:** View `#cara-kerja` on `LandingPage` on mobile/tablet, view a job on `TechnicianJobDetail.jsx`, or view the 5-stage status timeline on `StatusPage.jsx`.
- **Root Cause:**
  1. In `LandingPage.jsx` (`#cara-kerja`), step circles used `absolute lg:left-1/2 lg:-translate-x-1/2 -translate-y-1/2` while cards only had `lg:pt-28`, causing the step circles and "Tahap X" pills to overlap card titles on mobile/tablet (`< lg`).
  2. In `TechnicianJobDetail.jsx`, the progress bar fill had `left-8` (`32px`) and `style={{ width: '100%' }}` when `status === 'done'`, overflowing `32px` past the right border of the card.
  3. In `StatusPage.jsx`, `getStageTimestamps` matched `h.status` without normalizing `'in_progress'` vs `'on process'`, and the 5-step timeline lacked a live technician progress sub-panel showing before/after photo counts, SOP checklist completion, and work notes.
- **Fix Summary:** Refactored `#cara-kerja` cards in `LandingPage.jsx` to place step badges cleanly inside card headers without overlap, wrapped the progress track in `TechnicianJobDetail.jsx` with `overflow-hidden`, and rebuilt the 5-stage timeline + `Riwayat Perubahan Status` + live `Progres Pengerjaan Teknisi` panel in `StatusPage.jsx`.

### `BUG-05` — Add/Edit Service Modal Cut Off by Navbar & Insufficient Validation
- **Affected Files:** `frontend/src/pages/admin/AdminServices.jsx`
- **Reproduction Steps:** Open `/admin/services` and click **Tambah Layanan** or **Edit**.
- **Root Cause:**
  1. The Add/Edit and Delete modals were rendered inline inside `<DashboardLayout>`'s `<main className="overflow-y-auto">` with `z-50`, causing the sticky header and scroll container to clip the top of the modal.
  2. Validation only checked `!nama_layanan || !harga` via a generic toast without field-level error messages, failed to block negative/NaN prices or invalid durations, and omitted inputs for `garansi_hari` (`14/30/45` days) and `interval_maintenance_hari`.
- **Fix Summary:** Rendered both modals via `createPortal(..., document.body)` at `z-[9999]` with viewport centering, added field-level validation (`nama_layanan`, `kategori`, `harga > 0`, `durasi_menit` `15–480`, `garansi_hari` `14/30/45`, `interval_maintenance_hari` `30–365`), and locked body scroll while open.

### `BUG-06` — Operating Hours (`08:00–19:00` WIB) & Slot Duration Validation
- **Affected Files:** `backend/migrations/019_full_audit_remediation.sql`, `backend/src/db/seed.js`, `backend/src/services/bookingService.js`, `backend/src/routes/bookings.js`, `frontend/src/pages/BookingPage.jsx`, `frontend/src/pages/StatusPage.jsx`, `frontend/src/pages/admin/AdminSettings.jsx`, `frontend/src/components/admin/AdminCreateBookingModal.jsx`, `frontend/src/pages/admin/AdminSchedule.jsx`, `frontend/src/pages/admin/AdminBookings.jsx`
- **Reproduction Steps:** Attempt to book a service at `17:00` or `18:00` WIB on `/booking`.
- **Root Cause:**
  1. `DEFAULT_OPS` in `bookingService.js`, `seed.js`, `010_add_settings.sql`, and `AdminSettings.jsx` hardcoded `close: '17:00'` instead of `'19:00'`, preventing `17:00` and `18:00` slots from being generated.
  2. `computeEnd(start, durasiMenit)` rounded durations up to whole hours (`Math.ceil(durasi / 60) * 60`), turning a `90`-minute service (`Cuci Core`) into `120` minutes (`2` hours) and a `105`-minute service into `180` minutes (`3` hours).
  3. `GET /api/v1/bookings/availability` did not accept `durasi_menit` from `BookingPage.jsx`, so multi-item cart durations were not evaluated accurately against the `19:00` closing boundary (`start + duration <= 19:00`).
- **Fix Summary:** Updated operating hours to `08:00–19:00` across migration `019`, `seed.js`, `bookingService.js`, and frontend pages; changed `computeEnd` to exact minute addition (`start + durasiMenit * 60000`); passed `durasi_menit` to `/bookings/availability`; and enforced `start >= 08:00` and `start + duration <= 19:00` with distinct `kode_alasan` (`PAST_TIME`, `OUTSIDE_OPERATING_HOURS`, `DURATION_EXCEEDS_CLOSING`, `FULL_CAPACITY`).

### `BUG-07` — Invoice Visual Design Cluttered / Too Dark
- **Affected Files:** `frontend/src/components/OfficialInvoicePaper.jsx`, `frontend/src/pages/BookingPage.jsx`, `frontend/src/pages/StatusPage.jsx`, `backend/src/routes/bookings.js`
- **Reproduction Steps:** Open E-Invoice modal on `/booking` (after booking) or `/status/:kode`.
- **Root Cause:**
  1. `OfficialInvoicePaper.jsx` used heavy vintage physical-stamp rotations (`-rotate-6`), double-lined borders, dark `bg-slate-900` headers, and cramped table cells.
  2. When viewing an invoice on `/status/:kode`, `StatusPage.jsx` passed masked customer details (`B***`, `0812****8843`, `[Alamat Disamarkan]`) into `OfficialInvoicePaper` even after the customer verified their phone number.
- **Fix Summary:** Redesigned `OfficialInvoicePaper.jsx` into a clean, print-ready modern business invoice with CV. Nara Teknindotama branding, clear Initial (`ESTIMASI AWAL`) vs Final (`INVOICE FINAL`) badges, itemized service/material table, and 10% member service-only discount breakdown; and updated `GET /public/bookings/:kode/invoice` to return unmasked customer details when a valid `kontak` or auth token is supplied.

### `BUG-08` — Color Palette Inconsistency (Midnight / Navy Colors)
- **Affected Files:** `OfficialInvoicePaper.jsx`, `StickyBottomBooking.jsx`, `DigitalExperienceSection.jsx`, `CustomerDashboard.jsx`, `CustomerProfile.jsx`, `TermsConditionsPage.jsx`, `PrivacyPolicyPage.jsx`, `BookingPage.jsx`, `StatusPage.jsx`, `AdminServices.jsx`, `AdminClaims.jsx`, `AdminAnalytics.jsx`, `AdminSettings.jsx`, `AdminTechnicians.jsx`, `AdminACUnits.jsx`, `AdminReports.jsx`, `AdminInventory.jsx`, `AdminCustomers.jsx`, `AdminSchedule.jsx`, `AdminBookings.jsx`, `AdminInvoices.jsx`, `AdminWhatsApp.jsx`
- **Reproduction Steps:** Inspect hero banners, floating docks, member cards, and modal headers across customer and admin views.
- **Root Cause:** Multiple components used `bg-slate-900`, `from-slate-900`, `to-blue-950`, and `bg-slate-950` for primary UI cards, headers, and buttons instead of the NARA AC Trust Blue (`#2563EB` / `#0284C7`) and clean white/slate surface palette.
- **Fix Summary:** Replaced all `slate-900`/`blue-950` card headers, hero banners, floating docks, and primary buttons with cohesive Trust Blue (`bg-blue-600`, `from-blue-700 via-blue-600 to-sky-600`) and light sky/slate surfaces.

### `BUG-09` — Technician Status Updates Not Reflected on Customer Status Tracking
- **Affected Files:** `backend/src/services/bookingService.js`, `frontend/src/pages/StatusPage.jsx`, `frontend/src/pages/BookingPage.jsx`
- **Reproduction Steps:** Have a technician start a job (`on process`), upload before/after photos, check SOP items, or complete the job (`done`), then view `/status/:kode`.
- **Root Cause:**
  1. `publicStatusByCode` in `bookingService.js` did not query `job_checklists`, `job_photos`, or `work_orders`, so the public status payload lacked technician field progress (`progres_teknisi`) and only returned the last 8 status history entries.
  2. `BookingPage.jsx`'s success screen hardcoded a static `"MENUNGGU PENJADWALAN"` badge instead of reading `bookingResult.status` (`TERJADWAL`).
  3. `StatusPage.jsx` polled every 15s and did not refresh immediately on `visibilitychange` or `focus`.
- **Fix Summary:** Enriched `publicStatusByCode` with `progres_teknisi` (`checklist_total`, `checklist_selesai`, `foto_sebelum`, `foto_sesudah`, `diagnosis`, `rekomendasi`, `catatan_teknisi`), full chronological `riwayat_status`, and `whatsapp_invoice_delivery`; added a 10s polling + `focus`/`visibilitychange` listener on `StatusPage.jsx`; and displayed dynamic status badges on `BookingPage.jsx`.

### `BUG-10` — Back Navigation Always Redirects to Landing Page (`/`)
- **Affected Files:** `frontend/src/hooks/useContextualBack.js`, `frontend/src/components/ui/Breadcrumb.jsx`, `BookingPage.jsx`, `StatusPage.jsx`, `LoginPage.jsx`, `RegisterPage.jsx`, `StaffLoginPage.jsx`, `FeedbackPage.jsx`, `TermsConditionsPage.jsx`, `PrivacyPolicyPage.jsx`, `NotFoundPage.jsx`, `TechnicianJobDetail.jsx`
- **Reproduction Steps:** Navigate from Customer Portal (`/customer/dashboard` or `/customer/history`) to `/status/:kode`, `/booking`, or `/feedback/:kode` and click the top-left Back button, or click "Beranda" in Customer Portal breadcrumbs.
- **Root Cause:**
  1. Every public/detail page hardcoded `<Link to="/">` ("Ke Beranda") on its back button instead of checking in-app history (`window.history.state.idx > 0`) or the authenticated user's portal role.
  2. `Breadcrumb.jsx` defaulted `currentRole = 'admin'` and set `homeTo = currentRole === 'admin' ? '/admin' : '/technician'`, causing the "Beranda" breadcrumb link inside `CustomerPortal.jsx` to link to `/admin`!
- **Fix Summary:** Created `useContextualBack(fallbackPath)` hook that navigates back (`navigate(-1)`) when in-app history exists or falls back to the role-appropriate dashboard (`/customer/dashboard`, `/technician/dashboard`, `/admin`, or `/`), wired it across all pages, and fixed `Breadcrumb.jsx` to honor `items[0]?.to` and customer roles.

### `BUG-11` — Incomplete Analytics Dashboard
- **Affected Files:** `data-science/ingest_and_train.py`, `backend/src/services/analyticsService.js`, `frontend/src/pages/admin/AdminAnalytics.jsx`
- **Reproduction Steps:** Open `/admin/analytics` in the Admin Dashboard.
- **Root Cause:** `analyticsService.summary()` and `AdminAnalytics.jsx` did not provide all 5 required analytical categories (`1. Customer transaction analytics`, `2. Most popular services`, `3. Revenue analytics`, `4. Technician workload`, `5. Scheduled bookings`) with date range filtering and governed historical fallback when the local transactional DB has few rows.
- **Fix Summary:** Updated `ingest_and_train.py`, `analyticsService.summary()`, and `AdminAnalytics.jsx` to compute and render all 5 required analytical categories + the 14-day Data Science demand forecast chart with interactive date range filtering (`dari`–`sampai`), empty-state handling, and governed dataset summaries (`545` transactions, `251` RFM customers, `79` B2B projects).

### `BUG-12` — Payment Proof Cannot Be Attached as a Photo File
- **Affected Files:** `backend/src/utils/upload.js`, `backend/src/routes/payments.js`, `backend/src/services/paymentService.js`, `frontend/src/pages/StatusPage.jsx`
- **Reproduction Steps:** Open the payment proof modal on `/status/:kode` and try to upload a transfer receipt photo.
- **Root Cause:** `POST /api/v1/payments/bookings/:id/proof` only accepted JSON `{ bukti_url }` (requiring customers to paste an external image URL) and had no `multipart/form-data` file upload handler.
- **Fix Summary:** Added `receiveOptionalPhoto(['foto_bukti', 'bukti', 'foto', 'file'])` in `backend/src/utils/upload.js` (validating JPG/PNG/WEBP magic bytes up to 5 MB), updated `POST /payments/bookings/:id/proof` and `GET /payments/bookings/:id/proof-file/:name` in `routes/payments.js` and `paymentService.js`, and updated `StatusPage.jsx` with a file picker, live image preview, file validation, and `FormData` upload.

### `BUG-13` — Phone Verification Field Editable When It Should Be Locked
- **Affected Files:** `frontend/src/pages/customer/CustomerProfile.jsx`, `frontend/src/pages/LoginPage.jsx`, `frontend/src/pages/StatusPage.jsx`, `backend/src/routes/customer.js`, `backend/src/services/bookingService.js`, `backend/src/services/paymentService.js`, `backend/src/services/warrantyService.js`
- **Reproduction Steps:**
  1. In `CustomerProfile.jsx` (`/customer/settings`), the verified WhatsApp phone field was directly editable without OTP re-verification.
  2. In `LoginPage.jsx` (Step 2 OTP entry), the phone number was not displayed in a read-only input field.
  3. In `StatusPage.jsx`, once a guest customer verified their phone number for a booking, opening subsequent modals (payment proof, reschedule, cancel, warranty claim) required re-typing or allowed editing the verified phone field, or accepted masked strings (`0812****8843`).
- **Fix Summary:**
  1. Made `#customer-kontak` in `CustomerProfile.jsx` `readOnly` with a "Terverifikasi" badge and added a 2-step "Ubah Nomor" flow (`POST /api/v1/customer/profile/request-phone-change` -> locks target phone in `#readonly-target-phone` while user enters 6-digit OTP in `#phone-change-otp-code` -> `PATCH /api/v1/customer/profile` enforces OTP server-side).
  2. Displayed the target phone number in a locked `readOnly` input during OTP verification in `LoginPage.jsx` with an explicit "Ubah Nomor" button.
  3. Locked the verified phone number as `readOnly` across all `StatusPage.jsx` action modals with an explicit "Ubah Nomor" button, and rejected masked phone strings (`*` or `•`) server-side.

### `BUG-14` — WhatsApp Invoice Button Fails / Lacks Feedback & Guest Verification Support
- **Affected Files:** `backend/src/routes/payments.js`, `backend/src/services/paymentService.js`, `frontend/src/pages/StatusPage.jsx`
- **Reproduction Steps:** Click **Kirim Invoice ke WhatsApp** on `/status/:kode` as a guest who verified their phone number, or click it repeatedly.
- **Root Cause:**
  1. `POST /api/v1/payments/bookings/:id/send-whatsapp` used `authRequired`, rejecting guest customers on `/status/:kode` with `401 Unauthorized` even after they verified their phone number.
  2. Rapidly clicking the button had no duplicate-dispatch cooldown and did not show whether the WhatsApp gateway was in `mock`/`sandbox` mode vs live delivery.
- **Fix Summary:** Updated `POST /payments/bookings/:id/send-whatsapp` to `authOptional`, allowing verified guest customers (via 8+ digit `kontak` verification) as well as authenticated owners/admins; added a 60-second duplicate-send cooldown in `paymentService.js`; and updated `StatusPage.jsx` to show loading/disabled states and clear delivery/sandbox feedback.

### `BUG-15` — Customer Review Not Recognized When Submitting Warranty Claim
- **Affected Files:** `backend/src/services/warrantyService.js`, `backend/src/routes/customer.js`, `frontend/src/pages/StatusPage.jsx`, `frontend/src/pages/customer/CustomerHistory.jsx`
- **Reproduction Steps:** Submit a customer review for a completed booking, then open the **Ajukan Klaim Garansi** modal on `/status/:kode` or `/customer/history`.
- **Root Cause:**
  1. `StatusPage.jsx` always rendered the `Rating` and `Komentar Review` inputs as mandatory fields inside the warranty claim modal regardless of `booking.sudah_feedback`, forcing customers who had already reviewed the service to write a second review.
  2. `getWarrantyInfo` in `warrantyService.js` did not return `has_qualifying_review` or `existing_review`, and `CustomerHistory.jsx` did not check `sudah_feedback` or provide a direct warranty claim modal.
- **Fix Summary:** Implemented all 4 required cases (`Cases A–D` of `BUG-15`):
  - **Case A (No review yet):** Guides the customer to complete Step 1 (Rating + Comment) inline first, then seamlessly advances to Step 2 (Warranty Claim) while preserving their claim draft.
  - **Case B (Review already submitted):** `getWarrantyInfo` and `publicStatusByCode` return `has_qualifying_review: true` / `sudah_feedback: true`; both `StatusPage.jsx` and `CustomerHistory.jsx` display a green "Ulasan Layanan Terverifikasi" badge and skip duplicate review fields (`warrantyService.submitClaim` reuses the stored feedback automatically).
  - **Case C (Review submitted during claim flow):** Immediately updates state in-memory and in PostgreSQL (`feedback` + `konfirmasi_pelanggan = TRUE`) so the claim submits in one continuous flow.
  - **Case D (Ineligible booking):** Displays clear Indonesian explanations when `status !== 'done'`, `warranty_expired`, or `has_active_claim` (`BR-29`).

### `BUG-16` — Warranty Claim Submission Fails End-to-End & Field Mismatches in Admin Claims
- **Affected Files:** `backend/migrations/019_full_audit_remediation.sql`, `backend/src/routes/claims.js`, `backend/src/services/warrantyService.js`, `frontend/src/pages/StatusPage.jsx`, `frontend/src/pages/customer/CustomerHistory.jsx`, `frontend/src/pages/admin/AdminClaims.jsx`
- **Reproduction Steps:** Submit a warranty claim with an optional photo from `/status/:kode` or `/customer/history`, then view `/admin/claims`.
- **Root Cause:**
  1. `POST /api/v1/claims` did not use `receiveOptionalPhoto`, so `multipart/form-data` requests with an attached evidence photo were not parsed, and `warranty_claims` lacked a `foto_bukti_url` column.
  2. `AdminClaims.jsx` read `claim.booking_kode`, `claim.kontak`, `claim.teknisi_nama`, and `claim.alasan`, whereas `warrantyService.listClaims` only returned `kode_booking`, `kontak_customer`, `nama_teknisi_pemeriksa`, and `keluhan`.
- **Fix Summary:** Added `foto_bukti_url` to `warranty_claims` in migration `019`, wired `receiveOptionalPhoto` on `POST /api/v1/claims` and `POST /api/v1/claims/public`, aliased both `keluhan`/`alasan`, `kode_booking`/`booking_kode`, `kontak_customer`/`kontak`, and `teknisi_nama` in `warrantyService.js`, and updated `StatusPage.jsx`, `CustomerHistory.jsx`, and `AdminClaims.jsx`.

### `BUG-17` (Discovered During Audit) — Column Name Mismatch on `technician_availability`
- **Affected Files:** `backend/src/services/bookingService.js`
- **Root Cause:** Migration `006_technician_availability.sql` defines `teknisi_id INT NOT NULL REFERENCES technicians(id)`, but `bookingService.assignTechnician` queried `WHERE technician_id = $1`, causing a PostgreSQL `column "technician_id" does not exist` error when checking technician availability. Furthermore, `activeTechnicianCount` counted all active technicians without subtracting technicians marked `'off'` or `'busy'` on that date.
- **Fix Summary:** Updated `bookingService.js` to query `teknisi_id` on `technician_availability` and subtracted `'off'`/`'busy'` technicians in `activeTechnicianCount(tx, dateStr)`.

---

## 3. Business Rules Verification (`BR-16`, `BR-17`, `BR-42`, `BR-47`)

| Business Rule | Requirement | Verification & Code Location |
| :--- | :--- | :--- |
| **`BR-16`** | Booking confirmation & H-1 reminders via WhatsApp | Verified in `bookingService.js` (`createBooking` queues WhatsApp confirmation & initial invoice) and `reminderService.js` (`sendHMinus1Reminders` includes both `'scheduled'` and `'rescheduled'` bookings). |
| **`BR-17`** | Maintenance schedule calculated per AC unit from completed (`done`) services only; cancelled bookings excluded | Verified in `acUnitService.js` (`getUnitMaintenanceInfo`) and `reminderService.js` (`WHERE b.status = 'done'`, tested in `Scenario F`). |
| **`BR-42`** | Automatic retry for failed WhatsApp invoice deliveries | Verified in `paymentService.js` (`queueAndDispatchWhatsAppInvoice` + `retryFailedWhatsAppInvoices`) and wired into the 15-minute scheduler in `reminderService.js` (tested in `Scenario H & I`). |
| **`BR-47`** | AI WhatsApp assistant must not fabricate booking/payment/warranty confirmations without authoritative DB state | Verified in `chatService.js` and `ai-service/main.py` (confidence-gated intent routing, authoritative DB lookup for booking status/slots, and human handoff via `AdminWhatsApp.jsx`). |

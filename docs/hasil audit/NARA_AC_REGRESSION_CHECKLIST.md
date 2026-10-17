# NARA AC — REGRESSION & ACCEPTANCE VERIFICATION CHECKLIST

**Project:** NARA AC — Sistem Pengelolaan Jadwal dan Pengingat Service AC (`A26-CS054`)  
**Company Identity:** CV. Nara Teknindotama  
**Date:** 17 Oktober 2026  

---

## 1. Mandatory Bug Remediation Checklist (`BUG-01` – `BUG-16`)

- [x] **`BUG-01` (Gallery Image Preview):** Clicking any photo in `#galeri` opens a viewport-centered portal lightbox (`z-[100]`), locks background page scroll without jumping scroll position, preserves image proportions (`object-contain`), and closes cleanly via button, backdrop click, or `Escape` key.
- [x] **`BUG-02` (Digital Experience Animation):** `#pengalaman-digital` uses smooth `[0.22, 1, 0.36, 1]` transitions, pauses auto-advance on hover, respects `prefers-reduced-motion`, prevents vertical layout shifts across Tabs 1–3, and links to `/customer/ac-units`.
- [x] **`BUG-03` (Footer Copyright):** Every footer across public, legal, customer portal, technician, and admin layouts renders the exact text `© 2026 CV. Nara Teknindotama. Seluruh hak cipta dilindungi.`.
- [x] **`BUG-04` (Timeline Layout):** Status tracking timeline (`StatusPage.jsx`), landing page 4-step workflow (`LandingPage.jsx`), and technician progress bar (`TechnicianJobDetail.jsx`) display aligned markers, connectors, and timestamps without text overlap or horizontal overflow on mobile (`375px`), tablet (`768px`), and desktop (`1440px`).
- [x] **`BUG-05` (Admin Service Modal):** Add/Edit Service and Delete Confirmation modals in `AdminServices.jsx` render via `createPortal` above the sticky navbar (`z-[9999]`), enforce field-level validation (`nama_layanan`, `kategori`, `harga > 0`, `durasi_menit`, `garansi_hari` `14/30/45`, `interval_maintenance_hari`), and persist changes to `service_catalog`.
- [x] **`BUG-06` (Operating Hours `08:00–19:00` & Slot Validation):** Operating hours are set to `08:00–19:00` WIB; `18:00` is selectable for 60-minute services (ending at `19:00`) and automatically disabled with `DURATION_EXCEEDS_CLOSING` for `> 60`-minute services (e.g., 90-minute `Cuci Core` ending at `19:30`).
- [x] **`BUG-07` (Invoice Design):** `OfficialInvoicePaper.jsx` renders a clean, print-ready modern business invoice with CV. Nara Teknindotama identity, clear Initial (`ESTIMASI AWAL`) vs Final (`INVOICE FINAL`) status, 10% member service-only discount (`BR-02`/`BR-03`), and unmasked customer details after phone/account verification.
- [x] **`BUG-08` (Trust Blue Color Palette):** Dark midnight/navy card headers, hero banners, and buttons (`slate-900`/`blue-950`) across customer, public, legal, and admin pages have been replaced with Trust Blue (`#2563EB` / `#0284C7`) and clean light surfaces.
- [x] **`BUG-09` (Technician-to-Customer Status Sync):** Technician status transitions (`scheduled` → `on process` → `done`), before/after photo counts, SOP checklist progress, and technician notes synchronize to `GET /api/v1/public/bookings/:kode` and render on `StatusPage.jsx`.
- [x] **`BUG-10` (Contextual Back Navigation):** Back buttons across `BookingPage`, `StatusPage`, `LoginPage`, `RegisterPage`, `StaffLoginPage`, `FeedbackPage`, `TermsConditionsPage`, `PrivacyPolicyPage`, `NotFoundPage`, and `TechnicianJobDetail` use `useContextualBack` to return to the previous page/workflow or role-appropriate dashboard rather than blindly redirecting to `/`.
- [x] **`BUG-11` (Analytics Dashboard):** `AdminAnalytics.jsx` and `GET /api/v1/analytics/summary` provide all 5 required categories (`1. Customer transaction analytics`, `2. Most popular services`, `3. Revenue analytics`, `4. Technician workload`, `5. Scheduled bookings`) plus the 14-day Data Science demand forecast and date range filter.
- [x] **`BUG-12` (Payment Proof Photo Upload):** Customers can attach a JPG, PNG, or WEBP photo file (up to 5 MB) with live preview on `StatusPage.jsx`; backend validates magic bytes, stores the file, and sets `status_verifikasi_pembayaran = 'menunggu_verifikasi'` until Admin verification.
- [x] **`BUG-13` (Phone Verification Lock):** Verified phone numbers are displayed in locked `readOnly` fields (`CustomerProfile.jsx`, `LoginPage.jsx`, `StatusPage.jsx`) with an explicit "Ubah Nomor" flow; OTP code entry uses a separate field; masked phone strings (`*`/`•`) are rejected server-side.
- [x] **`BUG-14` (WhatsApp Invoice Button):** `POST /api/v1/payments/bookings/:id/send-whatsapp` supports both authenticated customers/admins and phone-verified guests on `StatusPage.jsx`, enforces a 60-second duplicate-send cooldown, logs delivery attempts in `whatsapp_invoice_logs`, and queues failed deliveries for automatic retry (`BR-42`).
- [x] **`BUG-15` (Review-to-Warranty Recognition):** Customers who already submitted a review (`sudah_feedback = true` / `has_qualifying_review = true`) are recognized immediately on `StatusPage.jsx` and `CustomerHistory.jsx` without being asked to review again; customers without a review can complete the review inline in Step 1 and proceed directly to Step 2.
- [x] **`BUG-16` (End-to-End Warranty Claim Submission):** Warranty claims submit cleanly via `POST /api/v1/claims` (with optional photo attachment stored in `foto_bukti_url`), enforce at most one active claim per booking (`BR-29`), and appear in `AdminClaims.jsx` with complete customer, booking code, service, and inspection scheduling fields.

---

## 2. Mandatory End-to-End Acceptance Journeys (13 Journeys)

1. [x] **Landing Page:** Open `/` → click gallery images (`BUG-01`) → close preview (scroll position preserved) → inspect `#pengalaman-digital` animation (`BUG-02`) → inspect `#cara-kerja` timeline (`BUG-04`) → inspect footer copyright (`© 2026 CV. Nara Teknindotama. Seluruh hak cipta dilindungi.`, `BUG-03`).
2. [x] **Admin Service Management:** Log in as Admin → open `/admin/services` → open Add Service modal (`BUG-05`, centered above navbar) → validate fields → create service → edit service (`garansi_hari` `14/30/45`) → verify public catalog reflects changes.
3. [x] **Booking Operating Hours (`08:00–19:00` WIB):** Open `/booking` → select date and 60-minute service → verify slots from `08:00` to `18:00` WIB → verify `18:00` is selectable for 60m service (`18:00–19:00`) and rejected with `DURATION_EXCEEDS_CLOSING` for 90m service (`BUG-06`).
4. [x] **Technician to Customer Status Synchronization:** Assign technician → technician starts work (`on process`), uploads before/after photos, completes SOP checklist, and finishes job (`done`) → verify `/status/:kode` displays updated stage, timestamps, and `Progres Pengerjaan Teknisi` (`BUG-04`, `BUG-09`).
5. [x] **Invoice View & Design:** Open initial and final invoices on `/booking` and `/status/:kode` → verify clean print-ready business layout, Trust Blue palette, and accurate 10% member service-only discount (`BUG-07`, `BUG-08`, `BR-02`, `BR-03`).
6. [x] **WhatsApp Invoice Send:** Click **Kirim Invoice ke WhatsApp** on `/status/:kode` → verify loading state, delivery log record, 60-second duplicate-click protection, and automatic retry queue (`BUG-14`, `BR-42`).
7. [x] **Payment Proof Photo Upload:** Open payment proof modal on `/status/:kode` → select JPG/PNG/WEBP photo → preview image → submit → verify status becomes `menunggu_verifikasi` (`pending`) → verify Admin can preview photo and approve/reject (`BUG-12`, `BR-36`).
8. [x] **Phone Verification Lock:** Open verification modal on `/status/:kode`, OTP step on `/login`, or `/customer/settings` → verify phone number is displayed in a `readOnly` field while OTP/verification is active and requires explicit **Ubah Nomor** flow (`BUG-13`).
9. [x] **Review to Warranty Claim Flow:** Complete booking → confirm completion → submit review → open warranty claim modal on `/status/:kode` or `/customer/history` → verify existing review is recognized (`Ulasan Layanan Terverifikasi`) without asking for a duplicate review (`BUG-15`).
10. [x] **Warranty Claim End-to-End:** Submit warranty claim with complaint description and optional photo → verify `201 Created` → verify claim appears in `/admin/claims` → Admin schedules free (`Rp 0`) inspection visit (`BUG-16`, `BR-23`–`BR-32`).
11. [x] **Analytics Dashboard:** Open `/admin/analytics` → verify all 5 analytical categories (`Customer Transactions`, `Popular Services`, `Revenue`, `Technician Workload`, `Scheduled Bookings`) and 14-day DS forecast render with date filtering (`BUG-11`).
12. [x] **Back Navigation:** Navigate across multi-step booking, status tracking, feedback, legal pages, customer portal, and technician job detail → click Back → verify contextual return (`BUG-10`).
13. [x] **Theme / Color Consistency:** Inspect all public, customer, technician, and admin pages → verify cohesive Trust Blue palette with no unintended midnight/navy card headers or buttons (`BUG-08`).

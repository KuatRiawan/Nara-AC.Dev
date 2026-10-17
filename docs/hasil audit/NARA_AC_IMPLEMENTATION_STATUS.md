# NARA AC — IMPLEMENTATION STATUS & PENDING DECISIONS

**Project:** NARA AC — Sistem Pengelolaan Jadwal dan Pengingat Service AC (`A26-CS054`)  
**Legal Entity:** CV. Nara Teknindotama (NIB: `2805250066735` · AHU: `AHU-0045403-AH.01.14 Tahun 2025` · NPWP: `10.000.000.0-258.288`)  
**Date:** 17 Oktober 2026  

---

## 1. Completed & Verified Implementations (`BUG-01` – `BUG-17` & `BR-01` – `BR-47`)

1. **Public Landing Page & Visual Polish (`BUG-01`, `BUG-02`, `BUG-03`, `BUG-04`, `BUG-08`):**
   - Portal-based Gallery Lightbox (`GallerySection.jsx`) with viewport centering, `object-contain` aspect ratio preservation, scroll locking/restoration without page jump, and keyboard navigation (`Escape`, `←`, `→`).
   - Smooth, accessible interactive tabs in `DigitalExperienceSection.jsx` honoring `useReducedMotion()`, stable container height, and fixed `/customer/ac-units` routing.
   - Non-overlapping step cards in `#cara-kerja` (`LandingPage.jsx`), Trust Blue palette across all sections and `StickyBottomBooking.jsx`, and exact copyright text `© 2026 CV. Nara Teknindotama. Seluruh hak cipta dilindungi.` across all 12 footers.
2. **Booking, Operating Hours (`08:00–19:00` WIB) & Slot Engine (`BUG-06`, `BUG-17`, `BR-06` – `BR-16`):**
   - Operating hours updated to `08:00–19:00` WIB across database migration `019_full_audit_remediation.sql`, `seed.js`, `bookingService.js`, `AdminSettings.jsx`, `BookingPage.jsx`, and `StatusPage.jsx`.
   - Exact minute-based end-time calculation (`computeEnd(start, durasiMenit)`) and duration-aware slot availability (`GET /api/v1/bookings/availability?tanggal=...&layanan_id=...&durasi_menit=...`), allowing `18:00` WIB for 60-minute services (`18:00–19:00`) while rejecting `> 60`-minute services at `18:00` with `DURATION_EXCEEDS_CLOSING`.
   - Active technician capacity calculation (`activeTechnicianCount`) subtracts technicians marked `'off'` or `'busy'` in `technician_availability` (fixed column reference `teknisi_id`).
3. **Real-Time Status Tracking, Contextual Navigation & Phone Verification (`BUG-04`, `BUG-09`, `BUG-10`, `BUG-13`):**
   - `GET /api/v1/public/bookings/:kode` returns synchronized `progres_teknisi` (checklist completion, before/after photo counts, technician diagnosis/notes), full chronological `riwayat_status`, and `whatsapp_invoice_delivery`.
   - Role-aware and history-aware back navigation (`useContextualBack.js`) across all public, auth, legal, customer, and technician pages, plus fixed customer home link in `Breadcrumb.jsx`.
   - Locked `readOnly` verified phone fields in `CustomerProfile.jsx`, `LoginPage.jsx`, and `StatusPage.jsx` with an explicit 2-step OTP phone-change flow (`POST /api/v1/customer/profile/request-phone-change` + `PATCH /api/v1/customer/profile`) and server-side rejection of masked phone strings.
4. **Invoices, Photo Payment Proof & WhatsApp Delivery (`BUG-07`, `BUG-12`, `BUG-14`, `BR-34` – `BR-43`):**
   - Clean, print-ready modern business invoice (`OfficialInvoicePaper.jsx`) with Initial (`ESTIMASI AWAL`) vs Final (`INVOICE FINAL`) status, 10% member service-only discount (`BR-02`/`BR-03`), and unmasked customer details upon ownership verification.
   - Multipart photo upload (`JPG`, `PNG`, `WEBP` up to 5 MB with magic-byte validation) on `POST /api/v1/payments/bookings/:id/proof` and authorized file preview on `GET /api/v1/payments/bookings/:id/proof-file/:name`.
   - Guest-verified and authenticated WhatsApp invoice dispatch (`POST /api/v1/payments/bookings/:id/send-whatsapp`) with 60-second cooldown, `whatsapp_invoice_logs` tracking, and automatic background retry (`BR-42`).
5. **Customer Review Recognition & End-to-End Warranty Claims (`BUG-15`, `BUG-16`, `BR-22` – `BR-33`):**
   - All 4 review-to-warranty states (`Cases A–D`) supported on both `StatusPage.jsx` and `CustomerHistory.jsx`: existing reviews (`has_qualifying_review = true`) are recognized automatically without asking the customer to review twice, while unreviewed bookings can submit a review inline in Step 1 and continue directly to Step 2.
   - End-to-end warranty claim submission (`POST /api/v1/claims` and `POST /api/v1/claims/public`) supports optional photo evidence (`foto_bukti_url`), enforces one active claim per booking (`BR-29`), and maps all fields (`booking_kode`, `kontak`, `teknisi_nama`, `alasan`) for `AdminClaims.jsx`.
6. **5-Category Admin Analytics & Governed Data Science Forecast (`BUG-11`, `BR-17`, `BR-47`):**
   - `AdminAnalytics.jsx` and `analyticsService.summary()` provide all 5 required analytical categories (`1. Customer transaction analytics`, `2. Most popular services`, `3. Revenue analytics`, `4. Technician workload`, `5. Scheduled bookings`) plus the 14-day Data Science demand forecast chart with date range filtering.
7. **Codebase Comment Cleanup:**
   - Stripped noisy/excessive comments across 124 JS/JSX files and 10 Python files while preserving 100% syntax, import, and runtime integrity.

---

## 2. Configurable Operational Parameters & Pending Owner Decisions

All operational thresholds remain configurable in `settings` (`AdminSettings.jsx`) without requiring code changes:
- **Operating Hours (`operating_hours`):** `open: '08:00'`, `close: '19:00'`, `days: [1, 2, 3, 4, 5, 6]`, `slot_minutes: 60`, `min_lead_minutes: 60`, `max_advance_days: 60`.
- **Service Catalog (`service_catalog`):** Per-service `harga`, `durasi_menit`, `garansi_hari` (`14`, `30`, or `45` days), and `interval_maintenance_hari` (`60`–`180` days).
- **External Production Credentials:** Live WhatsApp message delivery requires setting `WHATSAPP_MODE=fonnte` (or `meta`) and `WHATSAPP_TOKEN` in `backend/.env`, and running `cd backend && npm run migrate` on the target PostgreSQL database.

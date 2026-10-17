# NARA AC — MASTER VERIFICATION CHECKLIST

**Project:** NARA AC — Sistem Pengelolaan Jadwal dan Pengingat Service AC (`A26-CS054`)  
**Date:** 17 Oktober 2026  

**Status Legend:**
- `[x]` Verified PASS
- `[ ]` Failed or not completed
- `[BLOCKED]` Cannot verify live because of a missing external prerequisite (e.g., live WhatsApp provider token or production PostgreSQL server)
- `[N/A]` Not applicable to the actual implementation

---

## 1. Repository and Architecture
- [x] Complete repository structure inspected (`frontend/`, `backend/`, `ai-service/`, `data-science/`, `design-system/`).
- [x] Authoritative data ownership enforced: PostgreSQL owns transactional state; Backend enforces business rules and permissions; Frontend submits requests and displays server state; AI and DS services do not independently mutate transactional state.
- [x] Zero circular dependencies preventing service startup.
- [x] Accidentally deleted root documentation files (`README.md`, `AI_IMPROVEMENT_DOCUMENTATION.md`) restored and updated.

## 2. Frontend Routes and Functionality
- [x] `/` (`LandingPage.jsx`): Authentic CV. Nara Teknindotama identity, service catalog, 10% member discount transparency, 14/30/45-day warranty info, interactive workflow tabs, authentic reviews, FAQ, and footer legal links.
- [x] `/booking` (`BookingPage.jsx`): 4-step booking flow, AC unit selection, accurate price estimation, member discount on service fees only, slot selection, duplicate submission guard, and payment scheme selection.
- [x] `/status` (`StatusPage.jsx`): Public booking status tracking, 8+ digit phone verification, initial/final invoice summary, payment proof upload, and warranty claim modal.
- [x] `/login`, `/register`, `/forgot-password`, `/reset-password`: Authentication flows and role-based redirects.
- [x] `/customer` (`CustomerDashboard.jsx`): Profile & membership badge, AC unit management, per-unit service history, booking status tracking, reschedule & cancel requests, work completion confirmation, review submission, and warranty claim submission.
- [x] `/admin/*` (`AdminDashboard.jsx` & 14 subviews): AdminHome, AdminBookings, AdminTechnicians, AdminCustomers, AdminUnits, AdminServices, AdminInventory, AdminComplaints, AdminWarrantyClaims, AdminInvoices, AdminFeedback, AdminAnalytics, AdminSettings, and newly mounted `AdminWhatsApp` (`/admin/whatsapp-cs`).
- [x] `/technician` & `/technician/jobs/:id` (`TechnicianDashboard.jsx`, `TechnicianJobDetail.jsx`): Mobile-optimized job list (including `'rescheduled'` and `'delayed'`), status transitions, unique checklist item IDs, before/after photo upload, spare-part selection, and service fee change proposals.
- [x] `/terms-conditions` & `/privacy-policy`: Comprehensive Indonesian legal documents aligned with `BR-01`–`BR-47` and CV. Nara Teknindotama legal identity.

## 3. UI/UX Pro Max and Responsive Behavior
- [x] UI/UX Pro Max design system generated and persisted at `design-system/nara-ac/MASTER.md`.
- [x] Shared UI primitives (`card.jsx`, `button.jsx`, `badge.jsx`, `input.jsx`) export both named and default exports consistently.
- [x] Responsive layouts verified across mobile (`375px`), tablet (`768px`), and desktop (`1440px`) breakpoints with mobile drawer navigation and horizontally scrollable data tables.
- [x] Interactive controls have clear loading, disabled, empty, error, and success states; duplicate DOM IDs in technician checklist resolved.

## 4. Backend APIs and Business Logic
- [x] All 38 backend JavaScript files pass `node --check` static syntax validation.
- [x] API response unwrapping contract (`{ success: true, data: ... }`) synchronized with `frontend/src/api/client.js`.
- [x] Server-side pricing calculation ignores client-supplied totals and enforces catalog prices.
- [x] `GET /api/v1/feedback` returns `nama_pelanggan` and `nama_teknisi` aliases matching `AdminFeedback.jsx`.
- [x] `POST /api/v1/master/catalog` and `PUT /api/v1/master/catalog/:id` normalize `kategori` and persist `garansi_hari` (`14/30/45`) and `interval_maintenance_hari`.

## 5. Database Schema and Migrations
- [x] Migration `019_full_audit_remediation.sql` created and verified compatible with `001_init.sql`–`018_phase4_business_rules_completion.sql`.
- [x] `complaint_tickets.severity` column added with `CHECK (severity IN ('normal', 'urgent', 'severe'))`.
- [x] `service_catalog.garansi_hari` column added with `CHECK (garansi_hari IN (14, 30, 45))`.
- [x] `bookings` table extended with `konfirmasi_pelanggan`, `waktu_konfirmasi_pelanggan`, `biaya_tambahan_jasa`, `catatan_biaya_tambahan_jasa`, `persetujuan_biaya_pelanggan`, `persetujuan_biaya_admin`, and `status_persetujuan_biaya`.
- [x] `whatsapp_webhook_events` table created for idempotent webhook processing.
- [x] Live PostgreSQL migration execution (`npm run migrate`) on production database `[BLOCKED]` (requires external PostgreSQL server instance; all SQL queries and schema contracts verified via transactional mock DB in `e2e_audit_verification.test.js`).

## 6. Authentication and Authorization
- [x] JWT authentication (`authRequired`) and role-based access control (`allowRoles`) enforced server-side.
- [x] Cross-customer IDOR blocked (`403 FORBIDDEN`) on `GET /api/v1/claims/warranty-info/:bookingId` and `POST /api/v1/payments/bookings/:id/send-whatsapp`.
- [x] Public phone verification requires at least 8 digits and matches the last 8 digits of the registered customer phone (`SEC-002`).
- [x] `/api/v1/auth/forgot-password` selects `role, customer_id` before generating reset token.

## 7. Membership and Pricing (`BR-01` – `BR-06`)
- [x] Registered members (`is_member = TRUE`) receive 10% discount on eligible `biaya_jasa` only (`BR-02`).
- [x] Spare parts (`biaya_sparepart`) are strictly excluded from the 10% membership discount across backend and frontend (`BR-03`).
- [x] Service fee changes (`proposeServiceFeeChange` / `approveServiceFeeChange`) require dual approval from both Customer and Admin before updating `biaya_jasa` (`BR-04`).

## 8. Booking and Scheduling (`BR-07` – `BR-16`)
- [x] Bookings auto-confirm (`status = 'scheduled'`) when the requested slot is available (`BR-07`).
- [x] Overlapping technician/slot bookings are rejected (`409 SLOT_CONFLICT`, `BR-08`).
- [x] Customer cancellations within `< 24` hours of appointment are rejected (`422 CANCELLATION_TOO_LATE`, `BR-09`).
- [x] Customer and Admin rescheduling validate slot availability; Admin multi-unit reschedule scales duration by `jumlah_unit * 60` minutes (`BR-10`).
- [x] Manual technician assignment checks `technician_availability` (`off`/`busy`) before assignment (`BR-11`–`BR-12`).
- [x] 48-hour automatic work completion confirmation (`autoConfirmOverdueCompletions`) implemented and wired into scheduler (`BR-14`).

## 9. Technician Workflow (`BR-21` – `BR-22`)
- [x] Enforced status progression (`scheduled`/`rescheduled` → `on_the_way` → `in_progress` → `done`).
- [x] Work report requires before/after photos, checklist completion, work notes, and optional spare parts (`BR-21`).
- [x] Customer reviews (`POST /api/v1/customer/bookings/:id/review`) are blocked until `status = 'done'` AND `konfirmasi_pelanggan = TRUE` (`BR-22`).

## 10. Invoices and Payments (`BR-33` – `BR-42`)
- [x] Initial invoice (`tipe_invoice = 'initial'`) issued at booking; final invoice (`tipe_invoice = 'final'`) calculated upon work completion (`BR-38`).
- [x] Bank transfer proof upload sets `status_verifikasi_pembayaran = 'menunggu_verifikasi'` and does not mark payment as verified until Admin approval (`BR-36`).
- [x] Underpayments tracked as `kurang_bayar` (`nominal_kurang_bayar`); overpayments tracked as `lebih_bayar` with refund workflow (`BR-39`–`BR-40`).
- [x] Failed WhatsApp invoice deliveries queued for automatic retry (`retryFailedWhatsAppInvoices`, `BR-42`).

## 11. Reviews and Warranty (`BR-23` – `BR-32`)
- [x] Warranty duration (`14`, `30`, or `45` days) read dynamically from `service_catalog.garansi_hari` upon job completion (`BR-23`, `BR-24`).
- [x] Warranty claim submission requires customer rating (`1–5`) and comment (`BR-25`).
- [x] Only one active warranty claim (`submitted`, `under_review`, `inspection_scheduled`) allowed per booking (`BR-29`).
- [x] Warranty inspection visits (`scheduleWarrantyInspection`) create a free (`Rp 0`) inspection booking (`BR-28`).
- [x] Rejected warranty claims do not create unauthorized paid charges (`BR-31`).

## 12. Maintenance Reminders (`BR-17` – `BR-20`)
- [x] Per-unit maintenance schedule calculated from `status = 'done'` service history; canceled bookings excluded (`BR-17`).
- [x] Duplicate reminders prevented via `alreadySentReminder` check and `maintenance_reminders_log` (`BR-20`).

## 13. WhatsApp and External Integrations
- [x] Webhook endpoint (`POST /api/v1/whatsapp/webhook`) verifies `X-Hub-Signature-256` / `X-Webhook-Token` (`SEC-004`).
- [x] Duplicate webhook `message_id` deliveries are deduplicated idempotently (`SEC-004`).
- [x] AI chat handoff to human admin (`mode = 'human'`) and release back to AI (`mode = 'ai'`) verified.
- [x] Live external WhatsApp message delivery via Meta Cloud API / Fonnte `[BLOCKED]` (requires production `WHATSAPP_TOKEN` credential; mock mode & retry queue verified).

## 14. AI and Data-Science Pipelines
- [x] AI service (`ai-service/`) trained on 196 Indonesian AC service examples across 20 intents (`intent_model.pkl`) and passes 25/25 unit tests.
- [x] All 4 real datasets (`251` RFM customers, `79` B2B projects, `527` daily time-series rows, `545` service transactions) profiled and cross-checked (`0` orphan keys, `100%` daily revenue match).
- [x] Leak-free time-aware train/test evaluation (`453` train days, `74` held-out test days) and 14-day demand forecast saved to `data-science/output/predictions.json`.

## 15. Dataset Quality and Privacy
- [x] Direct PII (`nama_pelanggan_standar`, `nama_di_sheet_member`, `nama_pelanggan_asli`, `kontak`, `alamat_rumah`) removed/tokenized (`CUST_TOKEN_...`) in `data-science/data/governed/`.
- [x] Raw datasets are not exposed in `frontend/public/` or unauthenticated API endpoints.

## 16. Security Hardening
- [x] Sanitized live API keys and weak secrets in `backend/.env` (`SEC-001`).
- [x] Fixed 1-digit phone suffix authentication bypass (`SEC-002`).
- [x] Fixed cross-customer IDOR on warranty info and WhatsApp invoice trigger (`SEC-003`).
- [x] Added webhook signature verification and duplicate event protection (`SEC-004`).
- [x] Parameterized SQL queries (`$1, $2...`), `helmet` security headers, rate limiting, and file upload MIME/extension validation verified.

## 17. Terms & Conditions and Privacy Policy
- [x] `TermsConditionsPage.jsx` and `PrivacyPolicyPage.jsx` updated with authentic **CV. Nara Teknindotama** legal identity (NIB `2805250066735`, AHU `AHU-0045403-AH.01.14 Tahun 2025`, NPWP `10.000.000.0-258.288`, Ciangsana, Kab. Bogor, `0813-8529-3137`).
- [x] Full coverage of membership discounts, 24h cancellation, 48h auto-confirmation, 14/30/45-day warranty terms, payment verification, WhatsApp consent, AI assistant limitations, and UU PDP data rights.

## 18. Automated Tests
- [x] Backend E2E & Security Verification (`node --test backend/tests/e2e_audit_verification.test.js`): **8/8 suites PASS**.
- [x] AI Service Unit & NLP Verification (`python3 -m unittest discover -s ai-service -p "test_*.py"`): **25/25 tests PASS**.
- [x] Data Science Governed Pipeline Verification (`python3 -m unittest discover -s data-science -p "test_*.py"`): **9/9 tests PASS**.

## 19. Production Build and Deployment Configuration
- [x] Environment templates (`.env.example`) and service start scripts (`package.json`) verified.
- [x] Health check endpoint (`GET /health`) and structured request logging (`requestLogger`) verified.

## 20. Backup, Monitoring, and Recovery Readiness
- [x] PostgreSQL `pg_dump` backup, restore, and migration rollback procedures documented in `NARA_AC_PRODUCTION_READINESS.md` and `README.md`.
- [x] Failed WhatsApp notification retry monitoring and operational exception KPIs available in Admin Dashboard.

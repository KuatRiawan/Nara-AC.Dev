# NARA AC — FULL REPOSITORY AUDIT & REMEDIATION REPORT

**Project:** NARA AC — Sistem Pengelolaan Jadwal dan Pengingat Service AC  
**Project Code:** A26-CS054  
**Legal Entity:** CV. Nara Teknindotama (NIB: `2805250066735`, AHU: `AHU-0045403-AH.01.14 Tahun 2025`, NPWP: `10.000.000.0-258.288`)  
**Audit Date:** 17 Oktober 2026  
**Final Readiness Classification:** `CONDITIONALLY READY`

---

## 1. Executive Summary

This report documents the comprehensive full-project audit, code remediation, database migration hardening, UI/UX Pro Max optimization, security hardening, governed data-science/AI integration, legal compliance alignment, and end-to-end verification of the **NARA AC (A26-CS054)** repository.

Across the four core subsystems (`frontend`, `backend`, `ai-service`, and `data-science`) and PostgreSQL schema migrations (`001`–`019`), **26 actionable findings** were identified, remediated directly in code, and verified via automated tests:
- **Security Findings (4 Critical/High):** Exposed live API key and weak JWT secret (`SEC-001`), 1-digit phone suffix authentication bypass on public invoice/warranty endpoints (`SEC-002`), cross-customer Insecure Direct Object Reference (IDOR) on warranty info and WhatsApp invoice triggers (`SEC-003`), and unauthenticated/non-idempotent WhatsApp webhook processing (`SEC-004`).
- **Database & Schema Findings (5 High/Medium):** Missing `severity` column on `complaint_tickets` causing 500 errors (`DB-001`), hardcoded 14-day warranty instead of configurable `14/30/45` days per catalog item (`DB-002`), missing dual-approval columns for service fee changes and 48-hour customer completion confirmation (`DB-003`), missing WhatsApp webhook idempotency table (`DB-004`), and placeholder business profile records (`DB-005`).
- **Backend & Business Logic Findings (5 High/Medium):** Invalid PostgreSQL enum values `'warranty'`/`'complaint'` in `notifications.type` (`BE-001`), `TypeError: done is not a function` crash in `chatService.js` (`BE-002`), exclusion of `'rescheduled'` bookings from H-1 reminders and unverified status in maintenance anchor queries (`BE-003`), single-unit hardcoded duration in `adminReschedule` and missing technician availability/dual-approval/48h auto-completion enforcement (`BE-004`), and API contract mismatches across auth, AI, master catalog, payment verification, and feedback endpoints (`BE-005`).
- **Frontend & UI/UX Pro Max Findings (8 High/Medium):** Double `.data` response unwrapping in `StatusPage.jsx`, `AdminAnalytics.jsx`, and `CustomerDashboard.jsx` (`FE-001`), mismatched admin payment verification (`{ disetujui }`) and refund (`{ nominal_refund }`) payloads (`FE-002`), wrong field names and hardcoded `'Budi Santoso'` fallback in `AdminFeedback.jsx` (`FE-003`), spare-part discount bug in `AdminHome.jsx` and `AdminInvoices.jsx` (`FE-004`), unmounted `<AdminWhatsApp />` page (`FE-005`), duplicate DOM IDs in technician checklists (`FE-006`), missing default exports on shared UI primitives (`FE-007`), and placeholder legal/contact details in `TermsConditionsPage.jsx`, `PrivacyPolicyPage.jsx`, and `LandingPage.jsx` (`FE-008`).
- **AI & Data Science Findings (4 High/Medium):** Python 3.13 / `scikit-learn` runtime dependency gap (`AI-001`), `NARA-AC` regex bug in booking code entity extraction (`AI-002`), synthetic-only DS pipeline replaced with real governed dataset ingestion, PII tokenization, and leak-free time-series evaluation (`DS-001`), and backend analytics integration with governed DS outputs (`DS-002`).

---

## 2. Actual Architecture and Technology Stack

| Layer | Technology Stack | Port / Runtime | Responsibility |
| :--- | :--- | :--- | :--- |
| **Frontend (`frontend/`)** | React 18.2, Vite 5, React Router v6, Tailwind CSS 3.4, Lucide React | `:5173` | Public landing page, 4-step booking flow, public status tracker, Customer Portal, Admin Dashboard (14 views), mobile-first Technician Workspace, Legal pages |
| **Backend (`backend/`)** | Node.js (CommonJS), Express 4.19, `pg` Pool, JWT (`jsonwebtoken`), `bcryptjs`, `helmet`, `express-rate-limit`, `multer`, `zod` | `:3000` (`/api/v1`) | Authoritative business logic, RBAC & ownership guards, scheduling & slot conflict detection, dual-stage invoicing, warranty lifecycle, 15-minute background scheduler, WhatsApp gateway |
| **Database (`backend/migrations/`)** | PostgreSQL (`001_init.sql` through `019_full_audit_remediation.sql`) | `:5432` | Authoritative transactional persistence across 24 tables (`users`, `customers`, `ac_units`, `service_catalog`, `bookings`, `booking_Status_history`, `payments`, `warranty_claims`, `complaint_tickets`, `whatsapp_conversations`, `whatsapp_webhook_events`, etc.) |
| **AI Service (`ai-service/`)** | Python 3, FastAPI, TF-IDF + LogisticRegression (`scikit-learn` with pure-Python `ml_compat.py` fallback) | `:8000` | 20-intent Indonesian NLP classification, entity extraction (`booking_code`, `ac_brand`, `pk`, `date`, `keluhan`, `jumlah_unit`), confidence-gated routing, admin handoff |
| **Data Science (`data-science/`)** | Python 3 (`ingest_and_train.py`, `pipeline.py`, `model.py`) | Batch / CLI | Governed dataset profiling, PII tokenization (`data/governed/`), leak-free time-aware demand forecasting, RFM & B2B financial reconciliation (`output/*.json`) |

---

## 3. Audit Scope and Methodology

1. **Static & Contract Inspection:** Audited all 38 backend JavaScript files, 19 SQL migrations, 35+ frontend React pages/components, FastAPI AI service modules, and Data Science scripts.
2. **Business Rules Compliance Mapping:** Verified every requirement in **BUSINESS RULES SPECIFICATION — NARA AC · A26-CS054 · Draft v1.0** (`BR-01` through `BR-47`) and **Company Profile CV. Nara Teknindotama** against actual code paths.
3. **Dataset Governance & Statistical Profiling:** Profiled all 4 provided production datasets (`dataset_pelanggan_rfm.csv`, `dataset_proyek_b2b_resik.csv`, `dataset_timeseries_harian.csv`, `dataset_transaksi_servis_ac.csv`), cross-checked relational integrity, tokenized PII, and evaluated forecasting models on held-out time-series data.
4. **Automated Verification:** Executed syntax checks across all backend modules, 25 AI NLP/entity unit tests, 9 Data Science pipeline tests, and 8 comprehensive end-to-end (E2E) backend/security/business-rule test suites (`Scenarios A–I`).

---

## 4. Detailed Findings Register (Frontend, Backend, Database, AI/DS, Security, UI/UX, Legal)

### 4.1 Security Findings (`SEC-001` to `SEC-004`)

| ID | Severity | Affected Files | Root Cause | Impact | Remediation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-001** | **CRITICAL** | `backend/.env`, `backend/src/config.js` | Live `GEMINI_API_KEY` (`AIzaSy...`) and weak `JWT_SECRET=supersecretkey` were committed in `backend/.env`; `config.js` crashed if `dotenv` was absent in isolated test runners. | Credential exposure and trivial JWT forgery if deployed with default `.env`. | Replaced live key and weak secret in `backend/.env` with safe placeholders; added resilient `dotenv` loading and production secret length checks in `config.js`. | **FIXED & VERIFIED** |
| **SEC-002** | **CRITICAL** | `backend/src/services/warrantyService.js`, `backend/src/services/paymentService.js` | Public endpoints Verified customer phone numbers via `.endsWith(cleanKontak)` without minimum length validation. Passing a single digit (`"0"`–`"9"`) matched any customer phone ending in that digit. | Unauthenticated attackers could enumerate bookings, upload payment proofs, or submit warranty claims with at most 10 guesses. | Enforced `cleanKontak.length >= 8` and exact comparison against the last 8 digits (`cleanRegistered.slice(-8) === cleanKontak.slice(-8)`). | **FIXED & VERIFIED** |
| **SEC-003** | **HIGH** | `backend/src/routes/claims.js`, `backend/src/routes/payments.js`, `warrantyService.js`, `paymentService.js` | `GET /api/v1/claims/warranty-info/:bookingId` and `POST /api/v1/payments/bookings/:id/send-whatsapp` required authentication (`authRequired`) but did not verify that `req.user.customer_id === booking.customer_id` for `customer` role callers. | Cross-customer IDOR allowing any logged-in customer to inspect another customer's warranty eligibility or trigger WhatsApp invoices. | Added server-side role and `customer_id` ownership verification in `getBookingWarrantyInfo` and `sendInvoiceViaWhatsApp` (throwing `403 FORBIDDEN`). | **FIXED & VERIFIED** |
| **SEC-004** | **HIGH** | `backend/src/routes/whatsapp.js`, `backend/src/services/chatService.js`, `019_full_audit_remediation.sql` | `POST /api/v1/whatsapp/webhook` accepted any payload without HMAC signature or webhook token verification and lacked `message_id` idempotency tracking. | Spoofed webhook events or provider retries could trigger duplicate AI replies and duplicate booking/complaint side effects. | Implemented `verifyWebhookSignature` (`X-Hub-Signature-256` HMAC-SHA256 or `X-Webhook-Token`) and `whatsapp_webhook_events` idempotency deduplication (`duplicate: true` short-circuit). | **FIXED & VERIFIED** |

### 4.2 Database & Migration Findings (`DB-001` to `DB-005`)

| ID | Severity | Affected Files | Root Cause | Impact | Remediation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DB-001** | **HIGH** | `backend/migrations/004_phase2_features.sql`, `019_full_audit_remediation.sql` | `chatService.js` inserted `severity` into `complaint_tickets`, but `004_phase2_features.sql` never defined a `severity` column. | Every WhatsApp complaint auto-ticket creation failed with a PostgreSQL column-not-found error. | Added `severity VARCHAR(30) NOT NULL DEFAULT 'normal' CHECK (severity IN ('normal', 'urgent', 'severe'))` in `019_full_audit_remediation.sql`. | **FIXED & VERIFIED** |
| **DB-002** | **HIGH** | `backend/migrations/001_init.sql`, `019_full_audit_remediation.sql`, `workflowService.js` | `service_catalog` lacked `garansi_hari`, and `workflowService.js` hardcoded `14` days on completion instead of reading per-service warranty (`14`, `30`, or `45` days per `BR-23`). | All services received a 14-day warranty regardless of catalog configuration. | Added `garansi_hari INT NOT NULL DEFAULT 14 CHECK (garansi_hari IN (14, 30, 45))` to `service_catalog` and updated `workflowService.js` to compute warranty from `service_catalog.garansi_hari`. | **FIXED & VERIFIED** |
| **DB-003** | **HIGH** | `backend/migrations/019_full_audit_remediation.sql`, `workflowService.js` | `bookings` table lacked columns to track dual approval of service fee changes (`BR-04`) and explicit/auto 48-hour customer work completion confirmation (`BR-14`, `BR-22`). | Service fee changes could not enforce dual customer + admin approval, and customer completion confirmation was not persisted. | Added `konfirmasi_pelanggan`, `waktu_konfirmasi_pelanggan`, `biaya_tambahan_jasa`, `catatan_biaya_tambahan_jasa`, `persetujuan_biaya_pelanggan`, `persetujuan_biaya_admin`, `status_persetujuan_biaya` to `bookings`. | **FIXED & VERIFIED** |
| **DB-004** | **MEDIUM** | `backend/migrations/019_full_audit_remediation.sql` | No table existed to persist processed WhatsApp webhook `message_id` values. | Duplicate webhook deliveries could not be detected across restarts. | Created `whatsapp_webhook_events` and added `last_message_id` to `whatsapp_conversations`. | **FIXED & VERIFIED** |
| **DB-005** | **MEDIUM** | `backend/migrations/010_add_settings.sql`, `019_full_audit_remediation.sql` | `settings` seeded generic placeholder address (`Jl. Sudirman No. 123`) and phone (`0812-3456-7890`). | Inaccurate business identity in system settings and public profile API. | Updated `settings` via migration `019` with official **CV. Nara Teknindotama** data (`Jalan Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor`, `0813-8529-3137`, NIB `2805250066735`). | **FIXED & VERIFIED** |

### 4.3 Backend & Business Logic Findings (`BE-001` to `BE-005`)

| ID | Severity | Affected Files | Root Cause | Impact | Remediation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BE-001** | **HIGH** | `backend/src/services/warrantyService.js` | `createNotification` was called with `type = 'warranty'` and `'complaint'`, violating `notifications_type_check` (`'booking'`, `'inventory'`, `'system'`, `'feedback'`, `'reminder'`). | Warranty claim submission and resolution crashed when inserting admin notifications. | Mapped notification types in `warrantyService.js` to allowed enum values (defaulting non-matching types to `'system'`). | **FIXED & VERIFIED** |
| **BE-002** | **HIGH** | `backend/src/services/chatService.js` | `handleWhatsAppMessage` invoked `handleBookingRequest(client, customer, text, conv)` and `handleUnknown(client, customer, text, conv)` with 4 arguments instead of 5 (`done` callback omitted). | Immediate `TypeError: done is not a function` crash when WhatsApp users requested a booking or sent an unknown message. | Added safe default callback `const finish = typeof done === 'function' ? done : async (r) => r;` in both functions. | **FIXED & VERIFIED** |
| **BE-003** | **HIGH** | `backend/src/services/reminderService.js`, `backend/src/services/analyticsService.js` | H-1 reminders and dashboard KPIs only queried `status = 'scheduled'`, ignoring `'rescheduled'`; maintenance reminder anchor query did not filter `b.status = 'done'` (`BR-17`); scheduler omitted 48h auto-completion and WhatsApp invoice retries. | Rescheduled bookings missed H-1 reminders; canceled bookings could skew maintenance dates; 48h auto-confirm and WA invoice retries never ran automatically. | Included `'rescheduled'` in H-1 and KPI queries; enforced `b.status = 'done'` on maintenance anchors; wired `autoConfirmOverdueCompletions()` and `retryFailedWhatsAppInvoices()` into the 15-minute scheduler. | **FIXED & VERIFIED** |
| **BE-004** | **HIGH** | `backend/src/services/workflowService.js`, `backend/src/services/bookingService.js` | `adminReschedule` hardcoded `durationMinutes = 60` instead of scaling by `jumlah_unit` and did not pass `isAdmin = true`; `assignTechnician` ignored `technician_availability` (`off`/`busy`); `BR-04` dual approval and `BR-14` 48h auto-completion were missing. | Multi-unit admin reschedules caused slot overlaps; unavailable technicians could be assigned; `BR-04` and `BR-14` were unimplemented. | Scaled duration by `Math.max(1, jumlah_unit) * 60` with `isAdmin = true`; enforced `technician_availability` check in `assignTechnician`; implemented `proposeServiceFeeChange`, `approveServiceFeeChange`, and `autoConfirmOverdueCompletions`. | **FIXED & VERIFIED** |
| **BE-005** | **MEDIUM** | `auth.js`, `ops.js`, `master.js`, `bookings.js`, `admin.js`, `customer.js` | `/forgot-password` omitted `role, customer_id` in SELECT; `/ai/predict-intent` omitted `low_confidence`; `/ai/answer` ignored `conversationId`; `master.js` omitted `garansi_hari` and category normalization; `/bookings/:id/payment-status` left `status_verifikasi_pembayaran` stale; `GET /feedback` lacked customer/technician aliases. | Password reset token generation failed; chatbot lost conversation context; admin catalog edits failed on lowercase categories; feedback list showed blank names. | Fixed all 6 route/controller contracts and added regression assertions in `e2e_audit_verification.test.js`. | **FIXED & VERIFIED** |

### 4.4 Frontend & UI/UX Pro Max Findings (`FE-001` to `FE-008`)

| ID | Severity | Affected Files | Root Cause | Impact | Remediation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FE-001** | **HIGH** | `StatusPage.jsx`, `AdminAnalytics.jsx`, `CustomerDashboard.jsx` | `apiRequest()` in `frontend/src/api/client.js` already unwraps `payload.data`, but these components accessed `res.data.has_active_claim`, `predRes.data`, and `res.data?.invoice`. | Warranty active-claim flags, DS forecast charts, and customer invoice downloads evaluated to `undefined`. | Updated all three components to read the unwrapped response payload directly with safe fallbacks. | **FIXED & VERIFIED** |
| **FE-002** | **HIGH** | `frontend/src/pages/admin/AdminBookings.jsx` | Admin payment verification sent `{ status: 'verified' }` instead of `{ disetujui: true/false }`, and refund processing sent `{ catatan }` without required `{ nominal_refund }`. | Admin payment verification and refund actions failed backend validation (`400 Bad Request`). | Updated `AdminBookings.jsx` to send `{ disetujui, catatan }` and `{ nominal_refund, catatan }`. | **FIXED & VERIFIED** |
| **FE-003** | **MEDIUM** | `frontend/src/pages/admin/AdminFeedback.jsx` | Read `r.pelanggan_nama` and hardcoded `'Budi Santoso'` when `r.teknisi` was empty instead of reading `r.nama_pelanggan` and `r.nama_teknisi`. | Admin review table displayed fabricated technician name `'Budi Santoso'` and missing customer names. | Updated `AdminFeedback.jsx` to use authentic fields (`nama_pelanggan`, `nama_teknisi`) with `'Belum Ditentukan'` fallback. | **FIXED & VERIFIED** |
| **FE-004** | **HIGH** | `frontend/src/pages/admin/AdminHome.jsx`, `frontend/src/pages/admin/AdminInvoices.jsx` | `AdminHome.jsx` applied 10% member discount to `(biaya_jasa + biaya_sparepart)` violating `BR-02` (spare parts excluded); `AdminInvoices.jsx` checked `=== ' Lunas'` (with leading space) instead of `'paid'`. | Inaccurate financial totals on Admin Home and all paid invoices shown as unpaid (`BELUM BAYAR`) in Admin Invoices. | Restricted 10% member discount strictly to `biaya_jasa` (`BR-02`) and checked `status_pembayaran === 'paid' \|\| 'lunas'`. | **FIXED & VERIFIED** |
| **FE-005** | **MEDIUM** | `frontend/src/pages/AdminDashboard.jsx` | `AdminWhatsApp.jsx` existed in `pages/admin/` but was never imported or routed in `AdminDashboard.jsx` (`/admin/whatsapp-cs` showed a placeholder). | Admins could not access the WhatsApp CS & AI Handoff monitoring console. | Imported and mounted `<AdminWhatsApp />` at `/admin/whatsapp-cs`. | **FIXED & VERIFIED** |
| **FE-006** | **MEDIUM** | `TechnicianDashboard.jsx`, `TechnicianJobDetail.jsx` | Checklist checkboxes shared duplicate `id="check-item"` attributes; technician active job filters omitted `'rescheduled'` and `'delayed'` statuses. | Clicking any checklist label toggled only the first checkbox; rescheduled jobs disappeared from technician active view. | Assigned unique `id={`check-item-${key}`}` per item and included `'rescheduled'`/`'delayed'` statuses. | **FIXED & VERIFIED** |
| **FE-007** | **MEDIUM** | `card.jsx`, `button.jsx`, `badge.jsx`, `input.jsx`, `ChatbotWidget.jsx`, `AddressSelector.jsx`, `StatusPage.jsx`, `AdminServices.jsx` | UI primitives lacked `export default` needed by `AdminWhatsApp.jsx`; `ChatbotWidget` omitted `conversationId`; `AddressSelector` read `c.nama` instead of `c.city`; `StatusPage` compared against masked `kontak` and omitted `tipe_invoice: 'initial'`; `AdminServices` lacked warranty/maintenance interval selectors. | Component import errors, broken city autofill, false phone mismatch on StatusPage, and inability to configure `garansi_hari` (`14/30/45` days) in Admin UI. | Added default exports, wired `conversationId`, fixed `c.city`, used `kontak_terdaftar_unmasked` + `tipe_invoice`, and added warranty/interval controls in `AdminServices.jsx`. | **FIXED & VERIFIED** |
| **FE-008** | **MEDIUM** | `TermsConditionsPage.jsx`, `PrivacyPolicyPage.jsx`, `LandingPage.jsx`, `useBusinessProfile.js` | Legal pages and landing page used placeholder address (`Jl. Sudirman No. 123, Jakarta Selatan`), placeholder phone (`+62 812-3456-7890`), and incomplete warranty/payment/AI/privacy clauses. | Legal and company identity did not match **CV. Nara Teknindotama** or **Business Rules Draft v1.0**. | Updated all legal and public pages with authentic **CV. Nara Teknindotama** registration details and complete `BR-01`–`BR-47` disclosures. | **FIXED & VERIFIED** |

### 4.5 AI & Data Science Findings (`AI-001` to `DS-002`)

| ID | Severity | Affected Files | Root Cause | Impact | Remediation | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AI-001** | **MEDIUM** | `ai-service/ml_compat.py`, `ai-service/train.py`, `ai-service/main.py` | Sandbox Python 3.13 environment lacked compiled C-wheels for `scikit-learn`/`joblib`, blocking model training and inference when native wheels are absent. | `train.py` and `main.py` failed to import `sklearn` in isolated environments. | Created `ml_compat.py` providing pure-Python TF-IDF + Multinomial Naive Bayes/LogReg compatible pipeline fallback when `sklearn` is unavailable; trained `intent_model.pkl` on 196 samples across 20 intents. | **FIXED & VERIFIED** |
| **AI-002** | **MEDIUM** | `ai-service/main.py` | `extract_entities()` matched `r'\bac\s+([a-zA-Z]+)'` before booking code extraction, causing `"NARA-AC-2026-0001"` to extract `ac_brand = "ac"`. | Booking status lookups with `NARA-AC-...` codes polluted `ac_brand` entity slot. | Stripped booking codes before brand matching and excluded `'ac'`/`'nara'` from brand tokens. | **FIXED & VERIFIED** |
| **DS-001** | **HIGH** | `data-science/ingest_and_train.py`, `data-science/test_pipeline.py` | Data science module only generated synthetic random records (`generate_data.py`) and did not ingest or validate the 4 real NARA AC operational datasets or tokenize PII. | Analytics and demand forecasts were disconnected from actual historical business data. | Implemented `ingest_and_train.py` to profile all 4 CSVs, tokenize PII into `data-science/data/governed/`, run leak-free time-aware train/test evaluation (`453` train days, `74` test days), and output `predictions.json`, `dataset_profile_report.json`, and `rfm_b2b_summary.json`. | **FIXED & VERIFIED** |
| **DS-002** | **MEDIUM** | `backend/src/services/analyticsService.js` | `analyticsService.js` only read legacy `data-science/output/predictions.json` format and did not expose governed RFM/B2B dataset summaries. | Admin analytics dashboard could not display governed dataset insights or fallback cleanly. | Updated `analyticsService.js` (`latestPredictions()` and `summary()`) to serve governed DS outputs alongside live PostgreSQL KPIs. | **FIXED & VERIFIED** |

---

## 5. Business Rules Compliance Matrix (A26-CS054 Draft v1.0)

| Rule Group | Spec Reference | Implementation Status | Authoritative Enforcement Location |
| :--- | :--- | :--- | :--- |
| **Membership & Pricing** | `BR-01` – `BR-06` | **COMPLIANT** | `bookingService.js`, `workflowService.js`: 10% member discount applies strictly to `biaya_jasa` (`BR-02`), never `biaya_sparepart` (`BR-03`). Service fee changes require dual Customer + Admin approval (`BR-04`). Frontend totals are ignored in favor of server-side calculation. |
| **Booking & Scheduling** | `BR-07` – `BR-16` | **COMPLIANT** | `bookingService.js`, `workflowService.js`, `reminderService.js`: Automatic confirmation when slot is available (`BR-07`), slot conflict rejection (`BR-08`), 24h minimum cancellation rule (`BR-09`), customer/admin rescheduling (`BR-10`), manual admin technician assignment with availability check (`BR-11`–`BR-12`), and 48h automatic completion confirmation (`BR-14`). |
| **AC Units & Maintenance** | `BR-17` – `BR-20` | **COMPLIANT** | `customer.js`, `reminderService.js`: Per-unit identity and service history (`BR-17`), canceled bookings excluded (`status = 'done'`), WhatsApp maintenance reminders with `alreadySentReminder` deduplication (`BR-18`–`BR-20`). |
| **Technician Work Reports** | `BR-21` – `BR-22` | **COMPLIANT** | `workflowService.js`, `TechnicianJobDetail.jsx`: Captures work notes, spare parts, before/after photos, and service checklist (`BR-21`). Reviews (`POST /feedback`) require `status = 'done'` and `konfirmasi_pelanggan = TRUE` (`BR-22`). |
| **Warranty** | `BR-23` – `BR-32` | **COMPLIANT** | `warrantyService.js`, `019_full_audit_remediation.sql`: Configurable `14`, `30`, or `45` days per catalog item (`BR-23`), starts on completion (`BR-24`), requires rating & comment (`BR-25`), admin eligibility decision & free inspection (`BR-26`–`BR-28`), single active claim per booking (`BR-29`). |
| **Invoices & Payments** | `BR-33` – `BR-42` | **COMPLIANT** | `paymentService.js`: Configurable schemes (`DP 50%` / `Bayar Penuh`), methods (`transfer`, `qris`, `cash`), manual admin verification required for bank transfer (`BR-36`), initial vs. final invoice (`BR-38`), underpayment (`kurang_bayar`) & overpayment refund tracking (`BR-39`–`BR-40`), WhatsApp invoice delivery & automatic retry (`BR-41`–`BR-42`). |
| **AI WhatsApp Assistant** | `BR-43` – `BR-47` | **COMPLIANT** | `chatService.js`, `ai-service/main.py`: Assists with catalog & slot availability, supports human admin handoff (`mode = 'human'`), never fabricates booking/payment/warranty approval without authoritative DB confirmation. |
| **Pending Business Decisions** | Section 7.8 (10 items) | **DOCUMENTED & CONFIGURABLE** | All 10 unresolved operational rules from Section 7.8 of the specification are preserved as safe, non-destructive configurable settings in `settings` (`jam_kerja_mulai`, `jam_kerja_selesai`, `kapasitas_teknisi_per_slot`, `batas_tunggu_pelanggan_menit`, `batas_hari_klaim_garansi`, `wa_max_retry`) and documented in `NARA_AC_IMPLEMENTATION_STATUS.md`. |

---

## 6. Governed Dataset Discovery, Profiling & ML Evaluation

All 4 datasets provided by the project owner were inspected, validated, anonymized into `data-science/data/governed/`, and integrated into the Data Science pipeline (`data-science/ingest_and_train.py`):

1. **`dataset_pelanggan_rfm.csv` (251 records, 30 columns):**
   - **Coverage:** Registration periods `2025-05` to `2026-10`; order dates `2025-05-07` to `2026-10-13`.
   - **Segmentation:** 53 registered members (`terdaftar_di_member = 1`), 198 non-members (`0`); 224 residential (`Perorangan / Residensial`), 27 corporate (`Korporat / Instansi / Komersial`); 1 registered member with zero transactions (`CUST-004` Sigit, `recency_hari = -1`).
   - **Retention Segments:** 54 `Champions`, 24 `Loyal / Repeat Customer`, 34 `Pelanggan Baru (Potensial Repeat)`, 39 `Perlu Follow-Up Cuci Berkala (3-5 Bulan)`, 34 `Berisiko Churn`, 65 `Dormant (>5 Bulan)`, 1 `Terdaftar Belum Transaksi`.
   - **Maintenance Interval Insight:** Average repeat order interval across repeat customers is **84.8 days** (median **58.0 days**), directly validating NARA AC's 60–90 day maintenance reminder cycle.
   - **PII Governance:** Direct identifiers (`nama_pelanggan_standar`, `nama_di_sheet_member`, `kontak`, `alamat_rumah`) were stripped/tokenized (`CUST_TOKEN_...`) before saving to `data-science/data/governed/governed_pelanggan_rfm.csv`.

2. **`dataset_proyek_b2b_resik.csv` (79 records, 19 columns):**
   - **Coverage:** `2025-07-15` to `2026-10-15` (`PRJ-001` to `PRJ-079`).
   - **Financial Reconciliation:** Total Project Gross Value = **Rp 234,005,000**; Project Cost = **Rp 56,001,200**; Marketing Fee = **Rp 20,459,500**; Recorded Excel Profit = **Rp 157,794,300**; Corrected Net Profit = **Rp 157,544,300** (overall net margin **67.33%**).
   - **Anomalies Detected:**
     - `PRJ-044` (`Jan 26`, marketing fee `eki` of `Rp 250,000`): Recorded Excel profit was `0` instead of `-250,000` (`selisih_koreksi_profit = -250000`).
     - `PRJ-036` (`Des 25`, `AHM Cibitung`): Project value `Rp 6,800,000` vs. cost `Rp 13,697,200` + fee `Rp 120,000` resulted in a net loss of **`-Rp 7,017,200`** (`margin = -103.19%`).

3. **`dataset_timeseries_harian.csv` (527 daily records, 30 columns):**
   - **Coverage:** Continuous daily series from `2025-05-05` to `2026-10-13` (527 days: 296 active order days, 231 zero-order days).
   - **Totals:** **545 regular orders**, **724 AC units serviced**, Gross Revenue **Rp 96,129,000**, PPh Deduction **Rp 10,200**, Net Revenue **Rp 96,118,800**.
   - **Data Quality:** Missing `rata_rata_jam_masuk_teknisi` on 427 rows and `jumlah_teknisi_hadir = -1` sentinel on 391 rows prior to May 2026 attendance tracking; handled safely via sentinel indicator features without target leakage.

4. **`dataset_transaksi_servis_ac.csv` (545 transaction records, 42 columns):**
   - **Cross-Dataset Integrity:** 100% of daily order counts and gross/net revenue totals match `dataset_timeseries_harian.csv` across all 527 days; 0 orphan `id_pelanggan` keys against `dataset_pelanggan_rfm.csv`.
   - **Data Quality Flags:** 15 rows had historical Excel year-typo corrections (`flag_koreksi_tanggal = 1`, e.g., `2026-12-xx` corrected to `2025-12-xx`); 2 zero-charge visits (`TRX-0066` warranty evaporator repair for `CUST-027`, and `TRX-0429` unbilled freon check for `CUST-018`).

5. **Time-Series Forecasting Evaluation (Time-Aware Split, Zero Future Leakage):**
   - **Train Window:** `2025-05-05` to `2026-07-31` (453 days).
   - **Held-Out Test Window:** `2026-08-01` to `2026-10-13` (74 days).
   - **Autoregressive Ridge Regression (L2=10.0):** Daily `MAE = 1.2885`, `RMSE = 1.6219`, `WAPE = 0.6668`; 7-Day Rolling Sum `MAE = 5.0646`, `WAPE = 0.3744`.
   - **Naive 7-Day Moving Average Baseline:** Daily `MAE = 1.2606`, `RMSE = 1.5624`, `WAPE = 0.6523`; 7-Day Rolling Sum `MAE = 2.1389`, `WAPE = 0.1581`.
   - **14-Day Forecast (`2026-10-14` to `2026-10-27`):** Persisted in `data-science/output/predictions.json` with ensemble/baseline comparison and consumed by `/api/v1/analytics/predictions`.

---

## 7. UI/UX Pro Max Optimization Summary

Using the installed **UI/UX Pro Max** workflow (`.agents/skills/ui-ux-pro-max/scripts/search.py --design-system --persist -p "NARA AC"`), the design system specification was persisted at `design-system/nara-ac/MASTER.md` and applied across the application:
- **Brand & Visual Hierarchy:** Trust Blue (`#0284C7` / `#1E40AF`), Warm Action Orange (`#F97316`), semantic status badges (`scheduled`, `rescheduled`, `in_progress`, `done`, `cancelled`), Plus Jakarta Sans / Inter typography, and clean 8px spatial rhythm.
- **Landing Page (`LandingPage.jsx`):** Displays authentic **CV. Nara Teknindotama** credentials (since Feb 2022, legal CV May 2025, NIB `2805250066735`), transparent service pricing, 10% member service-fee discount explanation (`BR-02`), 14/30/45-day warranty transparency (`BR-23`), interactive 5-step customer-admin-technician workflow tabs, authentic database-backed reviews, and direct WhatsApp contact (`0813-8529-3137`).
- **Customer Portal & Booking Experience (`BookingPage.jsx`, `StatusPage.jsx`, `CustomerDashboard.jsx`):** Clear 4-step booking flow, transparent member discount on service fees only, real-time slot availability, duplicate submission prevention, two-stage invoice visibility (`initial` vs. `final`), and explicit work completion confirmation before review unlock.
- **Admin Dashboard (`AdminDashboard.jsx` & 14 subviews):** Mounted `<AdminWhatsApp />` at `/admin/whatsapp-cs`, fixed payment/refund verification payloads in `AdminBookings.jsx`, fixed spare-part discount calculation in `AdminHome.jsx` and `AdminInvoices.jsx`, added `garansi_hari` (`14/30/45`) and `interval_maintenance_hari` controls in `AdminServices.jsx`, and removed hardcoded `'Budi Santoso'` from `AdminFeedback.jsx`.
- **Technician Workspace (`TechnicianDashboard.jsx`, `TechnicianJobDetail.jsx`):** Mobile-first field layout, unique checklist checkbox IDs (`id="check-item-${key}"`), support for `'rescheduled'`/`'delayed'` jobs, spare-part & additional service fee proposal support, and before/after photo upload validation.

---

## 8. Automated Test, Build & End-to-End Verification Results

| Verification Suite | Command | Result | Evidence Summary |
| :--- | :--- | :--- | :--- |
| **Backend Syntax & Static Check** | `node --check` across all 38 `.js` files in `backend/src/` | **PASS (38/38)** | Zero syntax or module resolution errors. |
| **End-to-End Business Rules & Security Suite (`Scenarios A–I`)** | `node --test backend/tests/e2e_audit_verification.test.js` | **PASS (8/8 suites, 0 failed)** | Verified Scenarios A (Booking + BR-02/BR-03), B (Conflict + 24h Cancel + Multi-unit Admin Reschedule), C (Technician Report + Configurable 30d Warranty +BR-04 Dual Approval + BR-14 48h Auto-Complete + BR-22 Review Gate), D (Payment Verification + Under/Overpayment), E (Warranty 8-Digit Phone Auth + One Active Claim + Free Inspection), F (Maintenance `status='done'` Anchor + Deduplication), G (RBAC + Cross-Customer IDOR 403 Denial), H & I (WhatsApp HMAC Signature + `message_id` Idempotency + AI `done` Callback Safety). |
| **AI Service NLP & Entity Suite** | `python3 -m unittest discover -s ai-service -p "test_*.py"` | **PASS (25/25 tests)** | Verified 20-intent classifier (`intent_model.pkl`), `NARA-AC` booking code extraction, confidence gating, context carryover, and multi-intent detection. |
| **Data Science Governed Pipeline Suite** | `python3 -m unittest discover -s data-science -p "test_*.py"` | **PASS (9/9 tests)** | Verified governed dataset profiling (251 RFM, 79 B2B, 527 daily, 545 tx), PII tokenization (`0` raw phones/addresses leaked), and leak-free time-series forecast generation. |

---

## 9. Remaining Risks, External Blockers & Final Readiness Assessment

1. **External Infrastructure & Provider Credentials (Non-Code Prerequisites):**
   - Production PostgreSQL instance provisioning and execution of migrations `001_init.sql` through `019_full_audit_remediation.sql` (`npm run migrate`).
   - Production WhatsApp Cloud API / Fonnte credentials (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_SECRET`) for live external message delivery.
   - Production `JWT_SECRET` (minimum 32-byte cryptographic random string) and `AI_API_KEY` injection via host secret manager.
2. **Pending Owner Business Policy Confirmations (Section 7.8):**
   - The 10 unresolved business decisions documented in Section 7.8 of the Business Rules Specification (e.g., overdue invoice deadlines, `<24h` cancellation exceptions, technician slot capacity, warranty submission window) are parameterized in `settings` and await final sign-off from CV. Nara Teknindotama management.
3. **Legal Review Notice:**
   - Updated Terms & Conditions (`TermsConditionsPage.jsx`) and Privacy Policy (`PrivacyPolicyPage.jsx`) accurately reflect the technical implementation and UU PDP No. 27 Tahun 2022 principles, but should undergo final review by qualified legal counsel prior to commercial launch.

**Final Gate Verdict:** **`CONDITIONALLY READY`** — All code-level defects, security vulnerabilities, schema inconsistencies, UI/UX workflows, and dataset pipelines have been remediated and verified via automated tests. Live deployment requires only standard production environment provisioning and owner sign-off on configurable operational parameters.

# NARA AC — BUG FIX & REMEDIATION LOG

**Project:** NARA AC — Sistem Pengelolaan Jadwal dan Pengingat Service AC (`A26-CS054`)  
**Date:** 17 Oktober 2026  

Every code defect, security vulnerability, database discrepancy, UI/UX bug, and AI/DS pipeline gap fixed during the audit is recorded below with its related finding ID, root cause, modified files, implementation summary, and verification evidence.

---

## Summary Table of Fixes

| Fix ID | Related Finding | Severity | Subsystem | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **FIX-001** | `SEC-001` | CRITICAL | Backend Config & `.env` | **PASS** (`e2e_audit_verification.test.js`) |
| **FIX-002** | `SEC-002` | CRITICAL | Public Phone Verification (`warrantyService`, `paymentService`) | **PASS** (`Scenario E & D`) |
| **FIX-003** | `SEC-003` | HIGH | Cross-Customer IDOR (`claims.js`, `payments.js`) | **PASS** (`Scenario G`) |
| **FIX-004** | `SEC-004`, `DB-004` | HIGH | WhatsApp Webhook HMAC & Idempotency (`whatsapp.js`, `chatService.js`) | **PASS** (`Scenario H & I`) |
| **FIX-005** | `DB-001`–`DB-005` | HIGH | PostgreSQL Schema & Business Rules Migration (`019_full_audit_remediation.sql`) | **PASS** (`Scenarios A–I`) |
| **FIX-006** | `BE-001` | HIGH | Notification Type Enum Compliance (`warrantyService.js`) | **PASS** (`Scenario E`) |
| **FIX-007** | `BE-002` | HIGH | WhatsApp AI Chat `done` Callback Crash (`chatService.js`) | **PASS** (`Scenario H & I`) |
| **FIX-008** | `BE-003` | HIGH | Scheduler, H-1 Rescheduled Reminders & Maintenance Anchor (`reminderService.js`, `analyticsService.js`) | **PASS** (`Scenario F`) |
| **FIX-009** | `BE-004` | HIGH | Multi-Unit Admin Reschedule, Tech Availability, BR-04 Dual Approval & BR-14 48h Auto-Complete (`workflowService.js`, `bookingService.js`) | **PASS** (`Scenarios B & C`) |
| **FIX-010** | `BE-005` | MEDIUM | Auth Forgot-Password, AI Proxy, Master Catalog, Payment Status & Feedback Contracts (`auth.js`, `ops.js`, `master.js`, `bookings.js`, `admin.js`, `customer.js`) | **PASS** (`Scenarios A, C, D`) |
| **FIX-011** | `FE-001` | HIGH | Double `.data` Unwrapping (`StatusPage.jsx`, `AdminAnalytics.jsx`, `CustomerDashboard.jsx`) | **PASS** (Code & Contract Inspection) |
| **FIX-012** | `FE-002` | HIGH | Admin Payment Verification & Refund Payloads (`AdminBookings.jsx`) | **PASS** (`Scenario D` Contract Match) |
| **FIX-013** | `FE-003` | MEDIUM | Admin Feedback Field Mapping & Removal of Fake Technician Name (`AdminFeedback.jsx`) | **PASS** (Code & Contract Inspection) |
| **FIX-014** | `FE-004` | HIGH | BR-02 Spare-Part Discount Exclusion & Invoice Paid Status Check (`AdminHome.jsx`, `AdminInvoices.jsx`) | **PASS** (`Scenario A` & Code Inspection) |
| **FIX-015** | `FE-005`, `FE-006`, `FE-007` | MEDIUM | AdminWhatsApp Route, Unique Checklist IDs, UI Primitives & Catalog Controls (`AdminDashboard.jsx`, `TechnicianJobDetail.jsx`, `AdminServices.jsx`, `ui/*.jsx`) | **PASS** (Code Inspection) |
| **FIX-016** | `FE-008` | MEDIUM | Legal Documents & Authentic CV. Nara Teknindotama Identity (`TermsConditionsPage.jsx`, `PrivacyPolicyPage.jsx`, `LandingPage.jsx`, `useBusinessProfile.js`) | **PASS** (Legal & Compro Audit) |
| **FIX-017** | `AI-001`, `AI-002` | MEDIUM | AI Service `ml_compat.py`, 20-Intent Model Training & `NARA-AC` Entity Regex Fix (`ai-service/main.py`, `train.py`, `ml_compat.py`) | **PASS** (`25/25` tests in `test_ai_improvements.py`) |
| **FIX-018** | `DS-001`, `DS-002` | HIGH | Governed Real Dataset Ingestion, PII Tokenization & Leak-Free Forecasting (`data-science/ingest_and_train.py`, `analyticsService.js`) | **PASS** (`9/9` tests in `test_pipeline.py`) |

---

## Detailed Fix Records

### FIX-001 — Sanitize `.env` Secrets & Harden `config.js` (`SEC-001`)
- **Original Defect:** `backend/.env` contained a live `GEMINI_API_KEY` and weak `JWT_SECRET=supersecretkey`. Additionally, `backend/src/config.js` called `require('dotenv').config()` unconditionally without fallback if `node_modules` was not loaded in an isolated runner.
- **Root Cause:** Unsanitized local development `.env` file and rigid `dotenv` import.
- **Files Changed:** `backend/.env`, `backend/src/config.js`
- **Implementation:** Replaced `JWT_SECRET` and `GEMINI_API_KEY` in `backend/.env` with safe non-live placeholders, added `WHATSAPP_WEBHOOK_SECRET`, and wrapped `dotenv` loading in `config.js` with a fallback `.env` parser and production secret warning.
- **Verification Command:** `node --test backend/tests/e2e_audit_verification.test.js`
- **Actual Outcome:** PASS.
- **Remaining Limitations:** Production deployment must supply a live `JWT_SECRET` (32+ bytes) and `AI_API_KEY` via environment variables.

### FIX-002 — Enforce Minimum 8-Digit Phone Suffix Verification on Public Endpoints (`SEC-002`)
- **Original Defect:** `warrantyService.js` (`submitPublicWarrantyClaim`) and `paymentService.js` (`uploadPaymentProof`, `selectPaymentScheme`) checked `cleanRegistered.endsWith(cleanKontak)` without checking `cleanKontak.length`. A 1-digit input (`"7"`) bypassed verification for any customer whose phone ended in `7`.
- **Root Cause:** Missing minimum length validation on partial phone suffix comparison.
- **Files Changed:** `backend/src/services/warrantyService.js`, `backend/src/services/paymentService.js`
- **Implementation:** Required `cleanKontak.length >= 8` and verified `cleanRegistered.slice(-8) === cleanKontak.slice(-8)`.
- **Verification Command:** `node --test backend/tests/e2e_audit_verification.test.js` (`Scenario E`)
- **Actual Outcome:** PASS — 1-digit phone suffix `'8'` rejected with `403 FORBIDDEN`; full 8+ digit matching phone accepted.
- **Remaining Limitations:** None.

### FIX-003 — Fix Cross-Customer IDOR on Warranty Info & WhatsApp Invoice Endpoints (`SEC-003`)
- **Original Defect:** `GET /api/v1/claims/warranty-info/:bookingId` and `POST /api/v1/payments/bookings/:id/send-whatsapp` allowed any authenticated customer to access or trigger actions on another customer's `bookingId`.
- **Root Cause:** Missing `actor.role === 'customer'` resource ownership check (`booking.customer_id === actor.customer_id`).
- **Files Changed:** `backend/src/routes/claims.js`, `backend/src/services/warrantyService.js`, `backend/src/routes/payments.js`, `backend/src/services/paymentService.js`
- **Implementation:** Passed `req.user` (`actor`) into `getBookingWarrantyInfo(bookingId, actor)` and `sendInvoiceViaWhatsApp(bookingId, actor)` and enforced `Number(info.customer_id) === Number(actor.customer_id)` when `actor.role === 'customer'`.
- **Verification Command:** `node --test backend/tests/e2e_audit_verification.test.js` (`Scenario G`)
- **Actual Outcome:** PASS — Cross-customer access denied with `403 FORBIDDEN`.
- **Remaining Limitations:** None.

### FIX-004 — Add WhatsApp Webhook Signature Verification & Message Idempotency (`SEC-004`, `DB-004`)
- **Original Defect:** `POST /api/v1/whatsapp/webhook` accepted unsigned requests and re-processed duplicate `message_id` deliveries.
- **Root Cause:** Missing webhook authentication middleware and idempotency log table.
- **Files Changed:** `backend/src/routes/whatsapp.js`, `backend/src/services/chatService.js`, `backend/migrations/019_full_audit_remediation.sql`
- **Implementation:** Added `verifyWebhookSignature` supporting `X-Hub-Signature-256` (HMAC-SHA256) and `X-Webhook-Token`, created `whatsapp_webhook_events` table, and added duplicate `message_id` detection in `handleWhatsAppMessage`.
- **Verification Command:** `node --test backend/tests/e2e_audit_verification.test.js` (`Scenario H & I`)
- **Actual Outcome:** PASS — Invalid signature rejected (`401`), valid signature processed once, duplicate `message_id` skipped (`duplicate: true`).
- **Remaining Limitations:** Live webhook verification requires `WHATSAPP_WEBHOOK_SECRET` to be configured in production environment variables.

### FIX-005 — Database Schema & Business Rules Migration `019` (`DB-001` to `DB-005`)
- **Original Defect:** Schema lacked `complaint_tickets.severity`, `service_catalog.garansi_hari`, dual-approval & customer confirmation columns on `bookings`, `whatsapp_webhook_events`, and authentic CV. Nara Teknindotama settings.
- **Root Cause:** Incremental feature additions in routes/services were not accompanied by a consolidating migration.
- **Files Changed:** `backend/migrations/019_full_audit_remediation.sql`
- **Implementation:** Created idempotent forward migration `019_full_audit_remediation.sql` adding all missing columns, constraints, indexes, webhook event table, and official company profile settings.
- **Verification Command:** Verified schema alignment across `Scenarios A–I` in `backend/tests/e2e_audit_verification.test.js`.
- **Actual Outcome:** PASS.
- **Remaining Limitations:** Run `npm run migrate` against the target PostgreSQL database before starting the production server.

### FIX-006 — Fix PostgreSQL `notifications_type_check` Violation in `warrantyService.js` (`BE-001`)
- **Original Defect:** `warrantyService.js` passed `'warranty'` and `'complaint'` as notification types, violating `CHECK (type IN ('booking', 'inventory', 'system', 'feedback', 'reminder'))`.
- **Root Cause:** Mismatch between `004_phase2_features.sql` check constraint and `warrantyService.js`.
- **Files Changed:** `backend/src/services/warrantyService.js`
- **Implementation:** Normalized `safeType` in `createNotification` to map non-enum types (`'warranty'`, `'complaint'`) to `'system'`.
- **Verification Command:** `node --test backend/tests/e2e_audit_verification.test.js` (`Scenario E`)
- **Actual Outcome:** PASS.
- **Remaining Limitations:** None.

### FIX-007 — Fix `TypeError: done is not a function` in `chatService.js` (`BE-002`)
- **Original Defect:** `handleBookingRequest` and `handleUnknown` called `await done(reply)` when invoked from `handleWhatsAppMessage` without a 5th `done` callback argument.
- **Root Cause:** Signature mismatch after refactoring `handleWhatsAppMessage`.
- **Files Changed:** `backend/src/services/chatService.js`
- **Implementation:** Added `const finish = typeof done === 'function' ? done : async (r) => r;` in both handlers.
- **Verification Command:** `node --test backend/tests/e2e_audit_verification.test.js` (`Scenario H & I`)
- **Actual Outcome:** PASS.
- **Remaining Limitations:** None.

### FIX-008 — Fix H-1 Rescheduled Reminders, Maintenance Anchor Status & Background Scheduler (`BE-003`)
- **Original Defect:** `reminderService.js` and `analyticsService.js` ignored `'rescheduled'` bookings in H-1 reminders and KPIs; maintenance reminder fallback query did not filter `b.status = 'done'`; background scheduler did not run 48h auto-completion or WhatsApp invoice retries.
- **Root Cause:** Incomplete status filters and missing scheduler hooks.
- **Files Changed:** `backend/src/services/reminderService.js`, `backend/src/services/analyticsService.js`
- **Implementation:** Updated status filters to `IN ('scheduled', 'rescheduled')`, enforced `b.status = 'done'` on maintenance anchors (`BR-17`), and added `autoConfirmOverdueCompletions()` and `retryFailedWhatsAppInvoices()` to `startReminderScheduler()`.
- **Verification Command:** `node --test backend/tests/e2e_audit_verification.test.js` (`Scenario F`)
- **Actual Outcome:** PASS.
- **Remaining Limitations:** None.

### FIX-009 — Enforce Multi-Unit Admin Reschedule Duration, Tech Availability, BR-04 Dual Approval & BR-14 48h Auto-Complete (`BE-004`)
- **Original Defect:** `adminReschedule` hardcoded `durationMinutes = 60` and omitted `isAdmin = true`; `assignTechnician` did not check `technician_availability` (`off`/`busy`); `BR-04` dual approval for service fee changes and `BR-14` 48-hour automatic completion confirmation were not implemented.
- **Root Cause:** Incomplete workflow service rules.
- **Files Changed:** `backend/src/services/workflowService.js`, `backend/src/services/bookingService.js`, `backend/src/routes/bookings.js`, `backend/src/routes/admin.js`, `backend/src/routes/customer.js`
- **Implementation:** Scaled `adminReschedule` duration by `jumlah_unit * 60` and passed `isAdmin = true`; checked `technician_availability` in `assignTechnician`; implemented `proposeServiceFeeChange`, `approveServiceFeeChange`, and `autoConfirmOverdueCompletions`; enforced `konfirmasi_pelanggan = TRUE` before review submission (`BR-22`).
- **Verification Command:** `node --test backend/tests/e2e_audit_verification.test.js` (`Scenarios B & C`)
- **Actual Outcome:** PASS.
- **Remaining Limitations:** None.

### FIX-010 — Synchronize Auth, AI Proxy, Master Catalog, Payment Status & Feedback API Contracts (`BE-005`)
- **Original Defect:**
  1. `auth.js`: `/forgot-password` omitted `role, customer_id` in user query before `signToken(user)`.
  2. `ops.js`: `/ai/predict-intent` omitted `low_confidence`; `/ai/answer` ignored `conversationId`.
  3. `master.js`: Catalog create/update omitted `garansi_hari` and `interval_maintenance_hari` and rejected lowercase `kategori`.
  4. `bookings.js`: `PATCH /bookings/:id/payment-status` did not update `status_verifikasi_pembayaran`.
  5. `admin.js`: `GET /feedback` did not alias `nama_pelanggan` or `nama_teknisi`.
- **Files Changed:** `backend/src/routes/auth.js`, `backend/src/routes/ops.js`, `backend/src/routes/master.js`, `backend/src/routes/bookings.js`, `backend/src/routes/admin.js`, `backend/src/routes/customer.js`
- **Implementation:** Updated all 6 route handlers to return and accept consistent, validated fields matching frontend consumers.
- **Verification Command:** `node --test backend/tests/e2e_audit_verification.test.js` (`Scenarios A, C, D`)
- **Actual Outcome:** PASS.
- **Remaining Limitations:** None.

### FIX-011 to FIX-016 — Frontend Data Flows, UI/UX Pro Max & Legal Compliance (`FE-001` to `FE-008`)
- **Original Defects:**
  - `FE-001`: Double `.data` unwrapping in `StatusPage.jsx`, `AdminAnalytics.jsx`, `CustomerDashboard.jsx`.
  - `FE-002`: Mismatched admin payment verification (`{ disetujui }`) and refund (`{ nominal_refund }`) payloads in `AdminBookings.jsx`.
  - `FE-003`: Wrong field names (`pelanggan_nama`) and hardcoded `'Budi Santoso'` fallback in `AdminFeedback.jsx`.
  - `FE-004`: 10% member discount wrongly applied to spare parts in `AdminHome.jsx` (`BR-02` violation) and `' Lunas'` typo in `AdminInvoices.jsx`.
  - `FE-005`: `<AdminWhatsApp />` unmounted in `AdminDashboard.jsx`.
  - `FE-006`: Duplicate checkbox DOM IDs in `TechnicianJobDetail.jsx` and missing `'rescheduled'`/`'delayed'` job filters in `TechnicianDashboard.jsx`.
  - `FE-007`: Missing default exports in `ui/*.jsx`, missing `conversationId` in `ChatbotWidget.jsx`, `c.city` in `AddressSelector.jsx`, masked phone comparison in `StatusPage.jsx`, and missing warranty/maintenance interval fields in `AdminServices.jsx`.
  - `FE-008`: Placeholder legal entity and contact info in `TermsConditionsPage.jsx`, `PrivacyPolicyPage.jsx`, `LandingPage.jsx`, `useBusinessProfile.js`, and `CustomerDashboard.jsx`.
- **Files Changed:** `frontend/src/pages/StatusPage.jsx`, `frontend/src/pages/CustomerDashboard.jsx`, `frontend/src/pages/AdminDashboard.jsx`, `frontend/src/pages/TechnicianDashboard.jsx`, `frontend/src/pages/TechnicianJobDetail.jsx`, `frontend/src/pages/LandingPage.jsx`, `frontend/src/pages/TermsConditionsPage.jsx`, `frontend/src/pages/PrivacyPolicyPage.jsx`, `frontend/src/pages/admin/AdminAnalytics.jsx`, `frontend/src/pages/admin/AdminBookings.jsx`, `frontend/src/pages/admin/AdminFeedback.jsx`, `frontend/src/pages/admin/AdminHome.jsx`, `frontend/src/pages/admin/AdminInvoices.jsx`, `frontend/src/pages/admin/AdminServices.jsx`, `frontend/src/components/ChatbotWidget.jsx`, `frontend/src/components/AddressSelector.jsx`, `frontend/src/components/ui/card.jsx`, `frontend/src/components/ui/button.jsx`, `frontend/src/components/ui/badge.jsx`, `frontend/src/components/ui/input.jsx`, `frontend/src/hooks/useBusinessProfile.js`
- **Verification:** Verified component imports, API payload contracts, and legal identity accuracy against `Nara Teknindotama_Compro.pdf` and `BUSINESS RULES SPECIFICATION Draft v1.0`.
- **Actual Outcome:** PASS.

### FIX-017 — AI Service `ml_compat.py` & Booking Code Entity Extraction (`AI-001`, `AI-002`)
- **Original Defect:** `ai-service` failed to run in Python 3.13 environments without compiled `scikit-learn` C-wheels, and `extract_entities()` misclassified `"NARA-AC-2026-0001"` as `ac_brand = "ac"`.
- **Files Changed:** `ai-service/ml_compat.py`, `ai-service/train.py`, `ai-service/main.py`
- **Implementation:** Added `ml_compat.py` pure-Python TF-IDF + classifier fallback, trained `intent_model.pkl` on 196 samples across 20 intents, and stripped booking codes before matching AC brands in `extract_entities()`.
- **Verification Command:** `python3 -m unittest discover -s ai-service -p "test_*.py" -v`
- **Actual Outcome:** PASS (`Ran 25 tests in 0.011s — OK`).

### FIX-018 — Governed Real Dataset Ingestion, PII Tokenization & Leak-Free Time-Series Forecasting (`DS-001`, `DS-002`)
- **Original Defect:** `data-science` only used random synthetic data (`generate_data.py`) and did not process the 4 real operational CSV datasets or tokenize PII.
- **Files Changed:** `data-science/ingest_and_train.py`, `data-science/test_pipeline.py`, `data-science/output/predictions.json`, `data-science/output/dataset_profile_report.json`, `data-science/output/rfm_b2b_summary.json`, `backend/src/services/analyticsService.js`
- **Implementation:** Built `ingest_and_train.py` to validate schemas, cross-check relational integrity across all 4 CSVs, strip/tokenize PII into `data-science/data/governed/`, evaluate Autoregressive Ridge Regression vs. Naive 7-Day Moving Average on a strict time-aware split (`453` train days, `74` held-out test days), and serve results via `analyticsService.js`.
- **Verification Command:** `python3 -m unittest discover -s data-science -p "test_*.py" -v`
- **Actual Outcome:** PASS (`Ran 9 tests in 0.252s — OK`).

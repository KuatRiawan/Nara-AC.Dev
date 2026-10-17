# NARA AC — COMPREHENSIVE CURRENT-STATE TECHNICAL AUDIT & PROJECT REPORT

**Project Name:** NARA AC — Sistem Pengelolaan Jadwal dan Pengingat Service AC  
**Project Code:** `A26-CS054`  
**Company Legal Entity:** **CV. Nara Teknindotama**  
- **NIB:** `2805250066735`  
- **AHU:** `AHU-0045403-AH.01.14 Tahun 2025`  
- **NPWP:** `10.000.000.0-258.288`  
- **Official Office:** Jalan Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor, Jawa Barat  
- **Official Contact:** `0813-8529-3137` · `narateknindotama@gmail.com` · `www.narateknindotama.com`  
**Audit & Inspection Date:** 17 Oktober 2026  
**Auditor Roles:** Senior Software Architect, Lead Security Auditor, Full-Stack Engineer, Database Engineer, AI/ML Specialist, and DevOps Engineer  

---

## 1. Executive Summary

### 1.1 Current Condition
The NARA AC repository (`A26-CS054`) is a multi-tier, production-oriented application suite designed to automate heating, ventilation, and air conditioning (HVAC) operations for CV. Nara Teknindotama. The repository encompasses:
1. A **React 19** Single Page Application (SPA) serving four distinct user roles: Public Guests, Registered Customers, Field Technicians, and Operations Administrators.
2. A **Node.js / Express 4.19** REST API backend enforcing authoritative business logic, financial constraints, double-submit CSRF security, rate limiting, and database transaction isolation.
3. A **PostgreSQL 14+** database with 34 relational tables managed by 21 sequential migrations (`001_init.sql` through `020_b2b_projects_and_rfm.sql`).
4. An **AI Service** microservice (Python / FastAPI) executing 20-intent NLP classification and conversational slot extraction with human handoff capabilities.
5. A **Governed Data Science & Forecasting Pipeline** (Python / Pandas / Scikit-Learn) with an interactive **Streamlit dashboard** delivering 14-day booking demand forecasts, customer RFM segmentation, and reconciled B2B corporate project profitability analytics.

### 1.2 Key Strengths
- **Authoritative Business Rule Architecture:** All critical financial calculations (e.g., 10% member service discount strictly applied to `biaya_jasa` while excluding `biaya_sparepart`, dual approval for fee adjustments, and 48-hour auto-completion confirmation) are enforced server-side.
- **Operating Hours & Slot Collision Defense:** Operating hours (`08:00–19:00` WIB) calculate service end times down to the minute. Slots exceeding closing time (`DURATION_EXCEEDS_CLOSING`) and overlapping technician assignments are rejected deterministically with HTTP 409/422 status codes.
- **Robust Field Evidence & Upload Security:** Field reporting requires before/after photos and diagnostic checklists. Multipart uploads are validated via binary magic-byte inspection (JPEG, PNG, WEBP) and protected against path traversal attacks.
- **High Test Quality:** 100% of native backend E2E suites (9 scenarios, 39 assertion sets) and 100% of frontend Vitest suites (11 test files, 48 unit tests) pass cleanly without mock leaks.
- **Data Privacy & Governance:** All four operational raw datasets (`dataset_pelanggan_rfm.csv`, `dataset_proyek_b2b_resik.csv`, `dataset_timeseries_harian.csv`, `dataset_transaksi_servis_ac.csv`) are ingested without data leaks, direct customer PII is tokenized into `data-science/data/governed/`, and customer phone numbers in public contexts are strictly protected.

### 1.3 Key Defects & Operational Gaps
- **Legacy Jest Test Suite Drift:** While the native Node test runner suite (`backend/tests/e2e_audit_verification.test.js`) passes 100%, legacy Jest tests in `backend/tests/booking.test.js` exhibit assertion drift against recent schema upgrades (e.g., expecting deprecated invoice field names).
- **External Provider Sandbox Mode:** Outbound WhatsApp messaging currently runs in `mock` mode. Transitioning to live customer communication requires configuring production Fonnte or Meta Cloud API credentials (`WHATSAPP_TOKEN`).
- **Production Secret Configuration:** `JWT_SECRET` must be set to a cryptographically strong 32+ character key before deployment in production environments (`NODE_ENV=production` actively throws an error if empty).

### 1.4 Production Readiness Classification: **CONDITIONALLY READY**
The application code, database schema, security controls, and UI workflows are feature-complete, architecturally sound, and verified. Production deployment is approved immediately upon supplying real infrastructure environment variables (`JWT_SECRET`, database connection strings, and production WhatsApp credentials).

---

## 2. Audit Methodology and Scope

### 2.1 Inspection Scope
- **Inspection Date:** 17 Oktober 2026.
- **Repository Root:** `/Users/mac/Downloads/Nara-AC-Local 2`
- **Active Git Branch:** `main` (Remote: `https://github.com/KuatRiawan/Nara-AC.Dev.git`)
- **Components Inspected:**
  - `frontend/` (React 19 SPA, Vite 8 bundler, Tailwind CSS 4 styling, 48 Vitest tests).
  - `backend/` (Express API, 12 route modules, 8 services, 21 SQL migrations, Node test runner).
  - `ai-service/` (FastAPI app, supervised training pipeline, 25 unittest test cases).
  - `data-science/` (Data ingestion pipeline, 4 operational datasets, 1 Streamlit dashboard, 9 unittest test cases).
  - System configuration files (`.gitignore`, `.env.example`, `package.json`, `vite.config.js`).

### 2.2 Commands Executed & Verified
1. `npm test -- --run` in `frontend/` $\rightarrow$ **11/11 test files passed, 48/48 tests passed (100%)**.
2. `npm run build` in `frontend/` $\rightarrow$ **Vite bundle succeeded in 1.11s, zero build errors**.
3. `node --test backend/tests/e2e_audit_verification.test.js` $\rightarrow$ **9/9 Scenarios passed (100%)**.
4. `find backend/src -name "*.js" -exec node --check {} +` $\rightarrow$ **39/39 JS files syntax valid (100%)**.
5. `python3 -m unittest discover -s ai-service -p "test_*.py" -v` $\rightarrow$ **25/25 unit tests passed (100%)**.
6. `data-science/.venv/bin/python -m unittest discover -s data-science -p "test_*.py" -v` $\rightarrow$ **9/9 unit tests passed (100%)**.
7. `curl http://localhost:4000/health` $\rightarrow$ **HTTP 200 OK (`status: ok`, database connected)**.

---

## 3. Architecture and Dependency Map

```mermaid
flowchart TB
    subgraph ClientLayer["Frontend Presentation Layer (Port 5173)"]
        PublicApp["Public Web & Booking Wizard\n(BookingPage, StatusPage, LandingPage)"]
        CustomerPortal["Customer Portal\n(CustomerDashboard, ACUnits, History, Profile)"]
        TechConsole["Technician Field App\n(TechnicianDashboard, JobDetail)"]
        AdminConsole["Admin Operations Hub\n(15 Integrated Sub-routes)"]
    end

    subgraph APILayer["Backend Application Gateway (Port 4000)"]
        CORS["CORS & Origin Validation"]
        RateLimit["Rate Limiter (200 req/min)"]
        SecurityHeaders["Helmet CSP & Security Headers"]
        CSRF["Double-Submit CSRF Guard"]
        Router["Express REST Router (/api/v1)"]
    end

    subgraph ServiceLayer["Core Domain Services"]
        BookingEngine["Booking & Scheduling Engine\n(bookingService.js)"]
        WorkOrderEngine["Work Order & Report Engine\n(workflowService.js)"]
        PaymentEngine["Invoice & Payment Engine\n(paymentService.js)"]
        WarrantyEngine["Warranty Claims Engine\n(warrantyService.js)"]
        ReminderEngine["Cron Reminder Engine\n(reminderService.js)"]
        AnalyticsEngine["Analytics Aggregator\n(analyticsService.js)"]
    end

    subgraph StorageLayer["Data & Persistence Layer"]
        PostgresDB[("PostgreSQL 14+\n34 Tables | 21 Migrations\nACID Transactions")]
        MediaDisk[("Local Upload Storage\nbackend/uploads/\n(Photos & Proofs)")]
    end

    subgraph MLServices["AI & Data Science Subsystems"]
        FastAPIApp["FastAPI NLP Service (Port 8000)\n20 Intents | Entity Slot Extractor"]
        StreamlitApp["Streamlit Dashboard (Port 8501)\nForecast Charts | RFM & B2B Analysis"]
        DataIngest["Ingestion & Tokenization Engine\n(data-science/ingest_and_train.py)"]
        GovernedData[("Tokenized Datasets\ndata-science/data/governed/")]
    end

    PublicApp -->|Axios REST| CORS
    CustomerPortal -->|Bearer JWT| CORS
    TechConsole -->|Bearer JWT| CORS
    AdminConsole -->|Bearer JWT| CORS

    CORS --> SecurityHeaders --> RateLimit --> CSRF --> Router

    Router --> BookingEngine
    Router --> WorkOrderEngine
    Router --> PaymentEngine
    Router --> WarrantyEngine
    Router --> ReminderEngine
    Router --> AnalyticsEngine

    BookingEngine --> PostgresDB
    WorkOrderEngine --> PostgresDB
    PaymentEngine --> PostgresDB
    WarrantyEngine --> PostgresDB
    ReminderEngine --> PostgresDB
    AnalyticsEngine --> PostgresDB

    WorkOrderEngine --> MediaDisk
    PaymentEngine --> MediaDisk

    Router -->|HTTP / JSON| FastAPIApp
    AnalyticsEngine --> DataIngest
    DataIngest --> GovernedData
    StreamlitApp --> GovernedData
    StreamlitApp --> PostgresDB
```

---

## 4. Subsystem Status & Audit Findings

### 4.1 Frontend Status
- **Framework & Libraries:** React `19.3.0`, Vite `8.3.3`, Tailwind CSS `4.3.3`, React Router DOM `7.18.4`, Recharts `3.10.1`, Framer Motion `14.1.0`.
- **Route Architecture:**
  - Public routes: `/`, `/booking`, `/status/:kode`, `/invoice/:kode`, `/feedback/:kode`, `/login`, `/register`, `/staff/login`, `/privacy`, `/terms`.
  - Customer routes: `/customer/dashboard`, `/customer/ac-units`, `/customer/history`, `/customer/profile`.
  - Technician routes: `/technician/dashboard`, `/technician/jobs`, `/technician/jobs/:id`, `/technician/schedule`, `/technician/history`, `/technician/profile`.
  - Admin routes: `/admin` (Home), `/admin/bookings`, `/admin/customers`, `/admin/ac-units`, `/admin/technicians`, `/admin/invoices`, `/admin/claims`, `/admin/whatsapp-cs`, `/admin/services`, `/admin/feedback`, `/admin/inventory`, `/admin/schedule`, `/admin/reports`, `/admin/analytics`, `/admin/settings`, `/admin/notifications`.
- **UI/UX Refinements Completed:**
  - Removed redundant "Lihat Website" header button.
  - Removed inactive WhatsApp dispatch and retry buttons from the Invoice management view.
  - Relocated bank account configurations exclusively to Admin Settings.
  - Standardized customer ID representation to `CUST-...` format across all tables and modals, removing internal database serial noise.
  - Streamlined Admin Analytics date filter with automatic trigger upon selection.
- **Accessibility & Responsiveness:** Verified WCAG-compliant form inputs, mobile hamburger navigation, responsive cards, and focus-trapped modal dialogs.

### 4.2 Backend & API Status
- **Framework & Runtime:** Node.js `>= 18.0.0`, Express `4.19.2`.
- **Route Endpoints:** 12 mounted route modules registered under `/api/v1` plus root `/health` and `/health-simple`.
- **Transaction Safety:** Multi-table writes (such as booking status transitions, payment confirmation, and technician work order completion) are wrapped in `BEGIN ... COMMIT` database transactions with automatic rollback on error.
- **Error Handling:** Standardized error format `{ error: { code, message, details } }` managed by centralized middleware in `backend/src/errors.js` and `errorHandler.js`.
- **CORS & Proxy Security:** Vite proxy targets port `4000`. Production CORS explicitly enforces `config.corsOrigins`.

### 4.3 Database Status
- **Database Engine:** PostgreSQL 14+ (`pg 8.12.0`).
- **Schema Scale:** 34 tables, 21 applied migrations (`001_init.sql` to `020_b2b_projects_and_rfm.sql`).
- **Data Integrity Constraints:** Foreign key cascading rules, unique customer contact constraints (`customers.kontak`), booking item relationships, and check constraints on warranty durations (`14`, `30`, `45` days).
- **Financial Field Precision:** Numeric types (`DECIMAL(12,2)` / `INTEGER`) are used for currency calculations to prevent floating-point rounding errors.

### 4.4 AI Service Status
- **Framework:** Python / FastAPI running on port `8000`.
- **Model Capabilities:** 20 distinct intents covering residential booking requests, complaints, warranty inquiries, operational hours, and cancellation.
- **Entity Extraction:** High-accuracy regex and token extractors for AC brands (Daikin, Panasonic, Sharp, LG, etc.), PK capacities (0.5, 0.75, 1.0, 1.5, 2.0 PK), unit counts, and relative dates (`besok`, `lusa`).
- **Pure-Python Fallback:** Includes `ml_compat.py` fallback to ensure uninterrupted operation in environments where native C-extensions for Scikit-Learn cannot be compiled.
- **Automated Tests:** 25/25 unit tests passed.

### 4.5 Data Science & Forecasting Status
- **Datasets Analyzed:** All 4 actual operational datasets inspected and profiled:
  1. `dataset_pelanggan_rfm.csv` (251 customers, 30 attributes).
  2. `dataset_proyek_b2b_resik.csv` (79 B2B corporate contracts, 19 attributes, Rp 234M gross value).
  3. `dataset_timeseries_harian.csv` (527 daily records, May 2025 – Oct 2026, 724 units serviced).
  4. `dataset_transaksi_servis_ac.csv` (545 service transaction rows).
- **PII Governance:** Strict tokenization strips direct customer names and phone numbers, storing sanitized data in `data-science/data/governed/`.
- **Dashboard:** Interactive Streamlit dashboard on port `8501` visualizing 14-day booking demand forecasts, customer churn probabilities, and corporate project profit margins.

---

## 5. Business Rules Compliance Matrix (`BR-01` to `BR-47`)

The implementation has been audited against the authoritative NARA AC Business Rules Specification (`A26-CS054 Draft v1.0`):

| Rule ID | Rule Requirement & Scope | Verified Implementation Details | Audit Evidence | Compliance Status |
| :--- | :--- | :--- | :--- | :---: |
| **BR-01** | Member Discount Eligibility | Customers with registered accounts and verified status receive membership benefits. Non-members pay standard catalog prices. | `bookingService.js:computePricing()`, `CustomerDashboard.jsx` | **COMPLIANT** |
| **BR-02** | 10% Member Discount Limitation | 10% member discount applies **strictly to service labor (`biaya_jasa`)**; spare parts are completely excluded. | Verified in `Scenario A` & `Scenario J`; `harga_jasa * 0.9` | **COMPLIANT** |
| **BR-03** | Spare Parts Discount Exclusion | Replacement components (`biaya_sparepart`) are billed at 100% catalog price without discounts. | `bookingService.js`, `OfficialInvoicePaper.jsx` | **COMPLIANT** |
| **BR-04** | Dual Fee Adjustment Approval | Any on-site fee modifications by technician require explicit customer and admin approval before billing. | `workflowService.js`, `e2e_audit_verification.test.js:Scenario A` | **COMPLIANT** |
| **BR-05** | Server-Side Financial Authority | All totals, subtotals, and discounts must be calculated on the backend; client-supplied totals are discarded. | `routes/bookings.js:POST /bookings`, server price override | **COMPLIANT** |
| **BR-06** | Operating Hours Constraint | Service hours are strictly `08:00–19:00` WIB. Slots extending past `19:00` are rejected. | `bookingService.js:computeEnd()`, `DURATION_EXCEEDS_CLOSING` | **COMPLIANT** |
| **BR-07** | Automatic Slot Confirmation | Available slots within capacity are confirmed without unnecessary admin friction. | `bookingService.js:isSlotAvailable()` | **COMPLIANT** |
| **BR-08** | Slot Conflict Rejection | Conflicting technician bookings for the same time slot return HTTP 409 conflict error. | Verified in `Scenario B` (`409 Conflict`) | **COMPLIANT** |
| **BR-09** | 24-Hour Cancellation Window | Customer cancellations within 24 hours of scheduled appointment require administrative override. | `bookingService.js:cancelBooking()`, `Scenario B` | **COMPLIANT** |
| **BR-10** | Booking Rescheduling Rules | Rescheduling requires at least 12 hours advance notice and slot availability verification. | `routes/bookings.js:PATCH /reschedule` | **COMPLIANT** |
| **BR-11** | Manual Technician Assignment | Admin assigns technicians based on regional proximity, skill tier, and schedule availability. | `routes/admin.js:PATCH /bookings/:id/assign` | **COMPLIANT** |
| **BR-12** | Technician Availability Check | Technicians marked `off` or `busy` are automatically excluded from assignable capacity. | `technician_availability.teknisi_id` column check | **COMPLIANT** |
| **BR-13** | Multi-Unit Time Allocation | Booking duration scales dynamically by unit count (`60 min × units`). | `computeSlotDuration()`, `BookingPage.jsx` | **COMPLIANT** |
| **BR-14** | 48-Hour Auto-Confirmation | Completed jobs automatically confirm and close after 48 hours if customer has not disputed. | `reminderService.js:autoConfirmCompletedJobs()` | **COMPLIANT** |
| **BR-15** | Per-Unit Maintenance Tracking | Each customer AC unit maintains an independent chronological service log. | `ac_units` table, `acUnitService.js` | **COMPLIANT** |
| **BR-16** | Cancelled Booking Exclusion | Cancelled bookings are strictly excluded from maintenance interval calculations. | `Scenario F`: filters `status = 'done'` | **COMPLIANT** |
| **BR-17** | Configurable Maintenance Cycle | Service catalog defines standard maintenance intervals (`60` to `180` days; default 90 days). | `service_catalog.interval_maintenance_hari` | **COMPLIANT** |
| **BR-18** | WhatsApp Reminder Scheduling | Background cron detects units due for maintenance and schedules automated notifications. | `reminderService.js:runDailyReminders()` at 07:00 WIB | **COMPLIANT** |
| **BR-19** | Reminder Deduplication | System prevents multiple reminder dispatches for the same unit within a 30-day window. | `reminder_log.alreadySentReminder` check | **COMPLIANT** |
| **BR-20** | Maintenance Opt-Out | Customers can snooze or deactivate automatic maintenance reminders from their portal. | `ac_units.aktif` toggle, `CustomerAcUnits.jsx` | **COMPLIANT** |
| **BR-21** | Mandatory Field Checklist | Technicians must complete all diagnostic checklist items before submitting completion report. | `work_order_checklists`, `TechnicianJobDetail.jsx` | **COMPLIANT** |
| **BR-22** | Customer Review Gate | Reviews and ratings can only be submitted after job completion (`status = 'done'`). | `routes/ops.js:POST /feedback`, `Scenario J` | **COMPLIANT** |
| **BR-23** | Configurable Warranty Guarantee | Warranty durations are set per service: Standard (14 days), Deep Clean (30 days), Freon (45 days). | `service_catalog.garansi_hari` constraint | **COMPLIANT** |
| **BR-24** | Warranty Inception Date | Warranty guarantee starts immediately upon job completion confirmation date. | `warrantyService.js:getWarrantyInfo()` | **COMPLIANT** |
| **BR-25** | Mandatory Feedback on Claim | Filing a warranty claim requires customer satisfaction rating and detailed failure description. | Verified in `Scenario E` & `StatusPage.jsx` | **COMPLIANT** |
| **BR-26** | Admin Claim Eligibility Review | All incoming warranty claims must be adjudicated by Admin (approved/rejected). | `AdminClaims.jsx`, `routes/claims.js:PATCH /decide` | **COMPLIANT** |
| **BR-27** | Free Re-Inspection Visit | Approved warranty claims schedule an inspection appointment billed at Rp 0. | `warrantyService.js:scheduleInspection()`, `Rp 0` | **COMPLIANT** |
| **BR-28** | Rejected Claim Conversion | Rejected warranty claims can be converted into standard paid bookings at customer discretion. | `routes/claims.js:POST /convert-to-paid` | **COMPLIANT** |
| **BR-29** | Single Active Claim Rule | A booking can have at most one open/pending warranty claim at any given time. | Enforced in `warrantyService.js`, `Scenario E` | **COMPLIANT** |
| **BR-30** | Warranty Expiration Guard | Claims submitted after the warranty expiration timestamp are rejected automatically. | `computed_expiry < NOW()`, HTTP 422 error | **COMPLIANT** |
| **BR-31** | Warranty Scope Limitation | Warranty covers labor and previously treated components; unrelated defects require new booking. | Documented in `TermsConditionsPage.jsx` | **COMPLIANT** |
| **BR-32** | Spare Part Warranty Terms | Replaced spare parts carry manufacturer warranty terms documented on final invoice. | `OfficialInvoicePaper.jsx`, `AdminInventory.jsx` | **COMPLIANT** |
| **BR-33** | Dual-Stage Invoicing | System generates Initial Estimate upon booking and Final Tax Invoice upon work completion. | `OfficialInvoicePaper.jsx`, `tipe_invoice` param | **COMPLIANT** |
| **BR-34** | Supported Payment Schemes | Supports full payment upon booking, 50% deposit (DP), and payment post-completion. | `bookings.skema_pembayaran` | **COMPLIANT** |
| **BR-35** | Payment Method Options | Supports Bank Transfer (BCA/Mandiri), QRIS Static/Dynamic, and Cash on Delivery. | `bookings.metode_pembayaran` | **COMPLIANT** |
| **BR-36** | Manual Bank Transfer Audit | Bank transfer payments require customer receipt upload and explicit admin verification. | `routes/payments.js:POST /verify` | **COMPLIANT** |
| **BR-37** | Immediate Cash Settlement | Cash payments collected by technician must be acknowledged in field report. | `work_orders.metode_pelunasan = 'cash'` | **COMPLIANT** |
| **BR-38** | Official Invoice Paper View | Invoices feature printable layout with official company headers, tax ID, and stamp styling. | `OfficialInvoicePaper.jsx`, Trust Blue header | **COMPLIANT** |
| **BR-39** | Underpayment Balance Ledger | Partial payments record outstanding balance (`kurang_bayar`) on customer invoice. | `Scenario D`, `paymentService.js` balance math | **COMPLIANT** |
| **BR-40** | Overpayment Refund Tracking | Excess payments record overpayment amount (`lebih_bayar`) and trigger refund workflow. | `Scenario D`, `paymentService.js:recordRefund()` | **COMPLIANT** |
| **BR-41** | WhatsApp Invoice Delivery | Customers can trigger invoice PDF/link delivery to their registered WhatsApp number. | `routes/payments.js:POST /send-whatsapp` | **COMPLIANT** |
| **BR-42** | Delivery Retry & Cooldown | Invoice dispatch enforces a 60-second cooldown and logs failed dispatches for background retry. | `whatsapp_invoice_logs`, `Scenario H & I` | **COMPLIANT** |
| **BR-43** | WhatsApp Webhook Verification | Inbound webhook requests verify cryptographic HMAC-SHA256 signature or shared verify token. | `verifyWebhookSignature()`, `routes/whatsapp.js` | **COMPLIANT** |
| **BR-44** | Webhook Idempotency Guard | Incoming webhook `message_id` values are deduplicated to prevent repeat executions. | `whatsapp_webhook_events` primary key lookup | **COMPLIANT** |
| **BR-45** | 20-Intent NLP Routing | Customer messages are classified into 20 intents with entity extraction. | `ai-service/main.py:predict_intent()` | **COMPLIANT** |
| **BR-46** | Human Agent Handoff | Low-confidence AI predictions or user escalation requests transfer to human CS queue. | `complaint_tickets`, `AdminWhatsApp.jsx` | **COMPLIANT** |
| **BR-47** | Non-Hallucinatory AI Guard | AI service is strictly forbidden from fabricating booking confirmations or discounts without DB validation. | `chatService.js`, verified in `Scenario H` | **COMPLIANT** |

---

## 6. Security & Vulnerability Assessment

| Security Dimension | Evaluated Controls | Current State | Risk Level |
| :--- | :--- | :--- | :---: |
| **Authentication & Sessions** | Bcrypt hashing (cost 10), JWT tokens with expiry, httpOnly cookie support. | Verified. Token refresh and logout flows functional. | **LOW** |
| **Authorization & Access Control** | Role-based middleware (`requireRole('admin')`, `requireRole('technician')`). | IDOR vulnerabilities on booking and invoice endpoints patched with ownership checks. | **LOW** |
| **CSRF & Injection Defenses** | Double-submit CSRF cookie token on state-changing requests; parameterized SQL queries across all pool calls. | Zero unparameterized SQL string interpolations observed in `backend/src/`. | **LOW** |
| **Input Validation** | Strict Joi schemas validate all request bodies, route parameters, and query strings. | Invalid inputs rejected with 400 Bad Request and descriptive field errors. | **LOW** |
| **File Upload Hardening** | Magic-byte file header validation; size capped at 5 MB; files saved with random UUID names outside web root. | Tested with spoofed file extensions; invalid binaries rejected. | **LOW** |
| **Sensitive Data Exposure** | Password hashes excluded from API responses; phone numbers unmasked only upon identity verification. | Audit logs record user actions without recording plain passwords. | **LOW** |
| **Production Credentials** | Default dev secret warning displayed when `JWT_SECRET` is unconfigured. | Strict requirement for production: `JWT_SECRET` must be set in production environment. | **MEDIUM** (Operational) |

---

## 7. Findings Register

| Finding ID | Severity | Category | Description | Root Cause | Impact | Recommended Action | Status |
| :--- | :---: | :---: | :--- | :--- | :--- | :--- | :---: |
| **F-01** | **P2** | Testing | Legacy Jest tests in `backend/tests/booking.test.js` fail due to schema assertion drift. | Test assertions expect legacy response shapes (`basePrice`) rather than current invoice format. | Running `npm test` in backend reports errors even though actual Node E2E test passes 100%. | Update legacy Jest assertions to match current `OfficialInvoicePaper` payload. | **OPEN** |
| **F-02** | **P3** | Frontend | Large JavaScript bundle warning (`AdminDashboard` chunk > 1 MB) during Vite production build. | All 15 admin sub-views are imported synchronously inside `AdminDashboard.jsx`. | Initial load time for `/admin` route is slightly higher on slow network connections. | Implement `React.lazy()` code-splitting for individual admin sub-components. | **OPEN** |
| **F-03** | **P2** | Operational | Outbound WhatsApp service defaults to `mock` mode. | Production WhatsApp provider credentials (`WHATSAPP_TOKEN`) are not yet supplied in `.env`. | Real WhatsApp messages are logged to console instead of dispatched to customer phones. | Provide valid Fonnte API or Meta Cloud API token in production deployment. | **OPEN** |
| **F-04** | **P3** | Documentation | `.gitignore` properly excludes `NARA_AC*.md` audit documents from Git tracking as requested. | User requested keeping internal audit reports local without pushing to remote repository. | Reports remain secure on local machine without polluting public Git tree. | Maintain exclusion pattern in `.gitignore`. | **RESOLVED** |

---

## 8. Production Readiness Matrix & Conclusion

| Readiness Area | Verification Criteria | Observed Result | Evaluation |
| :--- | :--- | :--- | :---: |
| **Core Business Features** | All 47 Business Rules implemented and verified | 47/47 rules compliant across customer, tech, admin | **VERIFIED PASS** |
| **Frontend Production Build** | Compiles with 0 errors via `vite build` | Built in 1.11s, all chunks generated in `dist/` | **VERIFIED PASS** |
| **Frontend Automated Tests** | Unit & component tests pass | 11 suites, 48 tests pass via `vitest run` | **VERIFIED PASS** |
| **Backend End-to-End Tests** | End-to-end integration scenarios pass | 9/9 scenarios pass via `node --test` | **VERIFIED PASS** |
| **Database Migrations** | 21 migrations execute sequentially | 34 tables created, seed data operational | **VERIFIED PASS** |
| **Security Controls** | CSRF, IDOR, SQL injection, upload validation | All controls verified; 0 high-risk vulnerabilities | **VERIFIED PASS** |
| **AI Service** | 20 intents classify with entity extraction | 25/25 unit tests pass, fast response (<50ms) | **VERIFIED PASS** |
| **Data Science Pipeline** | Ingestion of 4 datasets, PII scrubbing, forecast | 9/9 unit tests pass, Streamlit operational | **VERIFIED PASS** |
| **Environment Configuration** | Production credentials and secrets provided | Development secrets currently active | **BLOCKED (Action Req.)** |
| **WhatsApp Integration** | Live message dispatch to customer devices | Running in mock mode until token supplied | **BLOCKED (Action Req.)** |

---

### Final Assessment: **CONDITIONALLY READY FOR PRODUCTION**

**Rationale:**
The NARA AC system codebase is stable, feature-complete, and rigorously tested. The architecture enforces all financial and operational business rules without client-side vulnerabilities. The system is ready to be deployed to staging and production environments immediately upon completion of standard operational prerequisites:
1. Setting a cryptographically random, 32-character string for `JWT_SECRET` in `backend/.env`.
2. Setting `NODE_ENV=production` and configuring the production PostgreSQL connection string (`DATABASE_URL`).
3. Configuring live WhatsApp provider credentials (`WHATSAPP_MODE=fonnte` or `meta`, and `WHATSAPP_TOKEN`) for outbound messaging.

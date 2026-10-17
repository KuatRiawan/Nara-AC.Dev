# NARA AC — IMPLEMENTATION STATUS & PENDING DECISIONS

**Project:** NARA AC — Sistem Pengelolaan Jadwal dan Pengingat Service AC (`A26-CS054`)  
**Legal Entity:** CV. Nara Teknindotama  
**Date:** 17 Oktober 2026  

---

## 1. Implemented and Verified Functionality

1. **Membership & Pricing (`BR-01` – `BR-06`):**
   - Server-side 10% membership discount calculation strictly on `biaya_jasa` (`BR-02`), excluding `biaya_sparepart` (`BR-03`).
   - Dual approval workflow (`proposeServiceFeeChange` + `approveServiceFeeChange`) requiring both Customer and Admin approval before additional service charges modify `biaya_jasa` (`BR-04`).
   - Frontend Admin Home (`AdminHome.jsx`) and Admin Invoices (`AdminInvoices.jsx`) synchronized with `BR-02` and `BR-38`.
2. **Booking, Scheduling & Technician Assignment (`BR-07` – `BR-16`):**
   - Automatic slot confirmation (`status = 'scheduled'`), overlapping slot conflict rejection (`409 SLOT_CONFLICT`), and 24-hour minimum cancellation rule (`422 CANCELLATION_TOO_LATE`).
   - Multi-unit duration scaling (`jumlah_unit * 60` minutes) and `isAdmin = true` override in `adminReschedule`.
   - Technician availability enforcement (`technician_availability` status `off`/`busy`) in `assignTechnician`.
   - 48-hour automatic work completion confirmation (`autoConfirmOverdueCompletions`, `BR-14`) integrated into the 15-minute background scheduler.
3. **Technician Field Workspace & Review Gate (`BR-21` – `BR-22`):**
   - Mobile-optimized technician dashboard supporting `'scheduled'`, `'rescheduled'`, `'delayed'`, `'on_the_way'`, and `'in_progress'` jobs, unique checklist DOM IDs, before/after photo requirements, spare-part usage, and additional service fee proposals.
   - Customer review gate (`POST /api/v1/customer/bookings/:id/review`) requiring both `status = 'done'` and `konfirmasi_pelanggan = TRUE`.
4. **Warranty Management (`BR-23` – `BR-32`):**
   - Configurable warranty duration (`14`, `30`, or `45` days) per service catalog item (`service_catalog.garansi_hari`).
   - Mandatory rating & review comment on warranty claim submission, single active claim per booking enforcement (`409 ACTIVE_CLAIM_EXISTS`), free (`Rp 0`) warranty inspection scheduling, and zero unauthorized charges on claim rejection.
5. **Invoices, Payments & Reconciliation (`BR-33` – `BR-42`):**
   - Configurable payment schemes (`DP 50%`, `Bayar Penuh`) and payment methods (`transfer`, `qris`, `cash`).
   - Two-stage invoicing (`initial` at booking, `final` after completion), manual Admin verification for bank transfers (`disetujui: true/false`), underpayment (`kurang_bayar`) and overpayment (`lebih_bayar` + refund) tracking, and automatic retry of failed WhatsApp invoice deliveries.
6. **AI WhatsApp Assistant & Webhook Reliability (`BR-43` – `BR-47`, `SEC-004`):**
   - 20-intent Indonesian NLP classifier (`ai-service/intent_model.pkl`) with entity extraction (`booking_code`, `ac_brand`, `pk`, `date`, `keluhan`, `jumlah_unit`), confidence-gated fallback, and human-admin handoff (`AdminWhatsApp.jsx`).
   - Webhook HMAC-SHA256 / token verification (`verifyWebhookSignature`) and `message_id` duplicate-event idempotency (`whatsapp_webhook_events`).
7. **Governed Data Science Pipeline (`DS-001`, `DS-002`):**
   - Complete profiling, relational validation, and PII tokenization (`data-science/data/governed/`) of the 4 real operational datasets (`251` RFM customers, `79` B2B projects, `527` daily time-series rows, `545` transactions).
   - Leak-free time-aware demand forecasting (`453` train days, `74` held-out test days) with 14-day forecast served via `/api/v1/analytics/predictions`.
8. **Security Hardening (`SEC-001` – `SEC-004`):**
   - Sanitized `.env` secrets, enforced 8-digit minimum phone verification on public endpoints, and closed cross-customer IDOR on warranty info and WhatsApp invoice triggers.
9. **Legal & Brand Identity Alignment (`FE-008`):**
   - Updated `TermsConditionsPage.jsx`, `PrivacyPolicyPage.jsx`, `LandingPage.jsx`, `useBusinessProfile.js`, and migration `019` with official **CV. Nara Teknindotama** credentials (`NIB: 2805250066735`, `AHU-0045403-AH.01.14 Tahun 2025`, `NPWP: 10.000.000.0-258.288`, `0813-8529-3137`).

---

## 2. Implemented But Pending Live Environment Verification

1. **Live PostgreSQL Migration Execution (`001`–`019`):**
   - SQL syntax and query semantics are verified via automated tests, but running `npm run migrate` against the target production PostgreSQL instance is required during deployment.
2. **Live External WhatsApp Provider Delivery:**
   - Outbound queue, webhook signature verification, idempotency, and retry logic are implemented and verified in sandbox/mock mode. Live delivery to customer phones requires production `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`.

---

## 3. Existing Functionality Preserved Unchanged

- Core 4-step customer booking UI layout and state machine (`BookingPage.jsx`).
- Role-based JWT authentication middleware (`middleware/auth.js`) and password hashing (`bcryptjs`).
- Spare parts inventory CRUD and low-stock notification alerts (`AdminInventory.jsx`, `master.js`).
- Technician commission and attendance tracking tables (`006_technician_commission.sql`).

---

## 4. Pending Business and Legal Decisions (Section 7.8 of Specification)

In strict compliance with Section 7.8 of the prompt and the attached **Business Rules Specification (Draft v1.0)**, the following 10 unresolved operational rules have **not** been arbitrarily hardcoded as rigid policies. Instead, they are documented below with their affected modules and exposed as safe, owner-configurable parameters in `settings` (`AdminSettings.jsx`):

| # | Unresolved Business Rule | Affected Modules | Safe Configurable Baseline Implemented | Owner Decision Needed |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Payment deadlines & consequences for overdue invoices** | `paymentService.js`, `Bookings` | Unpaid bookings remain active with `status_pembayaran = 'unpaid'` (`BR-37`); no automatic cancellation is triggered. | Define exact payment deadline (e.g., H+3 or H+7 after final invoice) and late-payment escalation policy. |
| **2** | **Handling cancellations made `< 24` hours before appointment** | `bookingService.js`, `workflowService.js` | Self-service cancellation `< 24h` is blocked (`422 CANCELLATION_TOO_LATE`, `BR-09`); Admin can override or reschedule manually. | Confirm whether `< 24h` cancellations incur an administrative/transport fee or forfeit DP. |
| **3** | **Slot duration, operating hours & technician capacity** | `bookingService.js`, `settings` | Configurable in `settings`: `jam_kerja_mulai = '08:00'`, `jam_kerja_selesai = '17:00'`, `kapasitas_teknisi_per_slot = 3`, `60` mins/unit. | Confirm standard duration per service type (e.g., Cuci AC vs. Bongkar Pasang) and maximum concurrent slots. |
| **4** | **Customer waiting limits (technician on-site wait time)** | `workflowService.js`, `settings` | Configurable in `settings`: `batas_tunggu_pelanggan_menit = 30`; technician can mark job as `'delayed'` or request admin reschedule (`BR-13`). | Confirm maximum technician waiting time on-site before marking a visit as a failed/rescheduled attempt. |
| **5** | **Whether submitted service reports may be edited** | `workflowService.js`, `TechnicianJobDetail.jsx` | Once `status = 'done'`, technicians cannot overwrite the report; Admin can adjust invoice/notes before final validation. | Confirm whether technicians may edit a report prior to customer confirmation (`konfirmasi_pelanggan = FALSE`). |
| **6** | **Warranty claim submission deadlines & active-claim expiration** | `warrantyService.js`, `settings` | Claims must be submitted before `garansi_berakhir_pada` (`14/30/45` days from completion); `batas_hari_klaim_garansi` configurable in `settings`. | Confirm how long an `inspection_scheduled` claim remains active if the customer is unreachable. |
| **7** | **Review rating range & review editing** | `customer.js`, `feedback` | Rating range enforced as integer `1` to `5`; one review per completed booking (`UNIQUE(booking_id)`). | Confirm whether customers are permitted to edit a submitted review after warranty resolution. |
| **8** | **WhatsApp retry count, retry intervals & final failure handling** | `reminderService.js`, `paymentService.js`, `settings` | Configurable `wa_max_retry = 3` on a 15-minute scheduler interval; failed deliveries are flagged on Admin Dashboard. | Confirm exact backoff schedule and manual fallback SOP when all WhatsApp retries fail. |
| **9** | **Refund deadlines & cash refund procedures** | `paymentService.js`, `AdminBookings.jsx` | Overpayments (`lebih_bayar`) transition to `refund_diproses` and `refund_selesai` upon Admin recording `nominal_refund`. | Confirm SLA (e.g., 1–3 business days) and bank transfer vs. cash refund verification SOP. |
| **10** | **Out-of-stock spare-part handling** | `workflowService.js`, `spare_parts` | Stock is decremented with `GREATEST(stok - qty, 0)` and triggers an `'inventory'` admin notification when `stok <= stok_minimum`. | Confirm whether out-of-stock parts should block work-order completion or create a pending follow-up visit. |

---

## 5. Remaining Deployment Prerequisites & Exact Next Actions

1. **Provision Production Environment Variables (`backend/.env`):**
   - Set `DATABASE_URL` to the production PostgreSQL connection string.
   - Set a cryptographically strong `JWT_SECRET` (`openssl rand -hex 32`).
   - Set `WHATSAPP_MODE=meta` (or `fonnte`), `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_WEBHOOK_SECRET`.
   - Set `AI_SERVICE_URL=http://localhost:8000` and `FRONTEND_URL=https://app.narateknindotama.com`.
2. **Run Database Migrations:**
   - Execute `cd backend && npm run migrate` to apply `001_init.sql` through `019_full_audit_remediation.sql`.
3. **Start Services:**
   - Start AI Service: `cd ai-service && uvicorn main:app --host 0.0.0.0 --port 8000`
   - Start Backend API: `cd backend && npm start`
   - Build & Serve Frontend: `cd frontend && npm run build`
4. **Management Sign-Off:**
   - Review the 10 configurable operational rules in Section 4 above and obtain legal counsel sign-off on `/terms-conditions` and `/privacy-policy`.

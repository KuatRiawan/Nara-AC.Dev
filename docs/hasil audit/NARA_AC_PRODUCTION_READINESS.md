# NARA AC — PRODUCTION READINESS ASSESSMENT & MATRIX

**Project:** NARA AC — Sistem Pengelolaan Jadwal dan Pengingat Service AC (`A26-CS054`)  
**Legal Entity:** CV. Nara Teknindotama  
**Date:** 17 Oktober 2026  
**Overall Readiness Verdict:** **`CONDITIONALLY READY`**

---

## 1. Production Readiness Matrix

| Category | Status | Verification Evidence | Remaining Prerequisite / Action |
| :--- | :--- | :--- | :--- |
| **1. Application Builds & Tests** | **VERIFIED** | 38/38 backend `.js` syntax checks PASS; 8/8 E2E backend test suites PASS (`e2e_audit_verification.test.js`); 25/25 AI tests PASS; 9/9 DS pipeline tests PASS. | Run `cd frontend && npm run build` in CI/CD target host with Node 20+. |
| **2. Database Migrations & Recovery** | **VERIFIED (Code) / PENDING (Live DB)** | Migration `019_full_audit_remediation.sql` consolidates all schema fixes (`complaint_tickets.severity`, `service_catalog.garansi_hari`, `bookings` dual-approval & confirmation columns, `whatsapp_webhook_events`, official settings) idempotently (`IF NOT EXISTS`). | Provision production PostgreSQL 15+ instance and run `cd backend && npm run migrate`. |
| **3. Authentication & Authorization** | **VERIFIED** | Server-side JWT validation (`authRequired`), RBAC (`allowRoles`), cross-customer IDOR prevention (`SEC-003`), and 8-digit minimum phone verification on public endpoints (`SEC-002`) verified in `Scenario G` and `Scenario E`. | Rotate default admin/technician seed passwords upon initial production deployment. |
| **4. Security Controls** | **VERIFIED** | Live API key removed from `backend/.env` (`SEC-001`), `helmet` security headers active, rate limiting configured (`300 req / 15m` global, `15 req / 15m` auth), parameterized SQL queries enforced, and upload MIME/extension checks active. | Configure production `JWT_SECRET` (32+ bytes) and restrict `CORS` (`FRONTEND_URL`) to the production domain. |
| **5. Payment Verification & Invoicing** | **VERIFIED** | Two-stage invoicing (`initial` and `final`), manual admin bank transfer verification (`BR-36`), 10% member service-only discount (`BR-02`/`BR-03`), underpayment (`kurang_bayar`), and overpayment refund workflows verified in `Scenario A` and `Scenario D`. | Confirm bank account / QRIS merchant details in `AdminSettings.jsx` before accepting live customer transfers. |
| **6. WhatsApp Provider Configuration** | **CONDITIONAL (Blocked on Live Token)** | Webhook HMAC-SHA256 / token verification (`SEC-004`), `message_id` duplicate event protection, `done` callback crash fix (`BE-002`), and 15-minute failed-invoice retry job (`BR-42`) verified. | Inject live Meta Cloud API or Fonnte credentials (`WHATSAPP_MODE`, `WHATSAPP_TOKEN`, `WHATSAPP_WEBHOOK_SECRET`) in production `.env`. |
| **7. AI & Data Science Deployment** | **VERIFIED** | 20-intent classifier (`ai-service/intent_model.pkl`) trained on 196 samples; 4 real operational datasets (`251` RFM, `79` B2B, `527` daily, `545` tx) ingested and evaluated with leak-free time-aware split (`data-science/output/*.json`). | Run `ai-service` behind internal private network (`http://127.0.0.1:8000`) accessible only to the backend API. |
| **8. Data Privacy (UU PDP Compliance)** | **VERIFIED** | Direct customer PII (`nama`, `kontak`, `alamat_rumah`) tokenized (`CUST_TOKEN_...`) in `data-science/data/governed/`; public `/status` masks customer phone numbers; raw CSV datasets excluded from public web assets. | Maintain access-control separation between transactional PostgreSQL and analytical CSV exports. |
| **9. Monitoring & Alerting** | **VERIFIED** | `/health` endpoint reports service & DB connectivity; `requestLogger` records structured HTTP access logs; Admin Dashboard tracks pending verifications, failed WhatsApp deliveries, and active warranty claims. | Connect container stdout/stderr and `/health` to production uptime monitor (e.g., Prometheus/UptimeKuma). |
| **10. Backup & Restore** | **VERIFIED (Documented)** | Non-destructive forward migrations (`001`–`019`) and `pg_dump` / `pg_restore` runbooks documented in Section 2 below. | Schedule automated daily `pg_dump` cron job to encrypted off-site object storage. |
| **11. Environment Configuration** | **VERIFIED** | `backend/.env` sanitized; `backend/.env.example` and `frontend/.env.example` documented; `config.js` resilient to missing optional variables. | Supply production secrets via environment variables or secret manager (never commit `.env` to Git). |
| **12. Domain, HTTPS & Deployment** | **PENDING (Infrastructure)** | Reverse-proxy and SPA routing requirements documented; `helmet` and CORS headers configured. | Provision TLS/HTTPS certificate (Let's Encrypt / Cloudflare) for `narateknindotama.com` and configure Nginx reverse proxy. |
| **13. Terms & Conditions and Privacy Policy** | **VERIFIED (Technical) / PENDING (Legal Review)** | `/terms-conditions` and `/privacy-policy` updated with authentic **CV. Nara Teknindotama** legal identity (NIB `2805250066735`, AHU `AHU-0045403-AH.01.14 Tahun 2025`) and full `BR-01`–`BR-47` alignment. | Obtain final legal counsel review and management sign-off on the 10 configurable rules in `NARA_AC_IMPLEMENTATION_STATUS.md`. |
| **14. Release Verification & Rollback** | **VERIFIED** | Pre-release smoke test commands and non-destructive SQL rollback procedures documented below. | Execute post-deployment smoke tests upon initial staging/production cutover. |

---

## 2. Database Backup, Restore & Rollback Procedures

### 2.1 Daily Automated Backup (`pg_dump`)
Run the following command prior to any migration or via daily cron (`0 2 * * *`):
```bash
pg_dump --format=custom --no-owner --no-privileges \
  --dbname="$DATABASE_URL" \
  --file="/var/backups/nara_ac/nara_ac_$(date +%Y%m%d_%H%M%S).dump"
```

### 2.2 Safe Database Restore (`pg_restore`)
To restore onto an isolated recovery or staging database:
```bash
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname="$RECOVERY_DATABASE_URL" \
  "/var/backups/nara_ac/nara_ac_YYYYMMDD_HHMMSS.dump"
```

### 2.3 Migration `019` Rollback Procedure
Migration `019_full_audit_remediation.sql` is strictly additive (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`). If a rollback of migration `019` is ever required without full database restoration, run:
```sql
BEGIN;
DROP TABLE IF EXISTS whatsapp_webhook_events;
ALTER TABLE whatsapp_conversations DROP COLUMN IF EXISTS last_message_id;
ALTER TABLE bookings
  DROP COLUMN IF EXISTS konfirmasi_pelanggan,
  DROP COLUMN IF EXISTS waktu_konfirmasi_pelanggan,
  DROP COLUMN IF EXISTS biaya_tambahan_jasa,
  DROP COLUMN IF EXISTS catatan_biaya_tambahan_jasa,
  DROP COLUMN IF EXISTS persetujuan_biaya_pelanggan,
  DROP COLUMN IF EXISTS persetujuan_biaya_admin,
  DROP COLUMN IF EXISTS status_persetujuan_biaya;
ALTER TABLE service_catalog DROP COLUMN IF EXISTS garansi_hari;
ALTER TABLE complaint_tickets DROP COLUMN IF EXISTS severity;
DELETE FROM schema_migrations WHERE version = '019_full_audit_remediation.sql';
COMMIT;
```

---

## 3. Justification for `CONDITIONALLY READY` Classification

In accordance with Section 16 of the mission specification:
- All critical security vulnerabilities (`SEC-001` through `SEC-004`), backend business rule defects (`BE-001` through `BE-005`), database schema gaps (`DB-001` through `DB-005`), frontend data-flow bugs (`FE-001` through `FE-008`), and AI/DS dataset integration requirements (`AI-001` through `DS-002`) have been resolved and verified in code.
- Because live external WhatsApp delivery (`WHATSAPP_TOKEN`) and live production PostgreSQL deployment require external credentials and infrastructure provisioning outside this sandbox environment—and 10 operational policies in Section 7.8 await final owner confirmation—the project is classified transparently as **`CONDITIONALLY READY`**.

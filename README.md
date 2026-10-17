# NARA AC — Sistem Pengelolaan Jadwal dan Pengingat Service AC

**Project Code:** `A26-CS054`  
**Company Identity:** **CV. Nara Teknindotama** (NIB: `2805250066735` · AHU: `AHU-0045403-AH.01.14 Tahun 2025` · NPWP: `10.000.000.0-258.288`)  
**Address:** Jalan Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor, Jawa Barat  
**Contact:** `0813-8529-3137` · `narateknindotama@gmail.com` · `www.narateknindotama.com`

---

## 1. Architecture Overview

NARA AC is an integrated, full-stack operational platform for AC servicing, scheduling, technician field reporting, dual-stage invoicing, warranty management, automated WhatsApp maintenance reminders, AI customer support, and governed data-science demand forecasting.

```text
Nara-AC-Local/
├── frontend/                  # React 18 + Vite 5 + Tailwind CSS 3.4 (Port 5173)
│   └── src/
│       ├── api/client.js      # Centralized HTTP client (unwraps payload.data)
│       ├── components/        # Navbar, Footer, ChatbotWidget, AddressSelector, UI primitives
│       └── pages/             # LandingPage, BookingPage, StatusPage, CustomerDashboard,
│                              # AdminDashboard (14 views incl. AdminWhatsApp),
│                              # TechnicianDashboard, TechnicianJobDetail, Legal pages
├── backend/                   # Node.js + Express 4.19 + PostgreSQL Pool (Port 3000)
│   ├── migrations/            # SQL migrations 001_init.sql through 019_full_audit_remediation.sql
│   ├── src/
│   │   ├── routes/            # auth, bookings, customer, technician, admin, payments,
│   │   │                      # claims, whatsapp, analytics, master, ops
│   │   └── services/          # bookingService, workflowService, paymentService,
│   │                          # warrantyService, reminderService, chatService,
│   │                          # whatsappService, analyticsService
│   └── tests/                 # Automated E2E & security verification suite (Scenarios A–I)
├── ai-service/                # FastAPI + 20-intent NLP Classifier & Entity Extractor (Port 8000)
│   ├── main.py                # /predict-intent, /answer, /conversation, /health
│   ├── train.py               # Reproducible model training (196 Indonesian domain samples)
│   ├── ml_compat.py           # Pure-Python TF-IDF + Classifier fallback for Python 3.13+
│   └── test_ai_improvements.py# 25 automated NLP & entity extraction unit tests
├── data-science/              # Governed Dataset Ingestion, PII Tokenization & Forecasting
│   ├── ingest_and_train.py    # Profiles 4 real CSVs, tokenizes PII, trains leak-free model
│   ├── data/governed/         # Anonymized/tokenized datasets (zero raw phone/address PII)
│   ├── output/                # predictions.json, dataset_profile_report.json, rfm_b2b_summary.json
│   └── test_pipeline.py       # 9 automated data governance & forecasting unit tests
└── design-system/nara-ac/     # UI/UX Pro Max persisted design system (MASTER.md)
```

---

## 2. Key Business Rules Enforced (`A26-CS054 Draft v1.0`)

- **Membership & Pricing (`BR-01` – `BR-06`):** Registered members receive a **10% discount strictly on service fees (`biaya_jasa`)**; spare parts (`biaya_sparepart`) are excluded. Changes to service fees require **dual approval** from both Customer and Admin.
- **Booking & Scheduling (`BR-07` – `BR-16`):** Automatic slot confirmation when available, conflict rejection (`409`), minimum 24-hour customer cancellation rule (`422`), multi-unit duration scaling (`60 mins × jumlah_unit`), manual Admin technician assignment with availability checks (`off`/`busy`), and **48-hour automatic work completion confirmation** (`BR-14`).
- **Technician Work Reports & Reviews (`BR-21` – `BR-22`):** Field reports capture before/after photos, service checklists, work notes, and spare parts. Customer reviews unlock only after `status = 'done'` and `konfirmasi_pelanggan = TRUE`.
- **Warranty (`BR-23` – `BR-32`):** Configurable **14, 30, or 45 days** per service catalog item starting at job completion. Claims require a rating and comment, enforce at most **one active claim per booking**, and schedule free (`Rp 0`) warranty inspection visits.
- **Invoices & Payments (`BR-33` – `BR-42`):** Initial invoice issued at booking; final invoice issued after completion. Supports Bank Transfer (manual Admin verification required), QRIS, and Cash, with underpayment (`kurang_bayar`), overpayment (`lebih_bayar` + refund), and WhatsApp invoice retry tracking.
- **WhatsApp & AI Assistant (`BR-43` – `BR-47`, `SEC-004`):** HMAC-SHA256 / token webhook authentication, `message_id` idempotency deduplication, 20-intent NLP classification, and seamless human-admin handoff (`/admin/whatsapp-cs`).

---

## 3. Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Backend API port | `3000` |
| `NODE_ENV` | Runtime environment (`development` / `production`) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/nara_ac` |
| `JWT_SECRET` | Cryptographic secret for JWT signing (min 32 chars in prod) | `replace-with-strong-32-byte-secret` |
| `FRONTEND_URL` | Allowed CORS origin for frontend app | `http://localhost:5173` |
| `AI_SERVICE_URL` | Internal URL for FastAPI AI service | `http://localhost:8000` |
| `WHATSAPP_MODE` | `mock` (local logging), `fonnte`, or `meta` | `mock` |
| `WHATSAPP_TOKEN` | Provider API token for outbound WhatsApp messages | *(set in production)* |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp Business Phone Number ID | *(set in production)* |
| `WHATSAPP_WEBHOOK_SECRET` | HMAC-SHA256 secret or token for `/api/v1/whatsapp/webhook` | *(set in production)* |

For the frontend (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

---

## 4. Setup, Database Migration & Running Services

### 4.1 Database Setup & Migrations
```bash
cd backend
npm install
npm run migrate   # Applies 001_init.sql through 019_full_audit_remediation.sql
npm run seed      # Optional: seeds initial demo catalog & accounts for development
```

### 4.2 Start Backend API (`:3000`)
```bash
cd backend
npm start         # Production mode (or `npm run dev` for nodemon)
```

### 4.3 Train & Start AI Service (`:8000`)
```bash
cd ai-service
python3 train.py  # Trains intent_model.pkl on 196 Indonesian domain samples
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 4.4 Run Governed Data Science Pipeline
Place the governed CSV datasets in `data-science/raw_datasets/` (or pass `--data-dir`) and run:
```bash
cd data-science
python3 ingest_and_train.py
```
Outputs are written to `data-science/data/governed/` (PII-tokenized CSVs) and `data-science/output/` (`predictions.json`, `dataset_profile_report.json`, `rfm_b2b_summary.json`).

### 4.5 Start Frontend Application (`:5173`)
```bash
cd frontend
npm install
npm run dev       # Development server on http://localhost:5173
npm run build     # Production bundle in frontend/dist/
```

---

## 5. Automated Testing Commands

Run all verification suites from the repository root:

```bash
# 1. Backend End-to-End Business Rules & Security Suite (Scenarios A–I)
node --test backend/tests/e2e_audit_verification.test.js

# 2. Backend Static Syntax Check (all 38 JS modules)
find backend/src -name "*.js" -exec node --check {} +

# 3. AI Service NLP & Entity Extraction Unit Tests (25 tests)
python3 -m unittest discover -s ai-service -p "test_*.py" -v

# 4. Data Science Governed Pipeline & Forecasting Tests (9 tests)
python3 -m unittest discover -s data-science -p "test_*.py" -v
```

---

## 6. Audit & Production Readiness Reports

Detailed audit and readiness documentation is available in the repository root:
- [`NARA_AC_FULL_AUDIT_REPORT.md`](./NARA_AC_FULL_AUDIT_REPORT.md) — Complete audit findings (`SEC`, `DB`, `BE`, `FE`, `AI`, `DS`), root causes, remediations, and dataset profiling.
- [`NARA_AC_BUG_FIX_LOG.md`](./NARA_AC_BUG_FIX_LOG.md) — Itemized log of all 18 code and schema remediations with verification outcomes.
- [`NARA_AC_VERIFICATION_CHECKLIST.md`](./NARA_AC_VERIFICATION_CHECKLIST.md) — 20-category verification checklist across all system layers.
- [`NARA_AC_IMPLEMENTATION_STATUS.md`](./NARA_AC_IMPLEMENTATION_STATUS.md) — Implementation status and documentation of the 10 configurable business rules from Section 7.8.
- [`NARA_AC_PRODUCTION_READINESS.md`](./NARA_AC_PRODUCTION_READINESS.md) — Production readiness matrix, database backup/restore/rollback runbooks, and final `CONDITIONALLY READY` gate assessment.

# NARA AC — Sistem Pengelolaan Jadwal dan Pengingat Service AC

**Project Code:** `A26-CS054`  
**Company Identity:** **CV. Nara Teknindotama**  
- **NIB:** `2805250066735`  
- **AHU:** `AHU-0045403-AH.01.14 Tahun 2025`  
- **NPWP:** `10.000.000.0-258.288`  
- **Official Address:** Jalan Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor, Jawa Barat  
- **Contact:** `0813-8529-3137` · `narateknindotama@gmail.com` · `www.narateknindotama.com`

---

## 1. Project Overview

### 1.1 Purpose & Problem Statement
NARA AC is an end-to-end digital operations platform built specifically for **CV. Nara Teknindotama**, an air conditioning maintenance and engineering service contractor in the Greater Jakarta (Jabodetabek) region. 

Traditional residential and commercial HVAC service operations face critical operational bottlenecks:
- **Unreliable Manual Reminders:** Customers forget routine cleaning intervals (typically 60–90 days), resulting in equipment breakdown, higher electrical consumption, and lost recurring revenue.
- **Scheduling Conflicts & Inefficient Dispatch:** Overlapping technician allocations, travel distance delays, and mismatched technical capacity.
- **Field Reporting & Quality Gaps:** Disconnected work logs, missing before/after visual proof, unrecorded spare parts usage, and contentious warranty disputes.
- **Invoicing & Cash Flow Friction:** Inaccurate discounts, unverified manual bank transfers, delayed payment proof reconciliation, and lack of official printed invoices.

### 1.2 Implemented Core Capabilities
- **Customer Self-Service Portal & Public Booking:** Instant online booking with real-time operational hour slot constraints, multi-unit time scaling, guest status tracking, unmasked verified phone authentication, and service history.
- **Technician Mobile Field Console:** Work order dispatch, step-by-step diagnostic checklists, before/after photo uploads with magic-byte validation, spare parts consumption logging, and customer sign-off.
- **Admin Control Center:** Unified management of bookings, technicians, customers, inventory stock tracking, service catalog pricing, invoice verification, warranty claims, and scheduled reminders.
- **Dual-Stage Invoicing Engine:** Automated initial estimate generation at booking and final invoice generation post-service with strict 10% membership discount applied strictly to service fees (`biaya_jasa`).
- **AI Customer Assistant:** 20-intent natural language processing (NLP) classifier and entity extraction engine for WhatsApp customer inquiries and conversational booking assistance with human handoff.
- **Governed Data Science & Analytics:** Predictive demand forecasting, RFM customer segmentation, B2B project margin reconciliation, and Streamlit operational dashboard integrated with live PostgreSQL data.

### 1.3 Target Roles
1. **Public / Guest Customers:** Book services without prior login, track orders via booking code, download official invoices, and submit warranty claims.
2. **Registered Members:** Manage saved AC unit profiles, access automatic 10% service labor discounts, and view lifetime service history.
3. **Field Technicians:** Receive mobile work orders, upload inspection photos, complete checklists, and log replacement components.
4. **Operations / Admin:** Dispatch technicians, adjust schedule slots, verify bank transfers, review customer feedback, and govern business settings.

---

## 2. Architecture Overview

```mermaid
flowchart TD
    subgraph Clients["Frontend Clients (React 19 + Tailwind CSS 4)"]
        Landing["Landing & Booking Page\n(:5173/booking)"]
        CustPortal["Customer Portal\n(:5173/customer)"]
        TechPortal["Technician Field Web App\n(:5173/technician)"]
        AdminDash["Admin Dashboard\n(:5173/admin)"]
    end

    subgraph BackendAPI["Backend Core (Node.js 18+ / Express 4.19)"]
        APIGateway["Express API Router\n(/api/v1 - Port 4000)"]
        AuthMid["Auth & CSRF Middleware\n(JWT + httpOnly Cookie)"]
        BookingSvc["Booking & Slot Engine"]
        WorkflowSvc["Work Order & Report Engine"]
        PaymentSvc["Invoice & Payment Engine"]
        WarrantySvc["Warranty Claim Engine"]
        ReminderSvc["Node-Cron Scheduler\n(07:00 WIB Daily)"]
    end

    subgraph DataStore["Authoritative Persistence"]
        PG[("PostgreSQL 14+\n34 Tables / 21 Migrations")]
        DiskStorage[("Local File Storage\nbackend/uploads/")]
    end

    subgraph Intelligence["AI & Data Science Services"]
        FastAPI["AI Service (FastAPI / Port 8000)\n20-Intent NLP & Entity Extraction"]
        Streamlit["Data Science Dashboard\n(Streamlit / Port 8501)"]
        DSPipeline["Governed Ingestion Pipeline\n(data-science/ingest_and_train.py)"]
        CSVStore[("Governed Datasets\nRFM, B2B, TimeSeries, Transaksi")]
    end

    subgraph External["External Integrations"]
        WA["WhatsApp Gateway\n(Mock / Fonnte / Meta Cloud)"]
        Gemini["Google Gemini API\n(gemini-flash-lite)"]
    end

    Landing -->|REST / JSON| APIGateway
    CustPortal -->|REST / JWT| APIGateway
    TechPortal -->|REST / JWT| APIGateway
    AdminDash -->|REST / JWT| APIGateway

    APIGateway --> AuthMid
    AuthMid --> BookingSvc
    AuthMid --> WorkflowSvc
    AuthMid --> PaymentSvc
    AuthMid --> WarrantySvc

    BookingSvc --> PG
    WorkflowSvc --> PG
    PaymentSvc --> PG
    WarrantySvc --> PG
    ReminderSvc --> PG

    WorkflowSvc -->|Multipart Upload| DiskStorage
    PaymentSvc -->|Payment Proof| DiskStorage

    APIGateway -->|HTTP / JSON| FastAPI
    APIGateway -->|Optional LLM| Gemini
    ReminderSvc -->|Webhook / API| WA
    PaymentSvc -->|Invoice Delivery| WA

    DSPipeline --> CSVStore
    DSPipeline --> PG
    Streamlit --> CSVStore
    Streamlit --> PG
    AdminDash -.->|Embed / Link| Streamlit
```

### Component Interaction Architecture
1. **Frontend to Backend:** React 19 SPA makes authenticated REST calls to `/api/v1` using Axios. In production, Vite proxies or Nginx routes `/api` to port `4000`. Authentication uses JWT stored in secure cookies or `Authorization: Bearer` headers.
2. **Database Integrity:** PostgreSQL serves as the single source of truth across 34 relational tables. All critical state transitions (booking cancellation, payment verification, warranty eligibility) use ACID database transactions.
3. **AI Service:** Python FastAPI microservice on port `8000` provides fast (<50ms) intent classification and entity slot extraction (brands, capacities, dates, booking codes) for chatbot and WhatsApp conversations.
4. **Data Science & Analytics:** Offline and scheduled ingestion scripts profile and anonymize operational data, outputting evaluated model forecasts and RFM distributions for both the admin React analytics view and the Streamlit dashboard on port `8501`.
5. **Background Scheduler:** In-process `node-cron` worker triggers daily at `07:00 WIB` to evaluate AC units due for maintenance (`interval_perawatan_hari`), issuing deduplicated WhatsApp reminders.

---

## 3. Technology Stack

| Layer | Technology | Verified Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `19.3.0` | Declarative user interface with React Router DOM `7.18.4` |
| **Build & Dev Tool** | Vite | `8.3.3` | Ultra-fast bundling, dev server, and production chunk optimization |
| **Styling & Design** | Tailwind CSS | `4.3.3` | Utility-first responsive styling with `@tailwindcss/vite` |
| **Component Icons** | Lucide React | `1.52.0` | Comprehensive iconography |
| **Animation** | Framer Motion | `14.1.0` | Smooth UI transitions and accessible motion control |
| **Charts & Metrics** | Recharts | `3.10.1` | Native React analytical graphs and demand forecast curves |
| **Backend Runtime** | Node.js | `>= 18.0.0` | High-performance asynchronous backend runtime |
| **Web Framework** | Express | `4.19.2` | REST API routing, rate limiting, and middleware orchestration |
| **Database** | PostgreSQL | `>= 14` (`pg 8.12.0`) | ACID relational persistence with connection pooling |
| **Validation** | Joi | `17.13.3` | Strict schema validation for all query params and request bodies |
| **Security** | Helmet & BcryptJS | `7.1.0` / `2.4.3` | HTTP header hardening, CSP, and salted password hashing |
| **Job Scheduling** | Node-Cron | `4.0.0` | Cron execution for maintenance reminders and auto-confirmation |
| **AI NLP Service** | Python / FastAPI | `3.9+` / `0.110+` | Machine learning classification and slot extraction microservice |
| **ML Libraries** | Scikit-Learn & Joblib | `1.3+` / `1.3+` | TF-IDF vectorization, Ridge regression, and Naive Bayes models |
| **DS Dashboard** | Streamlit | `1.32+` | Standalone interactive data science and forecasting dashboard |
| **Testing** | Vitest & Node Test | `5.0.4` / Node 18+ | 48 frontend UI tests and 9 comprehensive backend E2E suites |

---

## 4. Repository Structure

```text
Nara-AC-Local/
├── frontend/                          # Client-side React 19 Single Page Application
│   ├── public/                        # Static assets, favicon, PWA service worker & manifest
│   ├── src/
│   │   ├── api/                       # API clients and unified error handler
│   │   ├── components/                # Reusable UI primitives, modals, navbar, layout
│   │   │   ├── admin/                 # Admin-specific modals (Create Booking, Assign Tech)
│   │   │   ├── booking/               # Address selectors, service cards, date pickers
│   │   │   ├── landing/               # Hero interactive card, reviews, gallery, estimators
│   │   │   ├── layout/                # Responsive DashboardLayout, Header, BottomNavigation
│   │   │   └── ui/                    # Buttons, Badges, Inputs, ConfirmationModal, Toasts
│   │   ├── hooks/                     # Custom React hooks (useBusinessProfile, useContextualBack)
│   │   ├── pages/                     # Routed screen components
│   │   │   ├── admin/                 # 15 Admin operational views (Bookings, Invoices, etc.)
│   │   │   ├── customer/              # Customer Portal (Dashboard, AC Units, History, Profile)
│   │   │   ├── BookingPage.jsx        # Public multi-step booking wizard
│   │   │   ├── LandingPage.jsx        # High-conversion public homepage
│   │   │   ├── LoginPage.jsx          # Customer OTP & password authentication
│   │   │   ├── StaffLoginPage.jsx     # Admin & Technician secure login
│   │   │   └── StatusPage.jsx         # Real-time booking tracking & official invoice paper
│   │   └── test/                      # 11 Vitest test suites (Accessibility, Invoices, Routing)
│   ├── package.json                   # Frontend dependencies and test scripts
│   └── vite.config.js                 # Vite bundler configuration and API proxy
│
├── backend/                           # Server-side REST API and business logic
│   ├── migrations/                    # 21 sequential SQL migrations (001_init to 020_b2b_projects)
│   ├── src/
│   │   ├── db/                        # PostgreSQL pool connection, migrator, and seeders
│   │   ├── middleware/                # JWT auth, CSRF tokens, Joi validation, error handlers
│   │   ├── routes/                    # Express route controllers (admin, customer, ops, etc.)
│   │   ├── services/                  # Authoritative business logic engines
│   │   │   ├── acUnitService.js       # Customer unit catalog & service history aggregation
│   │   │   ├── analyticsService.js    # 5-category business metrics and DS forecast integration
│   │   │   ├── bookingService.js      # Operating hours boundary & technician capacity
│   │   │   ├── paymentService.js      # Dual-stage invoice calculation & payment verification
│   │   │   ├── reminderService.js     # Automated WhatsApp maintenance notification cron
│   │   │   └── warrantyService.js     # 14/30/45-day warranty rules & claim verification
│   │   ├── utils/                     # Secure upload parser, token generation, loggers
│   │   ├── app.js                     # Express app setup, CORS, Helmet, routes registration
│   │   └── server.js                  # HTTP server bootstrap and auto-migrator entry point
│   ├── tests/                         # End-to-end integration test suites (Node test runner & Jest)
│   ├── uploads/                       # Work order photos and payment transfer proofs (.gitkeep)
│   └── package.json                   # Backend dependencies, scripts, and Jest configuration
│
├── ai-service/                        # Python FastAPI NLP & Entity Extraction Microservice
│   ├── main.py                        # /predict-intent, /extract-entities, /health API
│   ├── train.py                       # Supervised intent model training pipeline
│   ├── ml_compat.py                   # Pure-Python TF-IDF & classifier fallback for sandbox environments
│   ├── test_ai_improvements.py        # 25 automated NLP unit tests
│   └── requirements.txt               # Python package dependencies
│
├── data-science/                      # Governed Operational Analytics & Demand Forecasting
│   ├── data/                          # Original raw operational CSV datasets
│   ├── data/governed/                 # PII-sanitized & tokenized datasets
│   ├── output/                        # Pre-calculated predictions, RFM distribution, and audit summaries
│   ├── dashboard.py                   # Interactive Streamlit dashboard for management & analysts
│   ├── ingest_and_train.py            # Data ingestion, profiling, PII scrubbing, and Ridge ML training
│   ├── test_pipeline.py               # 9 automated data science and ML evaluation unit tests
│   └── requirements.txt               # Data science dependencies (Pandas, Scikit-learn, Streamlit)
│
├── .gitignore                         # Strict exclusion of secrets, database data, virtualenvs, and PII
└── README.md                          # Repository documentation (this file)
```

---

## 5. Features & User Workflows by Role

### 5.1 Customer Workflows
- **Public Service Booking:** Select service category, number of units, location, service date, and available time slot between `08:00` and `19:00` WIB. Multi-unit bookings automatically scale duration (`60 min × units`).
- **Instant Order Tracking:** Real-time visual timeline (`StatusPage.jsx`) displaying 5 job phases (`Menunggu Konfirmasi`, `Dikonfirmasi`, `Teknisi Menuju Lokasi`, `Dalam Pengerjaan`, `Selesai`).
- **Official Digital Invoice:** Access Initial Estimate (`ESTIMASI AWAL`) upon booking and Final Official Invoice (`INVOICE FINAL`) upon job completion with printable paper styling.
- **Payment Submission:** Upload bank transfer receipt (`JPG`, `PNG`, `WEBP` up to 5 MB with magic-byte validation) or request cash settlement on-site.
- **AC Unit Inventory:** Registered customers can register and manage their AC units (brand, model, capacity PK, installation date) to track unit maintenance intervals.
- **Warranty Claim Submission:** If an issue recurs within the guaranteed period (`14`, `30`, or `45` days depending on the service), customers submit a warranty claim with photo evidence.
- **Customer Feedback:** Leave ratings and service testimonials once the job is marked `done` and confirmed.

### 5.2 Technician Field Workflows
- **Work Order Management:** Mobile-first dashboard showing daily assigned service appointments, customer contact details, and service location.
- **Job Status Execution:** Update status chronologically: `Teknisi Menuju Lokasi` $\rightarrow$ `Mulai Pengerjaan` $\rightarrow$ `Selesai`.
- **Diagnostic Inspection & Checklist:** Complete mandatory checklists (filter cleaning, evaporator pressure test, amp check, drainage line flush).
- **Photo Evidence Documentation:** Upload required "Before" and "After" work photos directly from device camera or photo library.
- **Spare Parts & Additional Labor:** Record replacement capacitors, refrigerant top-ups, or additional units serviced for admin invoice reconciliation.

### 5.3 Admin Operations Workflows
- **Booking & Scheduling Dispatch:** Review pending bookings, check real-time technician workload, and assign available technicians.
- **Payment Verification:** Review uploaded customer payment proofs, approve valid bank transfers, flag underpayments (`kurang_bayar`), or log overpayment refunds.
- **Service Catalog Management:** Configure service packages, set base prices, duration in minutes, warranty guarantee days, and routine maintenance cycle days.
- **Warranty Claim Adjudication:** Review incoming warranty claims, inspect photo proof, approve free re-inspection jobs, or reject ineligible claims with documented rationale.
- **Customer Relationship Management:** View customer directory, filter by registered code (`CUST-...`), examine per-customer AC units, and review communication logs.
- **Business Analytics & Reporting:** Track total revenue, technician utilization rates, service category breakdowns, and AI-driven 14-day booking demand forecasts.

### 5.4 AI & Data Science Operations
- **WhatsApp Chatbot Classifier:** Categorizes incoming customer messages into 20 distinct intents (e.g., booking request, price inquiry, complaint, warranty claim, reschedule).
- **Entity Extraction:** Accurately extracts booking codes (`NARA-AC...`), AC brands, PK capacities, unit counts, and relative dates (`besok`, `lusa`).
- **Human Handoff:** Automatically switches customer conversation mode to `human` when customer frustration, refund disputes, or out-of-scope inquiries are detected.
- **Demand Forecasting:** Evaluates seasonal temperature trends, day-of-week patterns, and historical demand to predict daily service capacity needs for the next 14 days.

---

## 6. Prerequisites

### 6.1 Mandatory Development Requirements
- **Node.js:** Version `18.18.0` or higher (tested on Node `v20.x` and `v22.x`).
- **npm:** Version `9.0.0` or higher.
- **PostgreSQL Database:** PostgreSQL `14.0` or higher running locally or accessible via network.
- **Python:** Version `3.9` to `3.12` (for AI Service and Data Science modules).
- **Git:** Version `2.30+`.

### 6.2 Optional Integrations
- **WhatsApp Messaging Gateway:** Fonnte API or Meta WhatsApp Cloud API credentials (uses local `mock` mode by default).
- **Google Gemini API:** Optional API key for conversational AI fallback.

---

## 7. Installation & Setup Guide

### Step 1: Clone Repository & Configure Environment
```bash
git clone https://github.com/KuatRiawan/Nara-AC.Dev.git
cd Nara-AC-Local
```

### Step 2: Database Preparation
Ensure PostgreSQL is active, then create the database:
```bash
# Using PostgreSQL CLI
psql -U postgres -c "CREATE DATABASE nara_ac;"
```

Configure backend environment variables:
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` and update your PostgreSQL credentials:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/nara_ac
JWT_SECRET=super-secret-development-key-min-32-chars-long
FRONTEND_URL=http://localhost:5173
```

### Step 3: Backend Setup & Migrations
```bash
cd backend
npm install
npm run migrate    # Applies 001_init.sql through 020_b2b_projects_and_rfm.sql
npm run seed       # Seeds service catalog, admin account, and technician accounts
```

To run the backend server in development mode:
```bash
npm run dev        # Runs on http://localhost:4000 (API: /api/v1, Health: /health)
```

### Step 4: Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev        # Starts Vite dev server on http://localhost:5173
```

### Step 5: AI Service Setup
In a new terminal window:
```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate      # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python3 train.py              # Trains 20-intent model from domain dataset
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 6: Data Science & Streamlit Dashboard Setup
In a new terminal window:
```bash
cd data-science
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 ingest_and_train.py   # Processes CSVs and generates predictions.json
streamlit run dashboard.py --server.port 8501
```

### 7.1 Verified Local Access URLs
- **Customer Web Application:** `http://localhost:5173`
- **Admin Dashboard:** `http://localhost:5173/admin`
- **Technician Field Web App:** `http://localhost:5173/technician`
- **Backend API Base:** `http://localhost:4000/api/v1`
- **API Health Check:** `http://localhost:4000/health`
- **OpenAPI / Swagger Documentation:** `http://localhost:4000/api/docs`
- **AI NLP Microservice:** `http://localhost:8000/docs`
- **Data Science Streamlit Dashboard:** `http://localhost:8501`

### 7.2 Default Seed Credentials (Development)
| Role | Email / Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@nara-ac.local` | `admin123` |
| **Technician** | `budi@nara-ac.local` | `budi123` |
| **Technician** | `agus@nara-ac.local` | `agus123` |

---

## 8. Environment Variables Reference

### Backend (`backend/.env`)

| Variable Name | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | `4000` | Port on which Express HTTP server listens |
| `NODE_ENV` | Yes | `development` / `production` | Environment flag; disables debug logs and enforces strict security |
| `DATABASE_URL` | Yes | `postgres://user:pass@localhost:5432/nara_ac` | PostgreSQL connection string |
| `DB_SSL` | Optional | `false` | Set `true` if connecting to managed PostgreSQL with SSL |
| `JWT_SECRET` | Yes | *(random 32+ characters)* | Secret key used to sign and verify authentication tokens |
| `JWT_EXPIRES` | Optional | `8h` | Token expiration duration |
| `CORS_ORIGINS` | Optional | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated list of allowed origins |
| `FRONTEND_URL` | Optional | `http://localhost:5173` | Primary frontend URL for links in email/WhatsApp messages |
| `AI_SERVICE_URL` | Optional | `http://localhost:8000` | Internal URL pointing to the FastAPI NLP service |
| `AI_TIMEOUT_MS` | Optional | `6000` | Maximum timeout in ms for AI service requests |
| `AI_CONFIDENCE_THRESHOLD` | Optional | `0.55` | Confidence cutoff below which AI routes query to human agent |
| `WHATSAPP_MODE` | Optional | `mock` / `fonnte` / `meta` | WhatsApp gateway provider selection |
| `WHATSAPP_TOKEN` | In Prod | *(secret token)* | Provider authentication token |
| `WHATSAPP_WEBHOOK_SECRET` | In Prod | *(secret token)* | Secret used to verify HMAC-SHA256 signature on incoming webhooks |
| `SCHEDULER_ENABLED` | Optional | `true` | Set `false` to disable cron workers in multi-replica deployments |
| `GEMINI_API_KEY` | Optional | *(secret)* | Google Gemini API key for intelligent conversational fallback |

---

## 9. Database & Migrations

### 9.1 Database Engine
- **Engine:** PostgreSQL 14+
- **Schema Management:** Automated custom SQL migration runner (`backend/src/db/migrate.js`).
- **Tracking Table:** `schema_migrations` tracks applied filenames and timestamps.

### 9.2 Migration Commands
```bash
cd backend
npm run migrate          # Execute pending migrations in alphanumeric order
npm run db:reset         # Reset all tables and re-seed (DEVELOPMENT ONLY)
```

### 9.3 Key Entities & Relationships
- **`customers` $\leftrightarrow$ `users`:** 1-to-1 relationship. Customer profiles can operate as guests or link to authenticated user accounts.
- **`customers` $\rightarrow$ `ac_units`:** 1-to-many. Stores registered customer AC units with model, serial, and maintenance cycle days.
- **`bookings` $\rightarrow$ `booking_items`:** 1-to-many. Details the specific service packages (`service_catalog`) and quantities in each booking.
- **`bookings` $\rightarrow$ `work_orders`:** 1-to-1. Technician execution record storing checklists (`work_order_checklists`) and photos (`work_order_photos`).
- **`bookings` $\rightarrow$ `warranty_claims`:** 1-to-many. Tracks warranty claims, inspections, and resolution statuses.
- **`bookings` $\rightarrow$ `feedback`:** 1-to-1. Rating (1-5) and customer comments submitted after service completion.

---

## 10. API Documentation

### 10.1 Interactive Documentation
The backend serves an interactive OpenAPI (Swagger) interface:
- **Swagger UI:** `http://localhost:4000/api/docs`
- **OpenAPI Specification (JSON):** `http://localhost:4000/api/openapi.json`

### 10.2 Major Endpoint Groups

| Group | Base Route | Auth Level | Key Capabilities |
| :--- | :--- | :--- | :--- |
| **System** | `/health`, `/health-simple` | Public | System uptime, database connectivity, and readiness checks |
| **Auth** | `/api/v1/auth` | Public & Bearer | Customer OTP request/verify, staff login, logout, refresh |
| **Bookings** | `/api/v1/bookings` | Mixed | Slot availability, create booking, reschedule, cancel |
| **Public Status**| `/api/v1/public/bookings/:kode` | Public | Unmasked booking tracking, invoice paper view, status timeline |
| **Customer** | `/api/v1/customer` | Customer JWT | Manage AC units, profile update with OTP, booking history |
| **Technician** | `/api/v1/technician` | Technician JWT | Job assignments, checklist submission, photo upload, finish job |
| **Admin** | `/api/v1/admin` | Admin JWT | Technician dispatch, financial ledger, user directory, catalog |
| **Payments** | `/api/v1/payments` | Mixed | Transfer proof upload, admin verification, invoice WhatsApp send |
| **Claims** | `/api/v1/claims` | Mixed | Warranty eligibility check, claim submission, admin decision |
| **WhatsApp** | `/api/v1/whatsapp` | Webhook Secret | Inbound webhook processing, conversation history, handoff |

---

## 11. Testing & Quality Verification

All test suites have been verified against the current repository state:

```bash
# 1. Frontend Test Suite (Vitest) - 11 files, 48 tests
cd frontend
npm test -- --run
# Outcome: 11 passed | 48 passed (100% PASS)

# 2. Frontend Production Build Verification
cd frontend
npm run build
# Outcome: Built in ~1.1s, 0 errors, chunks generated in frontend/dist/

# 3. Backend End-to-End Business Rules & Security Suite (Node Test Runner)
node --test backend/tests/e2e_journey.test.js
# Outcome: 9/9 Scenarios PASS (100% PASS across Scenarios A through J)

# 4. Backend Syntax Verification (all 39 modules)
find backend/src -name "*.js" -exec node --check {} +
# Outcome: 39/39 files PASS

# 5. AI Service NLP & Entity Extraction Suite
python3 -m unittest discover -s ai-service -p "test_*.py" -v
# Outcome: 25/25 unit tests PASS (100% PASS)

# 6. Data Science Pipeline & Data Integrity Tests
data-science/.venv/bin/python -m unittest discover -s data-science -p "test_*.py" -v
# Outcome: 9/9 unit tests PASS (100% PASS)
```

---

## 12. Production Deployment & Operations

### 12.1 Production Build & Start
```bash
# 1. Build frontend distribution bundle
cd frontend
npm run build

# 2. Run backend migrations
cd ../backend
NODE_ENV=production npm run migrate

# 3. Start backend service
NODE_ENV=production npm start
```

### 12.2 Security Hardening Checklist
- [x] **Rate Limiting:** Enabled globally via `express-rate-limit` (200 req/min per IP; stricter on `/auth`).
- [x] **CSRF Protection:** Double-submit cookie pattern with `X-CSRF-Token` validation on mutating requests.
- [x] **IDOR Defenses:** All booking and customer detail endpoints enforce customer ID / phone verification checks.
- [x] **File Upload Controls:** Magic-byte validation verifies genuine `image/jpeg`, `image/png`, and `image/webp` binary headers; path traversal prevention via strict UUID filename generation.
- [x] **Input Validation:** All controller boundaries validated via strict Joi schemas.

---

## 13. Troubleshooting Common Issues

| Symptom | Probable Cause | Verified Resolution |
| :--- | :--- | :--- |
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL service not running | Start PostgreSQL service: `brew services start postgresql` or `systemctl start postgresql`. |
| `JWT_SECRET tidak diisi` | Missing environment variable | Set a random 32+ character string in `backend/.env` for `JWT_SECRET`. |
| Frontend API calls return `404` | Vite proxy port mismatch | Ensure backend is listening on port `4000` (matching `vite.config.js` proxy target). |
| `DURATION_EXCEEDS_CLOSING` | Booking slot extends past 19:00 WIB | The operating hours are strictly `08:00–19:00` WIB. A 90-minute service must start by `17:30` WIB at the latest. |
| AI Service returns `503` | FastAPI process not running on port 8000 | Start the AI service: `cd ai-service && uvicorn main:app --port 8000`. Backend falls back gracefully if down. |

---

## 14. Project Reports & Documentation Index

Comprehensive audit and state reports are available in the repository root:
- [`NARA_AC_CURRENT_PROJECT_REPORT.md`](./NARA_AC_CURRENT_PROJECT_REPORT.md) — Comprehensive technical condition report, business rule audit (BR-01 to BR-47), risk assessment, and production readiness matrix.
- [`NARA_AC_BUG_FIX_LOG.md`](./NARA_AC_BUG_FIX_LOG.md) — Detailed engineering log of all remediated bugs (`BUG-01` to `BUG-17`).
- [`NARA_AC_IMPLEMENTATION_STATUS.md`](./NARA_AC_IMPLEMENTATION_STATUS.md) — Implementation status and configurable business rules documentation.
- [`NARA_AC_VERIFICATION_CHECKLIST.md`](./NARA_AC_VERIFICATION_CHECKLIST.md) — 20-category system verification checklist.

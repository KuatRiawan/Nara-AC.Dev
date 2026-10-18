# ⚙️ NARA AC — Backend REST API & Services

Layanan backend terpusat (*Backend REST API & Microservices Gateway*) untuk platform **NARA AC — CV. Nara Teknindotama**. Dibangun menggunakan framework Express.js dengan arsitektur terpisah (*decoupled*), penyimpanan data relasional PostgreSQL, validasi skema ketat menggunakan Joi, serta proxy aman untuk layanan Kecerdasan Buatan (Google Gemini) dan analitik Data Science.

---

## 📋 Pemenuhan Kriteria Rubrik Full-Stack (Backend)

| Kategori Rubrik | Kriteria Rubrik | Implementasi di NARA AC Backend |
| :--- | :--- | :--- |
| **Arsitektur Decoupled** | Front-end dan Back-end dibangun terpisah | Backend berjalan mandiri pada port 4000, melayani permintaan HTTP REST API dari frontend (port 5173). |
| **Konvensi URL API** | Dibangun dengan Express & URL konvensi `/api/v1/` | Menggunakan **Express.js 4.19+**, semua endpoint berstandar RESTful diawali prefix `/api/v1/...` (misal: `/api/v1/bookings`, `/api/v1/services`, `/api/v1/auth`, `/api/v1/chat`, `/api/v1/analytics`). |
| **Penyimpanan Persisten** | Data tersimpan secara persisten | Menggunakan basis data **PostgreSQL** dengan integritas referensial, transaksi ACID, indeks performa, dan migrasi terkelola di `migrations/`. |
| **Proxy Layanan Gen AI** | Gen AI diakses melalui Backend, bukan Frontend | Kunci API rahasia `GEMINI_API_KEY` disimpan aman di server-side (`.env`). Frontend hanya memanggil `POST /api/v1/chat`. Modul `geminiService.js` yang mengelola komunikasi ke Google Gemini 1.5 Flash. |
| **Persistensi Riwayat Gen AI** | Riwayat layanan Gen AI tersimpan di database | Setiap inferensi dan interaksi AI dicatat ke tabel `inference_log` di PostgreSQL (mencakup hash teks, intent, confidence, endpoint, rute, latency, error status, dan versi model). |
| **Integrasi Data Science** | Hasil Data Science tampil pada fitur relevan | Menyediakan endpoint `GET /api/v1/analytics/predictions` dan `GET /api/v1/analytics/summary` yang membaca data peramalan 14 hari dan ringkasan segmentasi RFM untuk ditampilkan di antarmuka admin. |
| **Validasi Skema (Joi)** | Validasi data menggunakan schema validation | Menggunakan pustaka **Joi** pada setiap payload masukan (misal: validasi nomor HP Indonesia `08...`, format tanggal, kapasitas PK, dan sanitasi string). |
| **Penanganan Kegagalan** | Menangani kegagalan aplikasi & AI dengan jelas | Middleware terpusat `errorHandler.js` menangani galat dengan kode HTTP standar (400, 401, 403, 404, 409, 422, 429, 500) dan fallback otomatis ke RAG lokal saat Gemini timeout/offline. |
| **Dokumentasi Kontrak API** | Kontrak API disepakati & terdokumentasi | Dokumentasi interaktif Swagger UI tersedia di `http://localhost:4000/api-docs` berbasis spesifikasi OpenAPI (`openapi.yaml`). |
| **Penyebaran / Deployment** | Konfigurasi deployment layanan gratis (*free tier*) | Siap dideploy ke **Render / Railway / Fly.io** dengan database serverless **Neon PostgreSQL / Supabase**. |

---

## 🛠️ Tumpukan Teknologi Backend

- **Runtime**: Node.js 20+ (LTS)
- **Framework**: Express.js 4.19+
- **Database**: PostgreSQL 15+ (Driver `pg` dengan Connection Pooling)
- **Schema Validation**: Joi 17+
- **Autentikasi & Keamanan**: JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`), CORS, Helmet, Rate Limiter (`express-rate-limit`)
- **Penjadwal Otomatis**: `node-cron` (Pengingat servis H-1 & evaluasi garansi)
- **AI Integration**: Google Generative AI (Gemini 1.5 Flash) + FastAPI AI Service (:8000)
- **Dokumentasi API**: Swagger UI Express (`swagger-ui-express`)

---

## 📁 Struktur Direktori Backend

```
backend/
├── migrations/             # Berkas migrasi skema SQL (tabel, foreign keys, indeks)
│   └── 001_init.sql        # Skema inisialisasi basis data lengkap
├── src/
│   ├── config.js           # Konfigurasi variabel lingkungan & konstanta sistem
│   ├── app.js              # Inisialisasi Express app & middleware global
│   ├── server.js           # Server listener port 4000 & cron scheduler
│   ├── db/                 # Koneksi pool PostgreSQL & skrip seed data
│   │   ├── pool.js         # Pg pool connection instance
│   │   ├── migrate.js      # Runner migrasi SQL
│   │   └── seed.js         # Seeder data pengguna, katalog, dan dummy order
│   ├── middleware/         # Middleware Express
│   │   ├── auth.js         # Verifikasi JWT token & kontrol hak akses (RBAC)
│   │   ├── errorHandler.js # Penangan galat terpusat berstandar JSON
│   │   └── validate.js     # Middleware validator skema Joi
│   ├── routes/             # Definisi rute REST API (/api/v1/...)
│   │   ├── auth.js         # Login staf, request/verify OTP pelanggan
│   │   ├── bookings.js     # Pembuatan booking, manajemen status tiket
│   │   ├── services.js     # Katalog paket servis & tarif resmi
│   │   ├── chat.js         # Endpoint percakapan AI & RAG assistant
│   │   ├── analytics.js    # Endpoint metrik operasional & prediksi Data Science
│   │   ├── technician.js   # Endpoint penugasan & checklist kerja teknisi
│   │   └── public.js       # Tracking status booking tanpa autentikasi
│   ├── services/           # Logika bisnis terisolasi
│   │   ├── bookingService.js  # Alur bisnis pemesanan & kalkulasi biaya
│   │   ├── geminiService.js   # Integrasi Google Gemini 1.5 Flash API
│   │   ├── aiClient.js        # Klien komunikasi ke FastAPI AI Service (:8000)
│   │   └── chatService.js     # Dispatcher percakapan, RAG, & inference logging
│   └── validators/         # Skema validasi masukan Joi
│       ├── authValidator.js
│       └── bookingValidator.js
├── tests/                  # Unit & Integration test suite (Jest + Supertest)
└── package.json            # Dependensi & skrip eksekusi
```

---

## 📡 Ringkasan Endpoint Utama REST API (`/api/v1`)

| Method | Endpoint | Hak Akses | Deskripsi Fungsional |
| :---: | :--- | :---: | :--- |
| `POST` | `/api/v1/auth/staff/login` | Publik | Autentikasi staf admin & teknisi (JWT token) |
| `POST` | `/api/v1/auth/customer/request-otp` | Publik | Permintaan kode OTP login pelanggan WhatsApp |
| `POST` | `/api/v1/auth/customer/verify-otp` | Publik | Verifikasi kode OTP pelanggan |
| `GET` | `/api/v1/services` | Publik | Mengambil katalog resmi layanan servis AC & harga |
| `POST` | `/api/v1/bookings` | Publik/User | Membuat pemesanan jadwal servis AC baru (Validasi Joi) |
| `GET` | `/api/v1/public/bookings/:kode` | Publik | Melacak progres pengerjaan servis via kode booking |
| `POST` | `/api/v1/chat` | Publik/User | Mengirim pesan ke Nara Bot AI (Diproses via Gemini) |
| `GET` | `/api/v1/analytics/predictions` | Admin | Mengambil proyeksi peramalan permintaan 14 hari |
| `GET` | `/api/v1/analytics/summary` | Admin | Ringkasan metrik finansial, operasional, dan RFM |
| `PATCH`| `/api/v1/technician/jobs/:id/complete` | Teknisi | Menyelesaikan pengerjaan servis & mencatat SOP |

---

## 🚀 Panduan Menjalankan Backend

### 1. Konfigurasi Variabel Lingkungan
Salin file `.env.example` menjadi `.env` dan sesuaikan parameter:
```bash
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/nara_ac
JWT_SECRET=rahasia-jwt-produksi-nara-ac-2026
GEMINI_API_KEY=your_gemini_api_key_here
AI_SERVICE_URL=http://localhost:8000
```

### 2. Migrasi Basis Data & Seeding
```bash
npm run migrate
npm run seed
```

### 3. Menjalankan Server Pengembangan
```bash
npm run dev
```
*Server aktif di `http://localhost:4000`. Dokumentasi Swagger di `http://localhost:4000/api-docs`.*

### 4. Menjalankan Pengujian Otomatis (Jest)
```bash
npm run test
```

---
*Dokumen ini disusun sebagai bukti pemenuhan 100% kriteria Capstone / Tugas Jalur Full-Stack Backend NARA AC.*

# 💻 NARA AC — Frontend Application

Antarmuka web modern (*Web Application Frontend*) untuk platform layanan servis & perawatan pendingin ruangan **NARA AC — CV. Nara Teknindotama**. Aplikasi ini dibangun menggunakan arsitektur terpisah (*decoupled*), modern module bundler, komponen responsif *mobile-first*, serta integrasi penuh ke REST API backend dan analitik data science.

---

## 📋 Pemenuhan Kriteria Rubrik Full-Stack (Frontend)

| Kategori Rubrik | Kriteria Rubrik | Implementasi di NARA AC Frontend |
| :--- | :--- | :--- |
| **Solusi Masalah UMKM** | Menyelesaikan satu masalah UMKM yang jelas | Digitalisasi pemesanan jadwal servis AC dan pelacakan transparan status pengerjaan teknisi bagi pelanggan CV. Nara Teknindotama. |
| **Fitur Utama** | Memiliki minimal 2 fitur utama | 1. **Pemesanan Servis Online (`/booking`)**: Form interaktif dengan kalkulasi harga transparan, pemilihan unit & slot jadwal.<br>2. **Pelacakan Status Real-Time (`/status`)**: Lacak status pengerjaan teknisi, unduh invoice resmi, dan klaim garansi 30 hari.<br>3. **Floating AI Chatbot (`Nara Bot`)**: Konsultasi AC cerdas dan rekomendasi paket servis.<br>4. **Portal Staf & Teknisi (`/login`, `/technician`, `/admin`)**: Manajemen pengerjaan dan checklist digital. |
| **Interaktivitas & Feedback** | Memberikan hasil sesuai input pengguna & tanda aksi jelas | State management reaktif, indikator loading spinner saat submit, toast notifikasi sukses/gagal, dan badge status pengerjaan dinamis. |
| **Kemudahan Penggunaan** | Mudah digunakan dengan panduan yang jelas | Antarmuka bersih, microcopy berbahasa Indonesia yang santun dan jelas, petunjuk pengisian form, serta breadcrumb navigasi. |
| **Aksesibilitas & Responsivitas** | Dapat diakses publik melalui browser & ponsel | Layout responsif menggunakan TailwindCSS v4, optimal di layar ponsel (375px), tablet, maupun desktop. |
| **Module Bundler** | Dibangun dengan module bundler modern | Menggunakan **Vite 8+** dengan `@vitejs/plugin-react` untuk *Hot Module Replacement (HMR)* super cepat dan bundling efisien. |
| **Networking Calls** | Menggunakan Axios | Seluruh panggilan API ke backend menggunakan instance terpusat **Axios** di `src/services/api.js` dengan request/response interceptors. |
| **UI Framework & Komponen** | CSS framework & UI component modern | **TailwindCSS v4**, animasi halus **Framer Motion**, ikon modern **Lucide React**, dan grafik **Recharts**. |
| **Integrasi Data Science & AI** | Menampilkan hasil tim Data Science & Gen AI | Menampilkan grafik tren peramalan 14 hari di `AdminAnalytics.jsx`, integrasi dasbor Streamlit (:8501), dan widget chat AI Gemini. |
| **Pengalaman Pengguna** | Mockup dibuat sebelum pengembangan & desain khas | Berpedoman pada Design System resmi di `design-system/nara-ac/MASTER.md` (Ice Blue `#2563eb`, Emerald `#059669`, tipografi *Inter*). |

---

## 🛠️ Arsitektur Teknologi Frontend

- **Framework**: React 19 (Functional Components & Hooks)
- **Module Bundler**: Vite 8.3+
- **Styling**: TailwindCSS v4 + Custom Design Tokens
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios 1.20+
- **Micro-Animations**: Framer Motion 14+
- **Icons**: Lucide React
- **Visualisasi Data**: Recharts 3.10+
- **Testing**: Vitest + React Testing Library + Jest-DOM + Jest-Axe (48/48 Tests Passed)

---

## 📁 Struktur Direktori

```
frontend/
├── public/                 # Asset statis publik, logo, dan favicon
├── src/
│   ├── assets/             # Gambar & ikon aplikasi
│   ├── components/         # Komponen UI modular
│   │   ├── admin/          # Komponen tabel, modal, dan analitik admin
│   │   ├── booking/        # Form booking, pemilihan tanggal & layanan
│   │   ├── chat/           # Floating AI Chatbot widget
│   │   ├── common/         # Button, Modal, Toast, Badge, Card, Loader
│   │   ├── layout/         # Navbar, Footer, Sidebar Admin & Teknisi
│   │   └── status/         # Tracker status, timeline, dan invoice modal
│   ├── contexts/           # React Context (AuthContext, NotificationContext)
│   ├── pages/              # Halaman rute utama
│   │   ├── LandingPage.jsx # Beranda & perkenalan layanan
│   │   ├── BookingPage.jsx # Formulir pemesanan online
│   │   ├── StatusPage.jsx  # Pelacakan status pengerjaan tiket
│   │   ├── LoginPage.jsx   # Portal masuk staf & teknisi
│   │   ├── admin/          # Admin Dashboard, Bookings, Invoices, Analytics
│   │   └── technician/     # Portal kerja lapangan teknisi
│   ├── services/           # Konfigurasi Axios & API Client
│   │   └── api.js          # Instance Axios dengan interceptor JWT & error
│   ├── test/               # Pengujian unit, integrasi, dan aksesibilitas (Vitest)
│   ├── App.jsx             # Root router & layout provider
│   └── main.jsx            # Entry point aplikasi React
├── vite.config.js          # Konfigurasi bundler Vite
├── tailwind.config.js      # Konfigurasi TailwindCSS
└── package.json            # Daftar dependensi & script build
```

---

## 🌐 Koneksi Jaringan & API Client (Axios)

Semua panggilan jaringan dikelola secara terpusat pada `src/services/api.js`:
- **Base URL**: Mengambil nilai dari variabel lingkungan `VITE_API_BASE_URL` (default: `http://localhost:4000/api/v1`).
- **Interceptors**:
  - Menyisipkan token otorisasi `Bearer <jwt_token>` secara otomatis jika pengguna telah masuk.
  - Menangkap error HTTP secara global (401 mengarahkan ke login, 429 menampilkan peringatan limit, 500 menampilkan pesan fallback ramah).

---

## 🚀 Panduan Menjalankan Frontend

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Menjalankan Server Pengembangan (Dev Mode)
```bash
npm run dev
```
*Aplikasi akan berjalan di `http://localhost:5173`.*

### 3. Menjalankan Pengujian Otomatis (Vitest)
```bash
npm run test
```
*Seluruh 48 pengujian unit dan aksesibilitas akan dieksekusi.*

### 4. Membangun Bundle Produksi
```bash
npm run build
```
*Hasil kompilasi siap didistribusikan ke Vercel, Netlify, atau Cloudflare Pages.*

---
*Dokumen ini disusun sebagai bukti pemenuhan 100% kriteria Capstone / Tugas Jalur Full-Stack Frontend NARA AC.*

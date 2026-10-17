# 09 — Dokumentasi Frontend

Dokumen ini mendokumentasikan arsitektur, hierarki komponen, manajemen state, dan tata kelola antarmuka pengguna (UI/UX) pada aplikasi web Single-Page Application (SPA) **NARA AC — CV. Nara Teknindotama** (Kode Proyek: **A26-CS054**).

---

## 1. Arsitektur & Tumpukan Teknologi Frontend

- **Library Inti:** React 19.3.0
- **Build Tool & Bundler:** Vite 8.3.3 (Dikonfigurasi dengan proxy reverse ke `http://localhost:4000` pada `/api`)
- **Sistem Desain & CSS:** Tailwind CSS 4.3.3
- **Paket Ikon:** Lucide React
- **Animasi & Efek UI:** Canvas Confetti (untuk perayaan konfirmasi booking sukses)
- **Router:** React Router DOM v6 (`BrowserRouter`, `Routes`, `Route`, `Navigate`)
- **Pengujian:** Vitest 4.0.18 + Testing Library (`@testing-library/react`, `@testing-library/jest-dom`)

---

## 2. Struktur Direktori Frontend

```text
frontend/src/
├── App.jsx                     # Entry point routing utama dan wrapper layout
├── main.jsx                    # Root rendering React DOM
├── index.css                   # Direktif dasar Tailwind CSS v4 & variabel tema
├── components/
│   ├── ui/                     # Primitif UI (Button, Modal, Card, Badge, Skeleton)
│   ├── landing/                # Komponen Beranda (Hero, Catalog, Reviews, FAQ)
│   ├── booking/                # Multi-step Form Pemesanan Servis
│   ├── admin/                  # Sidebar, Header, Filter Bar, Stat Cards
│   └── layout/                 # Layout bersama, Header Publik, Footer
├── hooks/
│   ├── useContextualBack.js    # Hook cerdas navigasi tombol kembali
│   └── useBusinessProfile.js   # Hook sinkronisasi data profil perusahaan dinamis
├── lib/                        # Konfigurasi client API & helper axios/fetch
├── pages/
│   ├── LandingPage.jsx         # Halaman Beranda Publik
│   ├── BookingPage.jsx         # Formulir Pemesanan Servis Interaktif
│   ├── StatusPage.jsx          # Pelacak Status Booking & Tampilan Invoice
│   ├── FeedbackPage.jsx        # Formulir Ulasan Kepuasan Pelanggan
│   ├── LoginPage.jsx           # Login Pelanggan
│   ├── RegisterPage.jsx        # Pendaftaran Akun Pelanggan
│   ├── StaffLoginPage.jsx      # Login Khusus Karyawan (Admin & Teknisi)
│   ├── TechnicianDashboard.jsx # Portal Kerja Teknisi Lapangan
│   ├── TechnicianJobDetail.jsx # Rincian Pekerjaan & Formulir Laporan Teknisi
│   ├── PrivacyPolicyPage.jsx   # Dokumen Kebijakan Privasi
│   ├── TermsConditionsPage.jsx # Dokumen Syarat & Ketentuan Layanan
│   ├── OfflinePage.jsx         # Halaman Fallback Mode Offline (PWA Ready)
│   ├── NotFoundPage.jsx        # Halaman 404 Responsif
│   ├── customer/               # Portal Khusus Pelanggan
│   │   ├── CustomerPortal.jsx  # Layout Shell & Navigasi Pelanggan
│   │   ├── CustomerDashboard.jsx# Ringkasan Booking Aktif & Jadwal Servis
│   │   ├── CustomerAcUnits.jsx # Pengelolaan Daftar Unit AC Pelanggan
│   │   ├── CustomerHistory.jsx # Histori Servis dan Unduh Faktur
│   │   └── CustomerProfile.jsx # Manajemen Profil & Alamat
│   └── admin/                  # Portal Khusus Administrator
│       ├── AdminDashboard.jsx  # Layout Shell Admin & Nested Router
│       ├── AdminHome.jsx       # Dashboard Statistik & Grafik Utama
│       ├── AdminBookings.jsx   # Pengelolaan & Konfirmasi Pesanan Booking
│       ├── AdminSchedule.jsx   # Kalender Penugasan Teknisi & Dispatcher
│       ├── AdminTechnicians.jsx# Manajemen Data Teknisi Lapangan
│       ├── AdminCustomers.jsx  # Manajemen Pelanggan & Analisis RFM
│       ├── AdminServices.jsx   # Manajemen Katalog Paket Layanan & Tarif
│       ├── AdminInventory.jsx  # Manajemen Stok Suku Cadang & Gudang
│       ├── AdminInvoices.jsx   # Manajemen Faktur & Verifikasi Pembayaran
│       ├── AdminClaims.jsx     # Peninjauan Klaim Garansi Servis
│       ├── AdminReports.jsx    # Laporan Keuangan, Omzet, & Operasional
│       ├── AdminFeedback.jsx   # Pengawasan Ulasan & Skor Kepuasan (CSAT)
│       ├── AdminWhatsApp.jsx   # Pemantauan Bot & Riwayat Pesan WhatsApp
│       ├── AdminAnalytics.jsx  # Visualisasi Peramalan & Analisis Data
│       ├── AdminNotifications.jsx # Manajemen Pesan Siaran (Broadcast)
│       ├── AdminACUnits.jsx    # Master Aset Unit Pendingin
│       └── AdminSettings.jsx   # Konfigurasi Parameter Bisnis & Sistem
```

---

## 3. Matriks Halaman, Hak Akses, & Rute Aplikasi

| Rute URL | Komponen Halaman | Aktor Target | Deskripsi Fungsi | API Terkait | Status Implementasi |
|---|---|---|---|---|---|
| `/` | `LandingPage` | Publik | Beranda, pengenalan layanan, ulasan bintang, profil bisnis NARA AC | `/api/v1/services` | Terverifikasi |
| `/booking` | `BookingPage` | Pelanggan / Publik | Formulir multi-langkah pemesanan servis AC | `/api/v1/bookings`, `/api/v1/services` | Terverifikasi |
| `/status/:kode?` | `StatusPage` | Pelanggan / Publik | Pelacakan real-time status pesanan, invoice, dan link bayar | `/api/v1/bookings/:id` | Terverifikasi |
| `/invoice/:kode?` | `StatusPage` | Pelanggan / Publik | Tampilan rincian tagihan faktur invoice dan instruksi transfer | `/api/v1/payments/:id` | Terverifikasi |
| `/feedback/:kode` | `FeedbackPage` | Pelanggan | Formulir pemberian rating bintang (1-5) dan testimoni servis | `/api/v1/bookings/:id/feedback` | Terverifikasi |
| `/login` | `LoginPage` | Pelanggan | Autentikasi pelanggan menggunakan email/password atau OTP WhatsApp | `/api/v1/auth/login`, `/wa-otp` | Terverifikasi |
| `/register` | `RegisterPage` | Pelanggan | Pendaftaran akun pelanggan baru | `/api/v1/auth/register` | Terverifikasi |
| `/staff/login` | `StaffLoginPage` | Admin / Teknisi | Pintu masuk terisolasi khusus staf operasional dan manajemen | `/api/v1/auth/login` | Terverifikasi |
| `/customer/*` | `CustomerPortal` | Pelanggan | Portal mandiri pelanggan: dashboard, aset unit AC, riwayat | `/api/v1/customer/*` | Terverifikasi |
| `/technician/*`| `TechnicianDashboard` | Teknisi Lapangan | Agenda tugas lapangan, status perjalanan, dan riwayat pekerjaan | `/api/v1/technician/*` | Terverifikasi |
| `/technician/jobs/:id` | `TechnicianJobDetail` | Teknisi Lapangan | Detail SPK, checklist keselamatan kerja, upload foto Before/After, BAP | `/api/v1/technician/jobs/:id` | Terverifikasi |
| `/admin/*` | `AdminDashboard` | Administrator | Pusat kendali operasional, dispatcher, keuangan, inventaris, dan analitik | `/api/v1/admin/*` | Terverifikasi |
| `/privacy-policy` | `PrivacyPolicyPage` | Publik | Pernyataan resmi kebijakan perlindungan data pribadi | Statis | Terverifikasi |
| `/terms-conditions` | `TermsConditionsPage`| Publik | Syarat, ketentuan garansi 30 hari, dan pembatalan servis | Statis | Terverifikasi |
| `/offline` | `OfflinePage` | Semua Pengguna | Fallback UI saat koneksi internet terputus | Statis | Terverifikasi |
| `*` | `NotFoundPage` | Semua Pengguna | Halaman 404 penanganan rute yang tidak terdaftar | Statis | Terverifikasi |

---

## 4. Pola Manajemen State & Komunikasi Data

1. **State Otentikasi Terpusat:**
   - Token JWT disimpan dalam `localStorage` dan disinkronkan dengan cookie `access_token` untuk proteksi keamanan ganda.
   - Header request otomatis menyertakan `Authorization: Bearer <token>` dan `x-csrf-token`.
2. **Kustom Hook Navigasi (`useContextualBack`):**
   - Menangani riwayat peramban secara cerdas. Jika pengguna mengakses tautan langsung dari WhatsApp atau tab baru, tombol "Kembali" secara otomatis mengarahkan ke halaman beranda yang relevan alih-alih keluar dari aplikasi.
3. **Kustom Hook Parameter Bisnis (`useBusinessProfile`):**
   - Mengambil nama perusahaan, alamat kantor, nomor WhatsApp narahubung resmi, dan rekening bank resmi langsung dari backend (`/api/v1/settings`), sehingga perubahan kontak admin langsung tercermin di seluruh antarmuka secara dinamis tanpa perlu deploy ulang.

---

## 5. Standar UI/UX, Aksesibilitas, & Keadaan Khusus (States)

- **Loading State:** Menggunakan skeleton loaders dengan animasi berkedip lembut (*shimmer effect*) untuk meminimalisir Cumulative Layout Shift (CLS).
- **Empty State:** Menggunakan ilustrasi kontekstual, pesan ramah, dan tombol tindakan langsung (CTA) saat daftar data kosong (misal: "Belum ada unit AC terdaftar — Tambahkan Unit Pertama Anda").
- **Error State:** Menampilkan alert banner berwarna merah dengan penjelasan kendala bahasa Indonesia dan tombol "Coba Lagi" (*retry button*).
- **Feedback State:** Menggunakan modal konfirmasi destruktif untuk pembatalan order atau penghapusan data aset, serta toast notification untuk notifikasi cepat sukses/gagal.
- **Responsivitas:** Desain *Mobile-First* dengan navigasi bawah (*bottom bar*) untuk tampilan ponsel pintar dan *sidebar collapsible* untuk tampilan tablet dan desktop.

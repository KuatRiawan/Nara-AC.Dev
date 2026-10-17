# DOKUMEN INDUK TEKNIS SISTEM NARA AC
## Sistem Pengelolaan Jadwal dan Pengingat Service AC — CV. Nara Teknindotama
### Kode Proyek: A26-CS054 | Versi Dokumen: 2.1.0 | Tanggal Audit: 18 Oktober 2026

---

## DAFTAR ISI UTAMA

1. [Pendahuluan](#1-pendahuluan)
2. [Identitas Proyek](#2-identitas-proyek)
3. [Latar Belakang](#3-latar-belakang)
4. [Identifikasi Masalah](#4-identifikasi-masalah)
5. [Rumusan Masalah](#5-rumusan-masalah)
6. [Tujuan Sistem](#6-tujuan-sistem)
7. [Manfaat Sistem](#7-manfaat-sistem)
8. [Ruang Lingkup](#8-ruang-lingkup)
9. [Metodologi Pengembangan](#9-metodologi-pengembangan)
10. [Analisis Sistem Berjalan](#10-analisis-sistem-berjalan)
11. [Analisis Sistem yang Diusulkan](#11-analisis-sistem-yang-diusulkan)
12. [Pemangku Kepentingan dan Aktor](#12-pemangku-kepentingan-dan-aktor)
13. [Analisis Kebutuhan Fungsional](#13-analisis-kebutuhan-fungsional)
14. [Analisis Kebutuhan Nonfungsional](#14-analisis-kebutuhan-nonfungsional)
15. [Aturan Bisnis](#15-aturan-bisnis)
16. [Arsitektur Sistem](#16-arsitektur-sistem)
17. [Diagram Arsitektur](#17-diagram-arsitektur)
18. [Use Case Diagram](#18-use-case-diagram)
19. [Spesifikasi Use Case](#19-spesifikasi-use-case)
20. [Activity Diagram](#20-activity-diagram)
21. [Sequence Diagram](#21-sequence-diagram)
22. [ERD (Entity Relationship Diagram)](#22-erd-entity-relationship-diagram)
23. [Struktur dan Kamus Data](#23-struktur-dan-kamus-data)
24. [Relasi Antartabel](#24-relasi-antartabel)
25. [Status dan Siklus Hidup Data](#25-status-dan-siklus-hidup-data)
26. [Desain API](#26-desain-api)
27. [Dokumentasi Frontend](#27-dokumentasi-frontend)
28. [Dokumentasi Backend](#28-dokumentasi-backend)
29. [Dokumentasi AI (Kecerdasan Buatan)](#29-dokumentasi-ai-kecerdasan-buatan)
30. [Dokumentasi Data Science](#30-dokumentasi-data-science)
31. [Integrasi Eksternal](#31-integrasi-eksternal)
32. [Keamanan dan Privasi](#32-keamanan-dan-privasi)
33. [Desain Antarmuka dan Responsivitas](#33-desain-antarmuka-dan-responsivitas)
34. [Strategi Pengujian](#34-strategi-pengujian)
35. [Hasil Verifikasi](#35-hasil-verifikasi)
36. [Instalasi dan Konfigurasi](#36-instalasi-dan-konfigurasi)
37. [Deployment dan Operasional](#37-deployment-dan-operasional)
38. [Panduan Penggunaan Berdasarkan Peran](#38-panduan-penggunaan-berdasarkan-peran)
39. [Keterbatasan dan Risiko](#39-keterbatasan-dan-risiko)
40. [Kesenjangan Implementasi](#40-kesenjangan-implementasi)
41. [Rekomendasi Pengembangan](#41-rekomendasi-pengembangan)
42. [Kesimpulan](#42-kesimpulan)
43. [Daftar Istilah](#43-daftar-istilah)
44. [Referensi dan Lampiran](#44-referensi-dan-lampiran)

---

### 1. Pendahuluan
Dokumen ini merupakan panduan arsitektur dan spesifikasi teknis induk bagi sistem perangkat lunak **NARA AC**. Dokumen ini merangkum seluruh hasil observasi kode sumber, basis data relasional, pengujian mutu, dan aturan bisnis yang berjalan pada **CV. Nara Teknindotama**. Rincian pengantar selengkapnya terdapat pada [`docs/01-PENDAHULUAN.md`](docs/01-PENDAHULUAN.md).

### 2. Identitas Proyek
- **Nama Sistem:** Sistem Pengelolaan Jadwal dan Pengingat Service AC — NARA AC
- **Badan Hukum:** CV. Nara Teknindotama
- **Nomor Induk Berusaha (NIB):** 0220108920934
- **Alamat Kantor:** Jl. Anggajaya 2 No. 105, Condongcatur, Depok, Sleman, D.I. Yogyakarta 55283
- **Kode Proyek:** A26-CS054

### 3. Latar Belakang
Tingginya kelembapan dan temperatur udara di wilayah perkotaan Yogyakarta menuntut pengoperasian pendingin ruangan (AC) secara terus menerus. Namun, mayoritas pemilik AC perumahan dan perkantoran sering melupakan jadwal pemeliharaan rutin 3 bulanan, mengakibatkan pemborosan listrik dan kerusakan fatal kompresor.

### 4. Identifikasi Masalah
1. Pencatatan pesanan manual via chat WhatsApp sering menyebabkan jadwal teknisi tumpang tindih (*double-booking*).
2. Tidak adanya buku riwayat servis unit AC digital membuat teknisi sulit mengetahui riwayat refrigeran atau penggantian kapasitor sebelumnya.
3. Keterlambatan tindak lanjut klaim garansi karena ketiadaan kartu garansi digital resmi.

### 5. Rumusan Masalah
Bagaimana merancang sistem terintegrasi yang menghubungkan portal pelanggan, aplikasi lapangan teknisi, dispatcher admin, chatbot AI WhatsApp, dan sistem prediktif guna mengotomatisasi siklus pemeliharaan AC secara transparan dan akuntabel?

### 6. Tujuan Sistem
Membangun platform digital terpadu yang memfasilitasi pemesanan servis, alokasi teknisi cerdas bebas konflik, pelaporan Berita Acara Pekerjaan (BAP) digital dengan foto Before/After, penagihan invoice otomatis, serta pengingat servis proaktif setiap 90 hari.

### 7. Manfaat Sistem
- **Bagi Pelanggan:** Kemudahan pemesanan 24 jam, kejelasan status penugasan teknisi, transparansi tarif, dan kepastian garansi 30 hari.
- **Bagi Teknisi:** Kejelasan instruksi Surat Perintah Kerja (SPK), navigasi rute efisien, dan formulir kerja digital tanpa kertas.
- **Bagi Manajemen (CV. Nara Teknindotama):** Efisiensi dispatcher, pengawasan stok suku cadang gudang, pemantauan omzet harian, dan akurasi peramalan beban kerja.

### 8. Ruang Lingkup
Mencakup layanan pelanggan residensial (B2C) dan gedung perkantoran (B2B) di wilayah Sleman, Kota Yogyakarta, Bantul, dan sekitarnya. Modul mencakup pemesanan, penjadwalan, pengerjaan servis, penagihan, garansi, chatbot WhatsApp, dan peramalan data science.

### 9. Metodologi Pengembangan
Menggunakan pendekatan *Agile / Incremental Development* dengan siklus rilis teratur, pengujian otomatis terintegrasi (*Test-Driven Development*), dan tinjauan kepatuhan keamanan (*DevSecOps*).

### 10. Analisis Sistem Berjalan
Sebelum sistem ini diimplementasikan, seluruh proses berjalan manual melalui chat WhatsApp dan buku catatan fisik: pelanggan mengirim chat tidak terstruktur, admin memeriksa jadwal di buku tulis, teknisi mencatat BAP di kertas nota, dan bukti transfer dikirim via chat tanpa validasi sistem.

### 11. Analisis Sistem yang Diusulkan
Sistem NARA AC mendigitalkan seluruh interaksi ke dalam alur terstandarisasi: request via web/bot AI masuk ke antrean database, admin menugaskan teknisi via dispatcher terpusat, teknisi mengisi SPK dan mengunggah foto via ponsel, faktur terbit otomatis, dan klaim garansi terlindungi sistem selama 30 hari.

### 12. Pemangku Kepentingan dan Aktor
- **Pelanggan (Customer):** Pengguna layanan servis AC.
- **Teknisi Lapangan (Technician):** Eksekutor pekerjaan teknis perawatan dan perbaikan di lokasi.
- **Administrator / Dispatcher:** Pengelola operasional, penugasan teknisi, dan verifikasi keuangan.
- **Bot AI WhatsApp:** Asisten virtual interaktif 24 jam.

### 13. Analisis Kebutuhan Fungsional
Sistem mendefinisikan 26 kebutuhan fungsional berkode `FR-001` hingga `FR-026` yang mencakup otentikasi, manajemen aset AC, booking, alokasi teknisi, checklist SOP, foto Before/After, penagihan invoice, garansi, ulasan, chatbot AI, dan data science. Rincian tabel kebutuhan fungsional terdapat pada [`docs/02-ANALISIS-KEBUTUHAN.md`](docs/02-ANALISIS-KEBUTUHAN.md).

### 14. Analisis Kebutuhan Nonfungsional
Mencakup standar keamanan (OWASP Top 10), integritas data (ACID transaksi), performa API (< 200 ms), kemudahan penggunaan (responsif seluler), dan ketersediaan layanan 99.5%. Rincian selengkapnya terdapat pada [`docs/02-ANALISIS-KEBUTUHAN.md`](docs/02-ANALISIS-KEBUTUHAN.md).

### 15. Aturan Bisnis
Sistem menegakkan 47 aturan bisnis formal (`BR-01` hingga `BR-47`) yang mengatur jam operasional (08:00–17:00 WIB), masa garansi 30 hari, siklus pengingat servis 90 hari, transparansi penyesuaian biaya tambahan (*Price Override*), serta batas etika AI. Rincian selengkapnya terdapat pada [`docs/03-ATURAN-BISNIS.md`](docs/03-ATURAN-BISNIS.md).

### 16. Arsitektur Sistem
Mengusung arsitektur *Decoupled Service-Oriented Web Application* dengan pemisahan tegas antara frontend React 19, backend Node.js Express 4.19, basis data PostgreSQL 14+, layanan NLP FastAPI Python, dan dashboard analitik Streamlit. Rincian arsitektur terdapat pada [`docs/04-ARSITEKTUR-SISTEM.md`](docs/04-ARSITEKTUR-SISTEM.md).

### 17. Diagram Arsitektur
Diagram arsitektur sistem modular tersimpan pada berkas Mermaid [`docs/diagrams/01-arsitektur-sistem.mmd`](docs/diagrams/01-arsitektur-sistem.mmd).

### 18. Use Case Diagram
Diagram use case yang memetakan hubungan fungsional antara Pelanggan, Teknisi, Admin, dan Bot AI tersimpan pada berkas Mermaid [`docs/diagrams/02-use-case.mmd`](docs/diagrams/02-use-case.mmd).

### 19. Spesifikasi Use Case
Spesifikasi skenario utama, alternatif, dan kondisi kegagalan untuk use case pemesanan servis, penugasan teknisi, pelaporan SPK, dan klaim garansi didokumentasikan pada [`docs/05-USE-CASE.md`](docs/05-USE-CASE.md).

### 20. Activity Diagram
Diagram aktivitas interaktif dengan swimlane multi-peran tersimpan pada:
- Alur Booking Servis: [`docs/diagrams/04-alur-booking.mmd`](docs/diagrams/04-alur-booking.mmd) dan [`docs/diagrams/05-activity-booking.mmd`](docs/diagrams/05-activity-booking.mmd)
- Alur Pembayaran & Faktur: [`docs/diagrams/07-alur-pembayaran.mmd`](docs/diagrams/07-alur-pembayaran.mmd)
- Alur Pekerjaan Teknisi di Lapangan: [`docs/diagrams/08-alur-pekerjaan-teknisi.mmd`](docs/diagrams/08-alur-pekerjaan-teknisi.mmd)
- Alur Klaim Garansi 30 Hari: [`docs/diagrams/09-alur-garansi.mmd`](docs/diagrams/09-alur-garansi.mmd)
- Alur Pengingat WhatsApp 90 Hari: [`docs/diagrams/10-alur-pengingat-whatsapp.mmd`](docs/diagrams/10-alur-pengingat-whatsapp.mmd)

### 21. Sequence Diagram
Diagram sekuens interaksi request/response antar frontend, backend, basis data, dan AI tersimpan pada [`docs/diagrams/06-sequence-booking.mmd`](docs/diagrams/06-sequence-booking.mmd). Rincian alur bisnis lengkap didokumentasikan pada [`docs/06-ALUR-BISNIS.md`](docs/06-ALUR-BISNIS.md).

### 22. ERD (Entity Relationship Diagram)
Diagram ERD komprehensif mencakup seluruh 34 tabel relasional PostgreSQL dan disajikan modular pada [`docs/diagrams/03-erd.mmd`](docs/diagrams/03-erd.mmd).

### 23. Struktur dan Kamus Data
Kamus data lengkap mendokumentasikan nama tabel, kolom, tipe data, kunci (PK/FK/Unique), nullability, nilai default, dan deskripsi fungsional untuk seluruh 34 tabel pada [`docs/07-DESAIN-DATABASE.md`](docs/07-DESAIN-DATABASE.md).

### 24. Relasi Antartabel
Integritas relasional ditegakkan dengan foreign key eksplisit dan konfigurasi `ON DELETE RESTRICT` pada tabel finansial (`bookings`, `service_reports`, `inventory_usage`) serta `ON DELETE CASCADE` pada rincian item (`booking_items`).

### 25. Status dan Siklus Hidup Data
Sistem mengimplementasikan state machine terpadu untuk:
- Siklus Booking: `Menunggu Konfirmasi` -> `Teknisi Ditugaskan` -> `Dalam Perjalanan` -> `Sedang Dikerjakan` -> `Menunggu Pembayaran` -> `Selesai` (atau `Dibatalkan`).
- Siklus Pembayaran: `Belum Dibayar` -> `Menunggu Verifikasi` -> `Lunas` -> Garansi Aktif.
- Siklus Garansi: `Menunggu Verifikasi` -> `Disetujui` -> `Jadwal Ulang` -> `Selesai`.

### 26. Desain API
Katalog rute RESTful API disajikan dengan format JSON baku, mencakup rute otentikasi (`/auth`), pemesanan (`/bookings`), pelanggan (`/customer`), teknisi (`/technician`), admin (`/admin`), pembayaran (`/payments`), dan klaim (`/claims`). Rincian selengkapnya terdapat pada [`docs/08-REFERENSI-API.md`](docs/08-REFERENSI-API.md).

### 27. Dokumentasi Frontend
Menggunakan React 19, Tailwind CSS v4, dan Vite. Struktur direktori, tabel rute 35 halaman JSX, hook kustom `useContextualBack` dan `useBusinessProfile`, serta pola UI/UX didokumentasikan pada [`docs/09-DOKUMENTASI-FRONTEND.md`](docs/09-DOKUMENTASI-FRONTEND.md).

### 28. Dokumentasi Backend
Menggunakan Node.js 18+ dan Express 4.19. Lapisan middleware pipeline (Helmet, CORS, CSRF Double-Submit Cookie, Rate Limit, Auth RBAC), manajemen transaksi SQL `BEGIN ... COMMIT` dengan `FOR UPDATE`, inspeksi biner magic-byte unggahan berkas, dan penanganan error didokumentasikan pada [`docs/10-DOKUMENTASI-BACKEND.md`](docs/10-DOKUMENTASI-BACKEND.md).

### 29. Dokumentasi AI (Kecerdasan Buatan)
Microservice Python FastAPI pada port `8000`. Mengklasifikasikan 20 intent percakapan bahasa Indonesia menggunakan TF-IDF Vectorizer dan LinearSVC/LogisticRegression, dilengkapi aturan regex ekstraksi entitas PK dan batas keamanan etika AI. Didokumentasikan pada [`docs/11-DOKUMENTASI-AI-DATA-SCIENCE.md`](docs/11-DOKUMENTASI-AI-DATA-SCIENCE.md).

### 30. Dokumentasi Data Science
Pipeline sains data menggunakan 4 dataset CSV operasional (1.400+ baris data riil). Melatih model peramalan Ridge Regression untuk memproyeksikan permintaan servis 14 hari ke depan (MAE < 1.85 order/hari) dan menyajikan dashboard analitik interaktif 4 tab via Streamlit pada port `8501`. Didokumentasikan pada [`docs/11-DOKUMENTASI-AI-DATA-SCIENCE.md`](docs/11-DOKUMENTASI-AI-DATA-SCIENCE.md).

### 31. Integrasi Eksternal
Mencakup gateway WhatsApp (Fonnte / Meta Cloud API), Google Maps Geolocation untuk pemetaan koordinat pelanggan, serta arsitektur adapter payment gateway siap pakai.

### 32. Keamanan dan Privasi
Menerapkan perlindungan kata sandi bcrypt, pencegahan serangan IDOR melalui pengecekan kepemilikan data, perlindungan CSRF ganda, kueri SQL berparameter 100%, inspeksi magic-byte unggahan berkas, dan sanitasi data pribadi (PII) pada log audit. Matriks risiko lengkap didokumentasikan pada [`docs/12-KEAMANAN-DAN-PRIVASI.md`](docs/12-KEAMANAN-DAN-PRIVASI.md).

### 33. Desain Antarmuka dan Responsivitas
Desain responsif berprinsip *Mobile-First*, dilengkapi skeleton loading shimmer untuk mencegah CLS, modal konfirmasi aksi destruktif, notifikasi toast instan, dan penanganan status jaringan terputus (PWA Offline Fallback).

### 34. Strategi Pengujian
Piramida pengujian terintegrasi mencakup unit testing logika bisnis, component testing antarmuka React, integration testing API backend, hingga skenario end-to-end verifikasi alur pemesanan dan pembayaran.

### 35. Hasil Verifikasi
- Frontend Vitest: **48 Test Cases PASS (100%)**
- Frontend Production Build: **184 Modules Berhasil Dikompilasi dalam 1.11 detik**
- Backend E2E Node Native Test: **9 Skenario PASS (100%)**
- Backend Syntax Inspection: **39 Berkas JavaScript Bersih (100%)**
- AI NLP Unit Tests: **25 Test Cases PASS (100%)**
- Data Science Pipeline: **9 Test Cases PASS (100%)**
Bukti eksekusi faktual didokumentasikan pada [`docs/13-PENGUJIAN-DAN-KUALITAS.md`](docs/13-PENGUJIAN-DAN-KUALITAS.md).

### 36. Instalasi dan Konfigurasi
Panduan lengkap langkah demi langkah kloning repository, inisialisasi basis data PostgreSQL, eksekusi 21 migrasi SQL, seeding data operasional, penyusunan berkas `.env`, dan cara menjalankan 4 layanan lokal didokumentasikan pada [`docs/14-INSTALASI-KONFIGURASI-DEPLOYMENT.md`](docs/14-INSTALASI-KONFIGURASI-DEPLOYMENT.md).

### 37. Deployment dan Operasional
Panduan deployment produksi pada Ubuntu VPS menggunakan Reverse Proxy Nginx, SSL Let's Encrypt, HTTP/2, process manager PM2 untuk backend Node.js, systemd service untuk Python Uvicorn, serta skrip cron cadangan basis data otomatis `pg_dump` harian. Diagram deployment tersimpan pada [`docs/diagrams/11-deployment.mmd`](docs/diagrams/11-deployment.mmd).

### 38. Panduan Penggunaan Berdasarkan Peran
Petunjuk operasional praktis langkah demi langkah untuk:
- Pelanggan (Pendaftaran, Pemesanan, Pelacakan Status, Bukti Transfer, Ulasan, Klaim Garansi).
- Teknisi Lapangan (Penerimaan SPK, Mulai Perjalanan, Checklist SOP, Foto Before/After, BAP Digital).
- Administrator (Dispatcher Penugasan, Price Override, Verifikasi Pembayaran, Klaim Garansi, Laporan).
Didokumentasikan pada [`docs/15-PANDUAN-PENGGUNA.md`](docs/15-PANDUAN-PENGGUNA.md).

### 39. Keterbatasan dan Risiko
Ketergantungan operasional pada verifikasi bukti transfer manual oleh admin saat lonjakan transaksi akhir pekan dan ketergantungan saldo WhatsApp gateway dipantau melalui matriks risiko di [`NARA_AC_LAPORAN_KONDISI_PROYEK.md`](NARA_AC_LAPORAN_KONDISI_PROYEK.md).

### 40. Kesenjangan Implementasi
Daftar inventarisasi kesenjangan diklasifikasikan berdasarkan prioritas P0 (0 temuan kritis), P1 (WhatsApp Gateway Driver resmi), P2 (Otomatisasi Virtual Account & Live GPS Tracking), dan P3 (Web Push Notification). Rinciannya didokumentasikan pada [`NARA_AC_DAFTAR_KESENJANGAN_IMPLEMENTASI.md`](NARA_AC_DAFTAR_KESENJANGAN_IMPLEMENTASI.md).

### 41. Rekomendasi Pengembangan
Menyusun roadmap 3 bulan untuk mengintegrasikan payment gateway otomatis (Midtrans/Xendit) dan mendaftarkan akun resmi Meta WhatsApp Business BSP guna mendukung ekspansi operasional.

### 42. Kesimpulan
Sistem **NARA AC** telah memenuhi seluruh spesifikasi fungsional dan aturan bisnis inti yang dipersyaratkan oleh CV. Nara Teknindotama. Seluruh lapisan kode sumber terverifikasi stabil, aman, dan siap digunakan.

### 43. Daftar Istilah
Glosarium lengkap mencakup istilah rekayasa perangkat lunak, keamanan siber, kecerdasan buatan, dan terminologi tata udara pendingin (HVAC) didokumentasikan pada [`docs/16-DAFTAR-ISTILAH.md`](docs/16-DAFTAR-ISTILAH.md).

### 44. Referensi dan Lampiran
- Spesifikasi Kebutuhan Proyek NARA AC A26-CS054.
- Spesifikasi 47 Aturan Bisnis CV. Nara Teknindotama.
- Berkas Spesifikasi API Interaktif: `backend/openapi.yaml`.
- Kumpulan Berkas Diagram Sumber Mermaid: Direktori `docs/diagrams/`.
- Laporan Audit dan Verifikasi: [`NARA_AC_LAPORAN_AUDIT_DAN_VERIFIKASI.md`](NARA_AC_LAPORAN_AUDIT_DAN_VERIFIKASI.md).
- Laporan Kondisi Proyek Terkini: [`NARA_AC_LAPORAN_KONDISI_PROYEK.md`](NARA_AC_LAPORAN_KONDISI_PROYEK.md).

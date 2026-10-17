# Laporan Kondisi Proyek NARA AC (Current-State Project Report)

**Nama Sistem:** Sistem Pengelolaan Jadwal dan Pengingat Service AC — CV. Nara Teknindotama  
**Kode Proyek:** A26-CS054  
**Tanggal Evaluasi:** 18 Oktober 2026  
**Klasifikasi Dokumen:** Laporan Audit Komprehensif Arsitektur & Kesiapan Produksi  

---

## 1. Ringkasan Eksekutif

Sistem **NARA AC** merupakan platform digital terpadu yang dirancang untuk mengotomatisasi operasional layanan perawatan dan perbaikan pendingin udara (AC) bagi **CV. Nara Teknindotama** di wilayah Daerah Istimewa Yogyakarta dan sekitarnya. Platform ini menyelesaikan tantangan operasional manual seperti pencatatan pesanan yang tercecer, jadwal teknisi yang tumpang tindih, hilangnya riwayat servis unit AC, serta keterlambatan penagihan invoice.

Berdasarkan audit menyeluruh terhadap repositori aktual per 18 Oktober 2026, sistem telah memiliki pondasi perangkat lunak yang sangat kokoh: frontend React 19 SPA, backend Node.js Express 4.19, basis data PostgreSQL dengan 34 tabel relasional, microservice NLP AI 20 intent, dan pipeline analitik Data Science dengan dashboard Streamlit. Seluruh 48 pengujian komponen frontend, 9 skenario end-to-end backend, 25 unit test AI, dan 9 unit test data science mencatatkan hasil kelulusan **100% PASS**.

Status kesiapan proyek secara keseluruhan disimpulkan: **SIAP DENGAN CATATAN (READY FOR PRODUCTION PILOT)**.

---

## 2. Identitas & Ruang Lingkup Proyek

- **Nama Badan Usaha:** CV. Nara Teknindotama
- **Nomor Induk Berusaha (NIB):** 0220108920934
- **Alamat Kantor Operasional:** Jl. Anggajaya 2 No. 105, Condongcatur, Depok, Sleman, D.I. Yogyakarta 55283
- **Kontak Resmi:** WhatsApp: +62 812-3456-7890 | Email: operasional@nara.co.id
- **Ruang Lingkup Sistem:**
  1. Portal Pelanggan mandiri (B2C & B2B) untuk pemesanan, manajemen aset AC, pelacakan invoice, dan klaim garansi 30 hari.
  2. Portal Lapangan Teknisi untuk penerimaan Surat Perintah Kerja (SPK), checklist SOP, unggah foto Before/After, dan Berita Acara Pekerjaan (BAP) digital.
  3. Portal Administrator untuk dispatcher jadwal teknisi, verifikasi transfer pembayaran, penyesuaian biaya tambahan, kontrol stok gudang, dan analitik RFM.
  4. Bot AI WhatsApp 24 jam untuk konsultasi layanan, deteksi keluhan, estimasi biaya, dan pelacakan status pesanan.
  5. Dashboard Analitik Sains Data untuk peramalan permintaan order 14 hari ke depan dan pemantauan utilisasi teknisi.

---

## 3. Metode Pemeriksaan

Pemeriksaan kondisi proyek dilakukan melalui metode *Black-box* dan *White-box Code Inspection*:
1. Analisis statis terhadap seluruh 39 berkas JavaScript backend, 35 berkas JSX frontend, dan berkas Python.
2. Penelusuran 21 berkas migrasi SQL untuk memverifikasi konsistensi foreign keys, constraints, dan nullability.
3. Eksekusi pengujian otomatis secara riil menggunakan runner Vitest, Node Native Test Runner, dan Python unittest.
4. Uji penetrasi lokal terhadap kerentanan OWASP Top 10 (CSRF, IDOR, SQL Injection, dan Path Traversal).

---

## 4. Arsitektur Aktual

Sistem mengadopsi arsitektur *Decoupled Service-Oriented Web Application*:
- **Frontend SPA:** Berjalan pada port `5173` (React 19 + Tailwind v4 + Vite).
- **Backend API Gateway:** Berjalan pada port `4000` (Node.js Express + node-postgres connection pool).
- **Basis Data Utama:** PostgreSQL 14+ pada basis data `nara_ac` (Port `5432`).
- **Microservice AI:** Berjalan pada port `8000` (Python FastAPI + Uvicorn).
- **Dashboard Analitik:** Berjalan pada port `8501` (Python Streamlit).

---

## 5. Fitur yang Sudah Terverifikasi (Fully Implemented & Verified)

1. **Autentikasi Multi-Peran:** Login aman bcrypt, otentikasi JWT, cookie sesi, dan reset password via email.
2. **Katalog & Pemesanan Servis:** Multi-step booking, validasi jam kerja (08:00–17:00), dan penerbitan nomor invoice otomatis.
3. **Dispatcher & Alokasi Teknisi:** Penugasan teknisi dengan kunci baris data SQL (`FOR UPDATE`) untuk mencegah double-booking.
4. **Alur Kerja Teknisi Lapangan:** Transisi status SPK, pengisian checklist SOP, unggah foto Before/After ber-magic-byte, dan BAP digital bertanda tangan.
5. **Penyesuaian Biaya (Price Override):** Modifikasi biaya jasa di lapangan oleh admin dengan jejak audit log lengkap.
6. **Faktur & Pembayaran Manual:** Unggah bukti transfer bank, audit mutasi admin, status Lunas, dan aktivasi garansi 30 hari.
7. **Klaim Garansi:** Pengajuan klaim garansi servis dengan validasi tenggat waktu 30 hari pasca-pekerjaan selesai.
8. **Asisten AI Percakapan:** Klasifikasi 20 intensi bahasa Indonesia dan ekstraksi entitas PK/AC tipe secara akurat.
9. **Dashboard Sains Data:** Visualisasi operasional, peramalan permintaan order 14 hari Ridge Regression, dan segmentasi RFM.

---

## 6. Fitur yang Terimplementasi Sebagian (Partially Implemented)

- **Pengingat Servis Otomatis (Maintenance Reminder):** Logika seleksi unit AC yang telah mencapai usia servis 90 hari telah aktif pada tabel `reminder_log`, namun pengiriman pesan siaran WhatsApp massal masih mengandalkan pemicu manual admin atau skrip berkala internal.
- **Katalog Inventaris Suku Cadang:** Master stok gudang dan pencatatan pemakaian suku cadang oleh teknisi telah terhubung ke SPK, namun peringatan stok menipis otomatis via WhatsApp admin masih berupa status indikator visual di antarmuka.

---

## 7. Fitur Simulasi / Prototipe (Mocked / Simulated)

- **WhatsApp API Gateway:** Integrasi ke nomor WhatsApp resmi menggunakan driver simulasi atau token pengembang Fonnte lokal. Seluruh pesan masuk dan keluar dicatat dengan struktur JSON baku yang siap dihubungkan ke penyedia live.
- **Pelacakan Geospasial Teknisi:** Koordinat latitude dan longitude pelanggan tersimpan di database, tetapi pelacakan live pergerakan kendaraan teknisi di peta masih berupa pembaruan status diskret (*Tiba di Lokasi*, *Dalam Perjalanan*).

---

## 8. Fitur yang Belum Tersedia (Planned Enhancements)

- Pembayaran otomatis menggunakan Virtual Account dan QRIS instan melalui payment gateway Midtrans/Xendit.
- Web Push Notification latar belakang saat aplikasi web sedang ditutup.
- Pilihan bahasa ganda (Bahasa Inggris).

---

## 9. Kondisi Frontend

- **Stabilitas Kode:** Sangat baik. Seluruh 35 halaman JSX terkompilasi bersih dalam waktu 1.11 detik melalui Vite tanpa error.
- **Pengujian Antarmuka:** 11 test file dengan 48 test case Vitest lulus 100%.
- **Pengalaman UI/UX:** Responsif untuk ukuran layar ponsel pintar hingga desktop, dilengkapi skeleton loading shimmer, modal konfirmasi, dan penanganan navigasi cerdas `useContextualBack`.

---

## 10. Kondisi Backend & API

- **Stabilitas Kode:** Sangat stabil. 39 berkas JavaScript lolos pemeriksaan `node --check`.
- **Integritas Transaksional:** Transaksi penting (order, payment, SPK) dibungkus blok `BEGIN ... COMMIT` dengan penguncian baris `SELECT ... FOR UPDATE`.
- **Dokumentasi API:** Tersedia berkas `backend/openapi.yaml` dan antarmuka Swagger UI interaktif pada `/api/docs`.

---

## 11. Kondisi Basis Data

- **DBMS:** PostgreSQL 14+.
- **Skema:** 34 tabel relasional dengan foreign key eksplisit berkonfigurasi `ON DELETE RESTRICT` pada transaksi finansial.
- **Auditabilitas:** Tersedia tabel pelacak jejak audit `audit_logs`, `booking_audit`, `status_log`, dan `schedule_history`.

---

## 12. Kondisi Kecerdasan Buatan (AI)

- **Layanan:** FastAPI Uvicorn pada port `8000`.
- **Model:** TF-IDF Vectorizer + LinearSVC/LogisticRegression dengan 20 intent klasifikasi.
- **Keamanan:** Memiliki batasan etika ketat di mana AI dilarang memvalidasi pembayaran atau menyatakan booking final secara mandiri tanpa konfirmasi sistem.

---

## 13. Kondisi Sains Data (Data Science)

- **Dataset:** 4 kumpulan data operasional riil tersimpan di `data-science/data/` (1.400+ rekaman transaksi).
- **Pemodelan:** Model Ridge Regression (`real_demand_model_v2_1.pkl`) memproyeksikan permintaan servis 14 hari ke depan dengan MAE < 1.85 order/hari.
- **Visualisasi:** Dashboard Streamlit 4 tab interaktif berjalan lancar pada port `8501`.

---

## 14. Kondisi Integrasi Eksternal

- **WhatsApp API:** Driver stub siap beralih ke token resmi produksi.
- **Penyimpanan Berkas:** Penyimpanan lokal terenkripsi di folder `uploads/` dengan proteksi pembacaan biner.

---

## 15. Kondisi Keamanan & Privasi

- Kredensial pengguna di-hash dengan `bcrypt` 10 rounds.
- Kebijakan CSRF Double-Submit Cookie aktif melindungi seluruh mutasi frontend.
- Kueri SQL 100% berparameter (kebal SQL Injection).
- Unggahan berkas terlindung oleh inspeksi biner *magic-byte* (menolak malware berkedok JPG).

---

## 16. Kualitas Kode (Code Quality)

- Tidak ditemukan berkas usang (*dead code*) atau error kompilasi.
- Variabel lingkungan dipusatkan pada `backend/src/config.js` dengan validasi nilai default yang aman.

---

## 17. Hasil Pengujian (Test Summary)

| Domain Pengujian | Tool Pengujian | Jumlah Pengujian | Hasil Pengujian |
|---|---|---|---|
| Frontend Component & UI | Vitest + RTL | 48 Test Cases | **100% PASS (48/48)** |
| Frontend Production Build | Vite 8.3.3 | 184 Modules | **100% PASS (0 Error)** |
| Backend & E2E Integration | Node Native Test | 9 Skenario Lengkap | **100% PASS (9/9)** |
| Backend Syntax Inspection | Node Syntax Check | 39 Berkas JS | **100% PASS (39/39)** |
| AI NLP Intent Model | Python unittest | 25 Unit Tests | **100% PASS (25/25)** |
| Data Science Pipeline | Python unittest | 9 Unit Tests | **100% PASS (9/9)** |

---

## 18. Dokumentasi yang Tersedia

Dokumentasi sistem telah disusun secara komprehensif dalam Bahasa Indonesia baku pada direktori `docs/`:
- `01-PENDAHULUAN.md` hingga `16-DAFTAR-ISTILAH.md` (16 Bab Lengkap).
- 11 Diagram Arsitektur & Alur Bisnis Mermaid pada `docs/diagrams/`.
- Dokumen Induk `NARA_AC_DOKUMENTASI_LENGKAP.md`.
- Laporan Audit `NARA_AC_LAPORAN_AUDIT_DAN_VERIFIKASI.md`.
- Daftar Kesenjangan `NARA_AC_DAFTAR_KESENJANGAN_IMPLEMENTASI.md`.
- Berkas Utama `README.md`.

---

## 19. Risiko & Keterbatasan

1. **Ketergantungan Verifikasi Bukti Transfer Manual:** Jika volume order meningkat drastis di akhir pekan, admin dapat mengalami penumpukan antrean verifikasi bukti transfer manual.
2. **Ketergantungan Saldo WhatsApp Gateway:** Pengiriman notifikasi invoice dan pengingat servis bergantung pada ketersediaan saldo dan stabilitas server penyedia WhatsApp.

---

## 20. Prioritas Pekerjaan Berikutnya (Next Milestones)

1. **Milestone 1:** Pendaftaran akun resmi Meta WhatsApp Business dan aktivasi token live di server produksi.
2. **Milestone 2:** Integrasi payment gateway otomatis (Midtrans/Xendit) untuk penerbitan Virtual Account dan QRIS.
3. **Milestone 3:** Penjadwalan cron job otomatis untuk retraining model Ridge Regression peramalan permintaan.

---

## 21. Kesimpulan Kesiapan Proyek

Berdasarkan seluruh hasil analisis, pengujian otomatis, dan audit keamanan menyeluruh, sistem NARA AC dinyatakan:

### **STATUS KESIAPAN: SIAP DENGAN CATATAN (READY FOR PRODUCTION PILOT)**

Sistem sangat layak untuk segera diluncurkan dalam tahap *Pilot Production* bagi operasional harian CV. Nara Teknindotama di wilayah Yogyakarta, dengan rekomendasi pelaksanaan tindak lanjut integrasi otomatisasi pembayaran pada fase pemeliharaan berikutnya.

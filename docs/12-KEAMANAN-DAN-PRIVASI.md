# 12 — Keamanan & Privasi (Security & Privacy)

Dokumen ini mendokumentasikan kerangka kerja keamanan siber, mitigasi kerentanan, proteksi data pribadi (PII), dan matriks risiko pada sistem **NARA AC — CV. Nara Teknindotama** (Kode Proyek: **A26-CS054**).

---

## 1. Model Autentikasi & Otorisasi Berbasis Peran (RBAC)

NARA AC menerapkan kontrol akses ketat multi-lapisan untuk memastikan prinsip *Least Privilege* (hak akses seminimal mungkin):

- **Penyimpanan Kredensial:** Kata sandi di-hash menggunakan algoritma `bcrypt` dengan garam (*salt*) 10 putaran pada saat pendaftaran pengguna baru. Kata sandi mentah (*plain-text*) tidak pernah disimpan maupun dicatat ke dalam log sistem.
- **Manajemen Token:** Menggunakan JSON Web Token (JWT) dengan algoritma `HS256` dan masa kedaluwarsa terbatas (24 jam untuk pengguna web, 1 jam untuk sesi sensitif). Token diverifikasi di setiap permintaan API terlindungi melalui middleware `backend/src/middleware/auth.js`.
- **Pemisahan Peran (*Role Separation*):**
  - **`pelanggan`**: Terisolasi hanya dapat mengakses data diri, aset unit AC miliknya, pesanan booking miliknya, faktur invoice miliknya, serta mengajukan klaim garansi miliknya.
  - **`teknisi`**: Terisolasi hanya dapat melihat Surat Perintah Kerja (SPK) yang secara eksplisit ditugaskan kepada ID teknisinya oleh admin, mengisi Berita Acara Pekerjaan (BAP), dan mengunggah foto sebelum/sesudah servis.
  - **`admin`**: Memiliki wewenang manajerial penuh (konfirmasi order, penugasan teknisi, verifikasi keuangan, master inventaris, dan audit sistem).

---

## 2. Mitigasi Kerentanan Web (OWASP Top 10)

### 2.1 Pencegahan Insecure Direct Object Reference (IDOR)
Kerentanan IDOR dicegah secara terstruktur pada tingkat kueri SQL dan lapisan service:
- Kueri pengambilan detail booking atau unit AC milik pelanggan selalu menyertakan filter ID pemilik:
  ```sql
  SELECT * FROM bookings WHERE id = $1 AND customer_id = $2;
  ```
- Jika pengguna mencoba mengganti parameter URL `id` dengan ID pesanan milik orang lain, sistem secara otomatis mengembalikan respons `403 Forbidden` atau `404 Not Found`.

### 2.2 Pencegahan Cross-Site Request Forgery (CSRF)
Menggunakan pola **Double-Submit Cookie Pattern** (`backend/src/middleware/csrf.js`):
- Server menerbitkan token acak berkriptografi tinggi ke dalam cookie peramban.
- Frontend membaca token tersebut dan menyertakannya dalam header `x-csrf-token` pada setiap mutasi data (`POST`, `PUT`, `DELETE`).
- Permintaan ditolak seketika (`403 Invalid CSRF Token`) jika header tidak cocok dengan cookie, mencegah eksploitasi pemalsuan permintaan lintas situs.

### 2.3 Pencegahan Injeksi SQL (SQL Injection)
- 100% kueri basis data pada seluruh service backend menggunakan **Parameterized Queries** (`$1`, `$2`, dst.) yang disediakan oleh driver resmi `node-postgres` (`pg.Pool`).
- Tidak ada interpolasi string mentah (*string concatenation*) pada kueri SQL yang bersumber dari input pengguna.

### 2.4 Pembatasan Laju Permintaan (Rate Limiting)
- Menerapkan pembatasan laju panggilan berbasis alamat IP pada endpoint publik yang rentan serangan *brute-force* atau *credential stuffing*:
  - Rute `/api/v1/auth/login`: Maksimal 10 percobaan per 15 menit.
  - Rute `/api/v1/auth/wa-otp/request`: Maksimal 3 permintaan per jam per nomor WhatsApp.
  - Rute Booking Publik: Maksimal 20 permintaan per jam per IP.

### 2.5 Keamanan Unggah Berkas (Binary Magic-Byte Inspection)
- Verifikasi keamanan berkas (`backend/src/utils/upload.js`) tidak hanya mengandalkan ekstensi nama berkas atau header MIME `Content-Type` yang mudah dipalsukan.
- Buffer berkas diperiksa secara mendalam membaca byte awal (*magic-byte* biner):
  - Berkas JPEG wajib berawalan `FF D8 FF`.
  - Berkas PNG wajib berawalan `89 50 4E 47`.
  - Berkas PDF wajib berawalan `25 50 44 46` (`%PDF`).
- Nama berkas asli ditimpa dengan nama acak UUIDv4 dan disimpan di folder `uploads/` yang tidak memiliki izin eksekusi skrip (*no-exec mount*).

---

## 3. Perlindungan Data Pribadi (PII) & Privasi

Sistem NARA AC memproses data pribadi pelanggan, meliputi nama lengkap, nomor telepon, alamat rumah, titik koordinat GPS, dan riwayat kerusakan perangkat.

- **Prinsip Sanitasi Log:** Winston logger dikonfigurasi untuk menyaring (*redact*) informasi rahasia. Kolom `password`, `token`, `otp_code`, dan nomor rekening bank tidak pernah ditulis ke dalam berkas log teks atau konsol.
- **Penyimpanan Terisolasi:** Berkas bukti transfer pembayaran dan tanda tangan pelanggan hanya dapat diakses melalui endpoint terlindungi `/api/v1/files/:name` yang memerlukan otentikasi sesi aktif.
- **Kebijakan Retensi:**
  - Token OTP kedaluwarsa setelah 5 menit dan dihapus secara otomatis.
  - Token reset kata sandi kedaluwarsa setelah 15 menit.
  - Log audit aktivitas pengguna disimpan selama 365 hari untuk keperluan investigasi kepatuhan.

---

## 4. Matriks Risiko Keamanan

| ID Risiko | Deskripsi Risiko | Aset Terdampak | Kemungkinan | Dampak | Bukti Kode & Mitigasi Aktual | Status Risiko |
|---|---|---|---|---|---|---|
| **RSK-01** | Pengunggahan web shell atau malware berkedok gambar bukti transfer | Server backend & direktori `uploads/` | Rendah | Kritis | Diinspeksi biner magic-byte di `backend/src/utils/upload.js`, penamaan acak UUID. | Terkendali |
| **RSK-02** | Pengaksesan booking atau faktur orang lain (IDOR) | Data privasi pesanan & invoice | Sedang | Tinggi | Pemeriksaan kepemilikan data eksplisit di `middleware/auth.js` dan kueri berparameter. | Terkendali |
| **RSK-03** | Serangan pemalsuan permintaan antar situs (CSRF) | Aksi mutasi order & pembayaran | Sedang | Tinggi | Diterapkan middleware `csrf.js` Double-Submit Cookie pada seluruh mutasi frontend. | Terkendali |
| **RSK-04** | Serangan brute-force pada password atau OTP WhatsApp | Akun pengguna & kuota SMS/WA | Tinggi | Sedang | Rate limiter terpasang di rute login dan request OTP (`backend/src/routes/auth.js`). | Terkendali |
| **RSK-05** | Kondisi balapan alokasi teknisi (*Race Condition*) | Jadwal kerja teknisi & booking | Sedang | Sedang | Kunci baris data `SELECT ... FOR UPDATE` dalam transaksi SQL (`bookingService.js`). | Terkendali |
| **RSK-06** | Kebocoran kunci rahasia (*secret keys*) di repository | Database, API Key Gemini, JWT Secret | Rendah | Kritis | Seluruh variabel rahasia dimuat via `.env` dan diabaikan oleh `.gitignore`. | Terkendali |

# 08 — Referensi Antarmuka Pemrograman Aplikasi (API Reference)

Dokumen ini mendokumentasikan spesifikasi teknis lengkap dari RESTful Application Programming Interface (API) **NARA AC — CV. Nara Teknindotama** (Kode Proyek: **A26-CS054**).

API dibangun menggunakan **Node.js 18+** dengan framework **Express 4.19.2** pada port `4000`, menggunakan prefiks rute `/api/v1`. Dokumentasi interaktif Swagger UI tersedia pada rute `/api/docs` (berdasarkan `backend/openapi.yaml`).

---

## 1. Standar & Konvensi API

- **Format Data:** JSON (`application/json`) untuk request dan response body.
- **Header Keamanan & CSRF:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <jwt_access_token>` (atau melalui HttpOnly cookie `access_token`)
  - `x-csrf-token: <csrf_token>` (Wajib untuk request mutasi `POST`, `PUT`, `DELETE` dari frontend web browser)
- **Format Respons Baku:**
  - Sukses:
    ```json
    {
      "status": "success",
      "data": { ... },
      "message": "Operasi berhasil dilakukan"
    }
    ```
  - Gagal:
    ```json
    {
      "status": "fail",
      "error": "Pesan deskripsi kesalahan validasi atau bisnis",
      "code": "ERROR_CODE_STRING"
    }
    ```
- **Kode Status HTTP Standar:**
  - `200 OK` — Permintaan berhasil diproses.
  - `201 Created` — Sumber daya baru berhasil dibuat.
  - `400 Bad Request` — Parameter tidak valid atau melanggar aturan bisnis.
  - `401 Unauthorized` — Token otentikasi tidak ada atau kedaluwarsa.
  - `403 Forbidden` — Akses ditolak (peran tidak sesuai atau IDOR check gagal).
  - `404 Not Found` — Sumber daya tidak ditemukan.
  - `409 Conflict` — Konflik konkurensi (misal: slot teknisi sudah terisi).
  - `422 Unprocessable Entity` — Format berkas tidak diizinkan atau ukuran melebihi batas.
  - `429 Too Many Requests` — Pembatasan laju panggilan (Rate Limit) terlampaui.
  - `500 Internal Server Error` — Kesalahan internal sistem.

---

## 2. Modul Autentikasi (`/api/v1/auth`)

| Metode | Endpoint | Deskripsi | Autentikasi | Peran Diizinkan | Status Verifikasi |
|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Mendaftarkan akun pelanggan baru | Publik | Publik | Terverifikasi |
| `POST` | `/api/v1/auth/login` | Login menggunakan email dan kata sandi | Publik | Publik | Terverifikasi |
| `POST` | `/api/v1/auth/logout` | Menghapus token JWT & sesi cookie | JWT / Cookie | Semua Peran | Terverifikasi |
| `GET` | `/api/v1/auth/me` | Mengambil profil pengguna yang sedang login | JWT / Cookie | Semua Peran | Terverifikasi |
| `POST` | `/api/v1/auth/forgot-password`| Mengirimkan token reset password ke email | Publik | Publik | Terverifikasi |
| `POST` | `/api/v1/auth/reset-password` | Menyetel ulang kata sandi dengan token | Publik | Publik | Terverifikasi |
| `POST` | `/api/v1/auth/wa-otp/request` | Meminta kode OTP login via WhatsApp | Publik | Publik | Terverifikasi |
| `POST` | `/api/v1/auth/wa-otp/verify` | Verifikasi kode OTP dan generate JWT | Publik | Publik | Terverifikasi |

#### Contoh Request & Response: Login (`POST /api/v1/auth/login`)
- **Request Body:**
  ```json
  {
    "email": "budi.santoso@example.com",
    "password": "PasswordAman123!"
  }
  ```
- **Response Sukses (200 OK):**
  ```json
  {
    "status": "success",
    "message": "Login berhasil",
    "data": {
      "user": {
        "id": 14,
        "nama": "Budi Santoso",
        "email": "budi.santoso@example.com",
        "role": "pelanggan"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```

---

## 3. Modul Booking & Pesanan (`/api/v1/bookings`)

| Metode | Endpoint | Deskripsi | Autentikasi | Peran Diizinkan | Status Verifikasi |
|---|---|---|---|---|---|
| `GET` | `/api/v1/bookings` | Mengambil daftar booking (scoped per user) | JWT | Pelanggan, Admin | Terverifikasi |
| `POST` | `/api/v1/bookings` | Membuat booking pesanan baru | JWT | Pelanggan, Admin | Terverifikasi |
| `GET` | `/api/v1/bookings/:id` | Mengambil rincian detail satu booking | JWT | Pemilik, Teknisi, Admin | Terverifikasi |
| `PUT` | `/api/v1/bookings/:id/cancel` | Membatalkan booking sebelum teknisi jalan | JWT | Pemilik, Admin | Terverifikasi |
| `PUT` | `/api/v1/bookings/:id/reschedule`| Mengajukan perubahan jadwal booking | JWT | Pemilik, Admin | Terverifikasi |
| `POST` | `/api/v1/bookings/:id/feedback` | Mengirimkan ulasan dan rating bintang | JWT | Pemilik | Terverifikasi |

#### Contoh Request & Response: Buat Booking (`POST /api/v1/bookings`)
- **Request Body:**
  ```json
  {
    "tanggal_booking": "2026-10-25",
    "jam_booking": "10:00",
    "tipe_layanan": "Cuci AC Split Standard",
    "ac_unit_id": 5,
    "jumlah_unit": 2,
    "keluhan": "AC kamar kurang dingin dan agak menetes air",
    "idempotency_key": "booking-req-uuid-98421b-2026"
  }
  ```
- **Response Sukses (201 Created):**
  ```json
  {
    "status": "success",
    "message": "Booking berhasil dibuat",
    "data": {
      "booking_id": 108,
      "nomor_invoice": "INV/20261025/0014",
      "status": "Menunggu Konfirmasi",
      "total_biaya": 150000.00,
      "tanggal_booking": "2026-10-25",
      "jam_booking": "10:00:00"
    }
  }
  ```

---

## 4. Modul Pelanggan (`/api/v1/customer`)

| Metode | Endpoint | Deskripsi | Autentikasi | Peran Diizinkan | Status Verifikasi |
|---|---|---|---|---|---|
| `GET` | `/api/v1/customer/profile` | Mengambil profil dan data kontak pelanggan | JWT | Pelanggan | Terverifikasi |
| `PUT` | `/api/v1/customer/profile` | Memperbarui profil dan koordinat alamat | JWT | Pelanggan | Terverifikasi |
| `GET` | `/api/v1/customer/units` | Mengambil daftar unit AC milik pelanggan | JWT | Pelanggan | Terverifikasi |
| `POST` | `/api/v1/customer/units` | Mendaftarkan unit AC baru | JWT | Pelanggan | Terverifikasi |
| `PUT` | `/api/v1/customer/units/:id` | Memperbarui data spesifikasi unit AC | JWT | Pemilik Aset | Terverifikasi |
| `DELETE` | `/api/v1/customer/units/:id` | Menghapus unit AC (jika tanpa riwayat) | JWT | Pemilik Aset | Terverifikasi |
| `GET` | `/api/v1/customer/history` | Riwayat servis komprehensif | JWT | Pelanggan | Terverifikasi |

---

## 5. Modul Teknisi Lapangan (`/api/v1/technician`)

| Metode | Endpoint | Deskripsi | Autentikasi | Peran Diizinkan | Status Verifikasi |
|---|---|---|---|---|---|
| `GET` | `/api/v1/technician/jobs` | Mengambil daftar tugas/SPK aktif teknisi | JWT | Teknisi | Terverifikasi |
| `GET` | `/api/v1/technician/jobs/:id` | Detail instruksi pekerjaan dan checklist | JWT | Teknisi Terkait | Terverifikasi |
| `PUT` | `/api/v1/technician/jobs/:id/status`| Memperbarui status kerja (OTW/Tiba/Kerja) | JWT | Teknisi Terkait | Terverifikasi |
| `POST` | `/api/v1/technician/jobs/:id/report`| Mengunggah Berita Acara Pekerjaan (BAP) | JWT | Teknisi Terkait | Terverifikasi |
| `POST` | `/api/v1/technician/jobs/:id/photos`| Mengunggah foto dokumentasi Before/After | JWT | Teknisi Terkait | Terverifikasi |
| `POST` | `/api/v1/technician/jobs/:id/parts` | Mencatat penggunaan suku cadang gudang | JWT | Teknisi Terkait | Terverifikasi |
| `GET` | `/api/v1/technician/schedule` | Melihat agenda kalender kerja teknisi | JWT | Teknisi | Terverifikasi |

---

## 6. Modul Administrasi & Operasional (`/api/v1/admin`)

| Metode | Endpoint | Deskripsi | Autentikasi | Peran Diizinkan | Status Verifikasi |
|---|---|---|---|---|---|
| `GET` | `/api/v1/admin/dashboard` | Metrik statistik utama dan status antrean | JWT | Admin | Terverifikasi |
| `GET` | `/api/v1/admin/bookings` | Daftar seluruh booking dengan filter lengkap | JWT | Admin | Terverifikasi |
| `PUT` | `/api/v1/admin/bookings/:id/assign` | Menugaskan atau mengganti teknisi | JWT | Admin | Terverifikasi |
| `PUT` | `/api/v1/admin/bookings/:id/price-override`| Penyesuaian biaya servis tambahan | JWT | Admin | Terverifikasi |
| `GET` | `/api/v1/admin/technicians` | Master teknisi, performa dan ketersediaan | JWT | Admin | Terverifikasi |
| `GET` | `/api/v1/admin/customers` | Master pelanggan dan segmentasi RFM | JWT | Admin | Terverifikasi |
| `GET` | `/api/v1/admin/reports` | Laporan pendapatan, volume, dan retensi | JWT | Admin | Terverifikasi |
| `GET` | `/api/v1/admin/audit-logs` | Jejak audit keamanan dan aktivitas admin | JWT | Admin | Terverifikasi |

---

## 7. Modul Pembayaran & Klaim Garansi (`/api/v1/payments` & `/api/v1/claims`)

| Metode | Endpoint | Deskripsi | Autentikasi | Peran Diizinkan | Status Verifikasi |
|---|---|---|---|---|---|
| `GET` | `/api/v1/payments/:booking_id` | Rincian invoice dan tagihan pembayaran | JWT | Pemilik, Admin | Terverifikasi |
| `POST` | `/api/v1/payments/:booking_id/upload-proof`| Mengunggah foto bukti transfer bank | JWT | Pemilik, Admin | Terverifikasi |
| `PUT` | `/api/v1/payments/:booking_id/verify` | Verifikasi mutasi dan terbitkan status LUNAS | JWT | Admin | Terverifikasi |
| `GET` | `/api/v1/claims` | Daftar pengajuan klaim garansi servis | JWT | Pelanggan, Admin | Terverifikasi |
| `POST` | `/api/v1/claims` | Mengajukan klaim garansi servis (maks 30 hari) | JWT | Pelanggan | Terverifikasi |
| `PUT` | `/api/v1/claims/:id/review` | Verifikasi klaim dan jadwal ulang kunjungan | JWT | Admin | Terverifikasi |

---

## 8. Modul WhatsApp & Integrasi AI (`/api/v1/whatsapp`)

| Metode | Endpoint | Deskripsi | Autentikasi | Peran Diizinkan | Status Verifikasi |
|---|---|---|---|---|---|
| `POST` | `/api/v1/whatsapp/webhook` | Menerima pesan masuk dari Fonnte/Wwebjs | Webhook Key | WhatsApp Provider | Terverifikasi |
| `POST` | `/api/v1/whatsapp/send-invoice` | Mengirim pesan invoice dan ringkasan tagihan | JWT | Admin, Internal | Terverifikasi |
| `POST` | `/api/v1/whatsapp/send-reminder`| Mengirim pengingat servis berkala (90 hari) | JWT | Admin, Cron | Terverifikasi |
| `GET` | `/api/v1/whatsapp/conversations`| Daftar log sesi obrolan pelanggan | JWT | Admin | Terverifikasi |

# 05. ANALISIS AKTOR & SPESIFIKASI USE CASE

**Kode Proyek:** `A26-CS054`  
**Entitas Usaha:** **CV. Nara Teknindotama**  

---

## 1. Identifikasi Aktor Sistem

Sistem NARA AC melibatkan empat kelompok aktor utama yang berinteraksi secara langsung maupun tidak langsung:

| Nama Aktor | Kategori Aktor | Deskripsi Peran & Tanggung Jawab | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **Pelanggan Publik / Member** | Aktor Manusia (Eksternal) | Pengguna jasa servis AC (residensial atau perwakilan korporat) yang melakukan pemesanan, pembayaran, pemantauan status, dan pengajuan klaim garansi. | Halaman publik, Portal Pelanggan (`/customer/*`), dan pelacakan status (`/status/:kode`). |
| **Teknisi Lapangan** | Aktor Manusia (Internal) | Personel teknis lapangan CV. Nara Teknindotama yang ditugaskan mengeksekusi pekerjaan servis, mengisi checklist diagnostik, dan mengambil foto bukti pengerjaan. | Konsol Lapangan Teknisi (`/technician/*`) dengan otentikasi role `technician`. |
| **Admin Operasional** | Aktor Manusia (Internal) | Pengelola operasional harian yang mengatur alokasi teknisi, memverifikasi bukti pembayaran transfer, menyetujui klaim garansi, dan mengelola katalog layanan. | Pusat Kontrol Administrasi (`/admin/*`) dengan otentikasi role `admin`. |
| **Sistem AI / WhatsApp** | Aktor Otomasi (Sistem) | Sub-sistem backend terjadwal dan microservice NLP yang mengotomatisasi pengingat servis harian, mengklasifikasikan pesan masuk, dan mengirim faktur. | Layanan latar belakang (*background workers*), webhook provider, dan cron jobs. |

---

## 2. Diagram Use Case
Diagram use case sistem tersimpan dalam berkas [02-use-case.mmd](./diagrams/02-use-case.mmd).

---

## 3. Spesifikasi Use Case Rinci

### 3.1 Use Case: Pembuatan Pemesanan Servis (`UC-02`)
- **ID Use Case:** `UC-02`
- **Nama Use Case:** Membuat Pemesanan Servis AC Mandiri
- **Aktor Utama:** Pelanggan Publik / Member
- **Aktor Pendukung:** Admin Operasional, Sistem Penjadwalan
- **Tujuan:** Mendaftarkan permintaan servis AC baru dengan rincian unit, alamat, waktu yang valid, dan metode pembayaran.
- **Pemicu:** Pelanggan mengakses antarmuka `/booking` dan mengisi formulir pemesanan.
- **Prasyarat:** Tersedia slot waktu yang belum penuh pada rentang jam operasional 08:00–19:00 WIB.
- **Alur Utama (Normal Flow):**
  1. Pelanggan memilih jenis layanan AC dan menentukan jumlah unit yang akan diservis.
  2. Sistem menghitung durasi estimasi (`durasi_katalog * jumlah_unit`).
  3. Pelanggan menginput alamat lengkap dan memilih tanggal servis yang diinginkan.
  4. Pelanggan memilih jam mulai servis dari daftar slot yang tersedia.
  5. Pelanggan memilih metode dan skema pembayaran (Bayar Penuh / DP 50%).
  6. Pelanggan menekan tombol "Konfirmasi Pemesanan".
  7. Backend memvalidasi data masukan secara otoritatif, menghitung total biaya, menerapkan diskon member 10% pada biaya jasa jika terdaftar, dan menyimpan rekaman ke tabel `bookings`.
  8. Sistem menerbitkan kode unik booking (format: `NARA-AC...`) dan faktur estimasi awal.
  9. Sistem mengarahkan browser ke halaman `/status/:kode`.
- **Alur Alternatif:**
  - *Pelanggan belum mengisi nomor kontak:* Sistem menampilkan pesan validasi wajib isi.
  - *Pelanggan memilih waktu mendekati jam 19:00:* Jika `jam_mulai + durasi > 19:00`, sistem menampilkan notifikasi galat `DURATION_EXCEEDS_CLOSING` dan meminta memilih jam lebih awal.
- **Alur Kegagalan (Exception Flow):**
  - *Slot waktu telah penuh terisi teknisi:* Backend merespon dengan status HTTP 409 Conflict; antarmuka menampilkan opsi jam alternatif.
- **Kondisi Akhir:** Pemesanan tersimpan di basis data dengan status `pending`, dan notifikasi muncul di dashboard admin.

---

### 3.2 Use Case: Pelaporan Lapangan & Penyelesaian Pekerjaan (`UC-14` s/d `UC-17`)
- **ID Use Case:** `UC-17`
- **Nama Use Case:** Penyelesaian Pekerjaan dan Pengiriman Laporan Lapangan
- **Aktor Utama:** Teknisi Lapangan
- **Aktor Pendukung:** Pelanggan, Basis Data
- **Tujuan:** Mendokumentasikan hasil pekerjaan servis AC dengan bukti fisik yang akuntabel guna menutup surat perintah kerja.
- **Pemicu:** Teknisi telah menyelesaikan pembersihan atau perbaikan unit di lokasi pelanggan.
- **Prasyarat:** Pekerjaan telah berstatus `in_progress` dan teknisi login pada gawai mobile.
- **Alur Utama:**
  1. Teknisi membuka konsol `/technician/jobs/:id`.
  2. Teknisi mengunggah foto kondisi fisik AC sebelum servis (foto sebelum).
  3. Teknisi menyelesaikan proses cuci/servis AC.
  4. Teknisi mencentang lembar checklist pemeriksaan diagnostik (filter, evaporator, tekanan refrigeran freon, dan arus ampere listrik).
  5. Teknisi mengunggah foto kondisi fisik AC setelah servis selesai (foto sesudah).
  6. Teknisi mencatat suku cadang yang diganti (jika ada) dan menulis catatan rekomendasi teknis.
  7. Teknisi menekan tombol "Kirim Laporan Pekerjaan".
  8. Backend memvalidasi kelengkapan berkas, memperbarui status booking menjadi `done`, dan mencatat riwayat ke `work_orders`.
  9. Sistem memperbarui status di halaman tracking pelanggan menjadi pekerjaan selesai.
- **Alur Alternatif:**
  - *Ada penggantian suku cadang:* Teknisi mencatat komponen dari daftar inventaris; sistem memeriksa apakah telah disetujui ganda oleh pelanggan dan admin.
- **Alur Kegagalan:**
  - *Foto bukti tidak diunggah atau checklist kosong:* Sistem menolak pengiriman laporan dengan pesan peringatan kelengkapan data.
- **Kondisi Akhir:** Laporan tersimpan lengkap, status pengerjaan ditandai selesai (`done`), dan masa waktu konfirmasi otomatis 48 jam dimulai.

---

### 3.3 Use Case: Verifikasi Pembayaran Transfer Bank (`UC-20`)
- **ID Use Case:** `UC-20`
- **Nama Use Case:** Audit dan Verifikasi Bukti Transfer Bank
- **Aktor Utama:** Admin Operasional
- **Aktor Pendukung:** Pelanggan
- **Tujuan:** Memvalidasi dana pembayaran yang ditransfer oleh pelanggan ke rekening resmi CV. Nara Teknindotama.
- **Pemicu:** Pelanggan mengunggah file bukti transfer bank pada halaman pelacakan status.
- **Prasyarat:** Terdapat transaksi dengan status pembayaran `unverified`.
- **Alur Utama:**
  1. Admin membuka menu `/admin/invoices` di dashboard operasional.
  2. Admin memfilter daftar faktur yang membutuhkan verifikasi (*Perlu Verifikasi*).
  3. Admin membuka pratinjau bukti transfer yang diunggah pelanggan.
  4. Admin mencocokkan nominal mutasi bank dengan nilai tagihan faktur.
  5. Admin menekan tombol "Verifikasi & Setujui Pembayaran".
  6. Backend memperbarui status pembayaran transaksi menjadi `paid` (Lunas).
  7. Lembar faktur resmi pelanggan diperbarui menampilkan cap digital lunas.
- **Alur Alternatif (Kurang Bayar / Lebih Bayar):**
  - *Nominal kurang dari tagihan:* Admin mencatat kekurangan bayar; status menjadi `kurang_bayar`.
  - *Nominal melebihi tagihan:* Admin mencatat kelebihan bayar; sistem memicu rekaman pengembalian dana (*refund*).
  - *Bukti transfer tidak valid/palsu:* Admin menolak pembayaran dan sistem mengirimkan pemberitahuan unggah ulang bukti yang benar.
- **Kondisi Akhir:** Status pembayaran tervalidasi dan tercatat dalam buku besar transaksi keuangan.

---

### 3.4 Use Case: Pengajuan & Pemeriksaan Klaim Garansi (`UC-09` & `UC-21`)
- **ID Use Case:** `UC-09`
- **Nama Use Case:** Pengajuan Klaim Garansi Servis
- **Aktor Utama:** Pelanggan
- **Aktor Pendukung:** Admin Operasional, Teknisi Lapangan
- **Tujuan:** Mendapatkan perbaikan ulang secara cuma-cuma atas kendala pendinginan yang berulang dalam masa jaminan garansi resmi.
- **Prasyarat:** Transaksi servis telah berstatus `done` dan terkonfirmasi; tanggal pengajuan masih dalam rentang masa garansi (14/30/45 hari); tidak ada klaim lain yang sedang aktif.
- **Alur Utama:**
  1. Pelanggan membuka menu riwayat servis atau halaman status pemesanan.
  2. Pelanggan menekan tombol "Ajukan Klaim Garansi".
  3. Sistem memeriksa apakah pelanggan telah memberikan ulasan awal; jika belum, pelanggan diarahkan mengisi rating ulasan terlebih dahulu.
  4. Pelanggan mengisi formulir deskripsi kerusakan teknis dan mengunggah foto bukti kendala.
  5. Pelanggan mengirimkan permohonan klaim.
  6. Backend membuat tiket klaim baru di tabel `warranty_claims` dengan status `pending`.
  7. Tiket klaim muncul pada menu `/admin/claims`.
  8. Admin mengevaluasi kelayakan klaim dan menyetujui kunjungan perbaikan ulang.
  9. Sistem menjadwalkan kunjungan inspeksi teknisi dengan tagihan Rp 0 (Gratis).
- **Alur Alternatif:**
  - *Klaim ditolak admin:* Admin mencantumkan alasan teknis penolakan (misalnya kendala akibat tegangan listrik PLN atau unit dibongkar pihak lain); sistem menawarkan opsi konversi menjadi servis reguler berbayar.
- **Kondisi Akhir:** Terbit surat perintah kerja inspeksi garansi bebas biaya atau tiket klaim ditutup dengan alasan terdokumentasi.

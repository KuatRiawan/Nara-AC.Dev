# NARA AC - Daftar Periksa Regresi Mobile UI/UX

Project: NARA AC - A26-CS054
Tanggal Pengujian: 8 November 2026
Metodologi: Multi-Viewport Inspection & Component Audit
Kepatuhan: UI/UX Pro Max & Anti-Slop Guide
Status: 100% Lolos Uji (PASS)

---

## 1. Matriks Pengujian Viewport

| ID Viewport | Kategori | Resolusi (Lebar x Tinggi) | Representasi Perangkat | Status |
|---|---|---|---|---|
| VP-SM | Small Mobile | 320 x 568 | iPhone SE (1st gen), Android Mini | [x] PASS |
| VP-MD | Standard Mobile | 375 x 812 | iPhone X / 11 / 12 mini / 13 mini | [x] PASS |
| VP-LG | Large Mobile | 430 x 932 | iPhone 14 / 15 / 16 Pro Max | [x] PASS |
| VP-TB | Tablet | 768 x 1024 | iPad Mini, iPad Air (Potret) | [x] PASS |
| VP-D1 | Desktop Compact | 1366 x 768 | Laptop Standar / HD Display | [x] PASS |
| VP-D2 | Desktop Standard | 1440 x 900 | MacBook Pro 14", Display WXGA+ | [x] PASS |
| VP-D3 | Desktop Large | 1920 x 1080 | Full HD Monitor, Desktop 24"-27" | [x] PASS |

---

## 2. Pengujian Rute Publik & Transaksional

### 2.1. Halaman Beranda / Landing Page (`/`)
- [x] PASS (320x568): Header tidak overflow; tombol "Cek Status" beralih ke teks ringkas "Lacak"; menu hamburger berfungsi lancar.
- [x] PASS (375x812): Hero Interactive Card beradaptasi tanpa clipping; teks rotasi hero terbaca jelas.
- [x] PASS (430x932): Sticky bottom booking dock nyaman digunakan dengan satu tangan; tidak menutupi konten penting.
- [x] PASS (768x1024): Grid katalog layanan tampil 2 kolom seimbang; FAQ accordion responsif.
- [x] PASS (1366x768): Navigasi desktop penuh tampil rapi; tidak ada layout drift.
- [x] PASS (1440x900): Jarak vertikal seimbang antara section; Client Marquee berjalan halus.
- [x] PASS (1920x1080): Kontainer terpusat pada max-w-7xl; visual tajam tanpa distorsi.
- [x] PASS (Footer): Hak cipta resmi `© 2026 CV. Nara Teknindotama. Seluruh hak cipta dilindungi.` tersemat dengan padding safe-area yang aman.

### 2.2. Halaman Booking Service (`/booking`)
- [x] PASS (320x568): Header bersama `PageHeader` terpasang; tombol "Kembali" ringkas dan terarah.
- [x] PASS (375x812): Langkah 1 (Katalog Layanan & Pilihan Unit) tombol radio/card mudah ditekan.
- [x] PASS (430x932): Langkah 2 (Alamat & Pemilih Lokasi) input peta dan teks alamat tidak keluar layar.
- [x] PASS (768x1024): Langkah 3 (Jadwal & Waktu Servis) pemilih tanggal kalender dan slot jam proporsional.
- [x] PASS (1366x768): Langkah 4 (Ringkasan & Konfirmasi) rincian biaya estimasi tampil transparan.
- [x] PASS (Aksi Tombol Multi-Langkah): Baris tombol aksi responsif (`flex flex-col-reverse sm:flex-row`), label "Konfirmasi & Buat Pesanan" tidak terpotong menjadi 3 baris.
- [x] PASS (Modal Invoice): Modal pratinjau cetak E-Invoice memiliki header rapi dan tombol cetak yang tidak meluap.

### 2.3. Halaman Pelacakan Status Booking (`/status` & `/status/:kode`)
- [x] PASS (320x568): Header mobile yang semula rusak (pada bukti screenshot) kini teratasi tuntas; CompanyLogo mengecil secara adaptif, tombol "Booking" ringkas, dan tombol "Kembali" berada tepat di dalam viewport tanpa clipping.
- [x] PASS (375x812): Input pencarian kode booking tampil dengan target sentuh ideal.
- [x] PASS (430x932): Kartu status tahapan pengerjaan (Timeline) tersusun vertikal teratur dengan konektor yang lurus.
- [x] PASS (768x1024): Informasi teknisi bertugas, foto bukti sebelum/sesudah servis tampil proporsional.
- [x] PASS (Modal E-Invoice): Judul modal "Pratinjau E-Invoice Resmi NARA AC" dengan tombol "Cetak PDF" dan tombol tutup (X) tidak berhimpitan pada layar 320px.
- [x] PASS (Zero Overflow): Tidak ada horizontal scrollbar liar di seluruh halaman.

### 2.4. Halaman Masuk Pelanggan (`/login`)
- [x] PASS (320x568): Header bersama terpasang; kartu formulir input langsung berada di urutan atas (`order-1 lg:order-2`), pengguna tidak perlu menggulir melewati teks promosi.
- [x] PASS (375x812): Input nomor WhatsApp / email dan kata sandi memiliki tinggi sentuh >= 44px.
- [x] PASS (Desktop): Kolom informasi branding di sebelah kiri dan formulir login di sebelah kanan tampil berdampingan secara elegan.

### 2.5. Halaman Pendaftaran Member (`/register`)
- [x] PASS (320x568): Kartu formulir registrasi berada di urutan atas pada mobile (`order-1 lg:order-2`).
- [x] PASS (375x812): Validasi form dan error alert tertata rapi di bawah masing-masing field.
- [x] PASS (Desktop): Kolom benefit keanggotaan tampil seimbang dengan formulir registrasi.

### 2.6. Halaman Portal Staf & Teknisi (`/staff/login`)
- [x] PASS (320x568): Header bersama terpasang; input kredensial teknisi/admin aman dari desakan.
- [x] PASS (375x812): Tombol masuk lebar penuh dengan feedback loading spinner saat otentikasi.

### 2.7. Halaman Ulasan & Evaluasi Kepuasan (`/feedback` & `/feedback/:kode`)
- [x] PASS (320x568): Header bersama terpasang; pemilih bintang rating (1-5) memiliki ruang sentuh nyaman.
- [x] PASS (375x812): Kotak input komentar ulasan dan upload foto pendukung tertata responsif.

### 2.8. Halaman Syarat Ketentuan & Kebijakan Privasi (`/terms-conditions` & `/privacy-policy`)
- [x] PASS (320x568): Header dan Footer bersama terpasang; teks klausul hukum membungkus alami tanpa pemutusan kata yang canggung.
- [x] PASS (Desktop): Sidebar navigasi klausul tampil di desktop dan menyatu di mobile.

### 2.9. Halaman Offline & 404 Not Found (`/offline` & `/*`)
- [x] PASS (320x568): Ikon ilustrasi, teks penjelasan, dan tombol navigasi kembali ke beranda tampil terpusat dan rapi.

---

## 3. Pengujian Portal Pelanggan (Customer Routes)

### 3.1. Customer Dashboard (`/customer/dashboard`)
- [x] PASS (320x568): Header mobile DashboardLayout bersih tanpa duplikasi nama logo (`iconOnly={true}`); kartu sambutan Member Nara AC rapi.
- [x] PASS (375x812): 3 Kartu metrik ringkasan (Total Servis, Unit AC, Garansi) memiliki padding proporsional.
- [x] PASS (430x932): Kartu Servis Aktif: Baris kode booking dan tombol "Salin Kode" membungkus adaptif tanpa saling dorong; tombol "Lihat E-Invoice" dan "Lacak Status Real-Time" tertata bertumpuk pada mobile dan berdampingan pada desktop.
- [x] PASS (768x1024): Tata letak 2 kolom grid tablet tampil proporsional.
- [x] PASS (Desktop): Dashboard layout lebar penuh dengan navigasi samping (sidebar) kokoh.

### 3.2. Customer Unit AC (`/customer/ac-units`)
- [x] PASS (320x568): Judul halaman dan tombol "Tambah Unit" bertumpuk rapi pada mobile (`flex-col sm:flex-row`).
- [x] PASS (375x812): Kartu unit AC menampilkan badge status jatuh tempo, detail PK, dan nomor seri dengan jelas.
- [x] PASS (Desktop): Grid multi-kolom unit AC tertata simetris.

### 3.3. Customer Riwayat Servis & Garansi (`/customer/history`)
- [x] PASS (320x568): Tombol aksi pada kartu riwayat ("Detail & E-Invoice", "Beri Ulasan", "Klaim Garansi") beradaptasi penuh ke lebar kontainer (`w-full sm:w-auto`).
- [x] PASS (375x812): Modal pengajuan klaim garansi nyaman diisi pada layar smartphone.
- [x] PASS (Desktop): Baris riwayat tersusun sejajar rapi.

### 3.4. Customer Profil Akun (`/customer/profile`)
- [x] PASS (320x568): Tab menu profil dan keamanan mudah digeser; tombol "Simpan Perubahan" berukuran lebar penuh pada mobile.
- [x] PASS (375x812): Input nomor WhatsApp terverifikasi dan form penggantian sandi memiliki pelindung visibilitas (show/hide password).

---

## 4. Pengujian Portal Teknisi Lapangan (Technician Routes)

### 4.1. Technician Dashboard (`/technician/dashboard`)
- [x] PASS (320x568): 4 Kartu KPI harian (Tugas Hari Ini, Mendatang, Sedang Proses, Selesai) memiliki padding `p-3 sm:p-5` sehingga angka statistik tidak saling bertumpuk di layar sempit.
- [x] PASS (375x812): Kartu pekerjaan harian (`renderJobCard`) menampilkan status badge, kode booking, jam kedatangan, dan tombol aksi "Mulai Kerja" / "Lanjutkan" dengan tata letak luwes.
- [x] PASS (Desktop): Grid 4 kolom KPI dan daftar tiket 2 kolom terorganisir optimal.

### 4.2. Technician Lembar Kerja & SOP (`/technician/jobs/:id`)
- [x] PASS (320x568): Stepper alur kerja 5 tahap menampilkan label singkat (`shortName`: "Persiapan", "Foto Awal", "SOP", "Foto Akhir", "Selesai") sehingga lingkaran tahapan dan teks tidak keluar dari grid 5 kolom.
- [x] PASS (375x812): Checklist SOP pengerjaan dengan tombol checkbox memiliki target sentuh besar untuk teknisi bersarung tangan.
- [x] PASS (430x932): Modul upload foto sebelum dan sesudah pengerjaan berfungsi responsif dari kamera ponsel.
- [x] PASS (Bilah Bawah Melayang): Floating action bar bawah memiliki padding safe-area `env(safe-area-inset-bottom, 0.75rem)` dan label responsif ("Selesaikan Order" di mobile, "Selesaikan Pekerjaan (Order Selesai)" di desktop) sehingga tidak mendesak tombol "Kembali".

---

## 5. Pengujian Portal Administrasi & Dispatcher (Admin Routes)

### 5.1. Admin Home & Operasional Harian (`/admin`)
- [x] PASS (320x568): 5 Kartu metrik operasional harian beradaptasi (kartu 1-4 dalam 2 kolom, kartu ke-5 omzet bernilai nominal rupiah memanjang penuh `col-span-2`), tidak ada nilai uang yang terpotong.
- [x] PASS (375x812): Dropdown pemilih visualisasi grafik analitik tidak meluap ke luar kontainer kartu.
- [x] PASS (Tampilan Ganda Operasi): Daftar tiket hari ini otomatis beralih ke Kartu Mobile (`block lg:hidden`) pada layar ponsel dan Tabel Lengkap (`hidden lg:table`) pada layar desktop.

### 5.2. Admin Manajemen Booking (`/admin/bookings`)
- [x] PASS (320x568): Filter status pemesanan (Semua, Jadwal, Proses, Selesai, Batal) dapat digulir horizontal dengan mulus.
- [x] PASS (Mobile Card View): Setiap booking disajikan dalam kartu mandiri dengan dropdown alokasi teknisi dan tombol aksi cepat.
- [x] PASS (Desktop Table View): Kolom tabel lengkap dengan sticky header dan pengurutan waktu.

### 5.3. Admin E-Invoice & Verifikasi Pembayaran (`/admin/invoices`)
- [x] PASS (320x568): Kartu tagihan mobile menampilkan rincian total biaya, badge lunas/pending, dan tombol aksi verifikasi transfer tanpa clipping.
- [x] PASS (Desktop Table View): Tampilan tabel komprehensif untuk pelaporan akuntansi dan ekspor data.

### 5.4. Admin Analisis & Data Science (`/admin/analytics`)
- [x] PASS (320x568): Seluruh grid metrik keuangan dan chart dimulai dari `grid-cols-1` pada mobile, bertumpuk vertikal dengan rapi.
- [x] PASS (Grafik Interaktif): Grafik Recharts (Area, Bar, Line) menggunakan `ResponsiveContainer width="100%"` dan menyesuaikan diri saat orientasi ponsel diputar (portrait ke landscape).

---

## 6. Verifikasi Build & Kualitas Kode

- **Vitest Unit & Integration Suite**: 11 berkas uji, 50 pengujian: **50 PASSED (100%)**.
- **Vite Production Build**: `npm run build` sukses dalam 1.36 detik tanpa error lint atau sintaks.
- **Konsistensi Hak Cipta**: Seluruh footer menyematkan `© 2026 CV. Nara Teknindotama. Seluruh hak cipta dilindungi.`.
- **Kepatuhan Anti-Slop**: Tidak ada penggunaan tanda em dash dalam salinan teks aplikasi.
- **Kepatuhan UI/UX Pro Max**: Tidak ada overflow tersembunyi dengan trik CSS murah; hierarki visual logis dan fungsional.

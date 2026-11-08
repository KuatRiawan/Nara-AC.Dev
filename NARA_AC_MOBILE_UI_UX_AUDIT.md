# NARA AC - Laporan Audit & Remediasi Mobile UI/UX

Project: NARA AC - A26-CS054
Tanggal: 8 November 2026
Status: Selesai & Terverifikasi (Build Clean, 50/50 Tests Passing)
Badan Usaha: CV. Nara Teknindotama (NIB: 2805250066735)

---

## 1. Ringkasan Eksekutif

Audit komprehensif mobile UI/UX dilakukan terhadap seluruh aplikasi NARA AC untuk mengatasi cacat tampilan antarmuka pada layar smartphone dan tablet. Berdasarkan bukti visual screenshot pada halaman pelacakan status (`StatusPage`), diidentifikasi serangkaian masalah sistemik:
- Header meluap (overflow) secara horizontal di layar kecil (320px - 375px) karena penggabungan logo besar, tombol booking, dan tombol kembali dengan label panjang dalam satu baris.
- Tombol aksi saling bertumpukan atau terpotong teksnya karena dipaksa sejajar dalam kontainer sempit.
- Footer halaman memakan ruang vertikal berlebih dengan padding masif (pb-28 hingga pb-36) dan duplikasi kode footer di setiap halaman.
- Redundansi teks logo di header mobile dashboard ("NARA TEKNINDOTAMA" berdampingan dengan badge "NARA AC").
- Urutan tata letak pada halaman otentikasi (Login/Register) menampilkan teks pemasaran di atas formulir input pada mobile sehingga pengguna harus menggulir jauh ke bawah.
- Stepper alur kerja teknisi (5 langkah) mengalami teks terpotong pada layar 320px.
- Kotak ringkasan statistik (KPI cards) di Admin Dashboard dan Teknisi Dashboard mengalami teks berhimpitan pada layar kurang dari 375px.

Remediasi dilakukan dengan pendekatan arsitektur sistem bersama (shared system architecture), bukan perbaikan parsial halaman per halaman. Seluruh perbaikan mengacu pada panduan **UI/UX Pro Max** dan **Anti-Slop**, tanpa menggunakan trik `overflow-x: hidden` untuk menyembunyikan elemen yang rusak.

---

## 2. Analisis Akar Masalah (Root Cause Analysis)

### 2.1. Header Width Inflation (StatusPage & Halaman Publik)
- **Gejala**: Tombol kembali keluar dari viewport kanan, tombol "Booking Baru" terdesak, dan NARA logo mendominasi lebar viewport.
- **Penyebab**:
  - Komponen `CompanyLogo` memiliki ukuran teks tetap yang besar (`text-3xl` / 180px+) bahkan pada layar ponsel 320px.
  - Tiga elemen (Logo, Tombol Booking, Tombol Kembali dengan label "Kembali ke Beranda") ditempatkan berdampingan dengan `justify-between` tanpa mekanisme `flex-shrink` adaptif dan tanpa prioritas teks responsif. Total kebutuhan lebar mencapai ~500px, melebihi lebar layar 320px dan 375px.
- **Solusi**:
  - Merancang komponen `frontend/src/components/layout/PageHeader.jsx` terpadu dengan prop `compact`, responsif terhadap breakpoint.
  - Memperbarui `CompanyLogo.jsx` dengan tipografi responsif (`text-xl sm:text-2xl lg:text-3xl`, subtitle `text-[9px] sm:text-xs tracking-[0.2em] sm:tracking-[0.25em]`).
  - Mengintegrasikan hook `useContextualBack` yang menyajikan label "Kembali" ringkas pada mobile dan label deskriptif pada desktop.
  - Mengubah label tombol booking menjadi "Booking" pada viewport <= 375px dan "Booking Baru" pada viewport > 375px.

### 2.2. Redundansi Header Dashboard Mobile (DashboardLayout)
- **Gejala**: Header mobile pada rute Admin, Customer, dan Technician terasa sangat sesak dengan teks ganda.
- **Penyebab**:
  - `CompanyLogo` menampilkan ikon kipas dan teks "NARA TEKNINDOTAMA", sementara kontainer di sampingnya juga menampilkan teks "NARA AC" beserta peran pengguna (Admin / Pelanggan / Teknisi).
- **Solusi**:
  - Menambahkan dukungan prop `iconOnly={true}` pada `CompanyLogo.jsx`.
  - Mengaktifkan `iconOnly={true}` di header mobile `DashboardLayout.jsx`, menghemat lebih dari 120px ruang horizontal tanpa mengurangi identitas merek.

### 2.3. Desakan Tombol Aksi Formulir Multi-Langkah (BookingPage)
- **Gejala**: Pada Formulir Booking Langkah 2, 3, dan 4, tombol "Kembali" dan "Lanjut / Konfirmasi" dipaksa sejajar (`flex-1`) sehingga teks panjang "Konfirmasi & Buat Pesanan" terpotong menjadi 3 baris sempit.
- **Penyebab**: Tata letak tombol aksi horizontal kaku tanpa fleksibilitas tumpukan (`flex-col-reverse sm:flex-row`).
- **Solusi**:
  - Mengubah baris aksi menjadi responsif: bertumpuk vertikal dengan urutan alami (`flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3`), di mana tombol sekunder ("Kembali") berada di bawah tombol primer ("Lanjut"), masing-masing memiliki lebar penuh pada mobile dan otomatis kembali sejajar pada layar desktop.

### 2.4. Urutan Visual Halaman Otentikasi (LoginPage & RegisterPage)
- **Gejala**: Pengguna mobile harus menggulir melewati teks promosi dan legalitas sebelum dapat melihat kotak input login/registrasi.
- **Penyebab**: Kolom teks pemasaran berada di urutan DOM pertama sebelum kartu formulir input.
- **Solusi**:
  - Menerapkan utilitas urutan CSS (`order-1 lg:order-2` pada kartu input dan `order-2 lg:order-1` pada kolom informasi). Formulir input langsung tampak pada saat halaman pertama kali dimuat di layar ponsel.

### 2.5. Pemborosan Ruang Vertikal Footer & Inkonsistensi Rute Legal
- **Gejala**: Footer halaman memakan ruang vertikal 7rem hingga 9rem pada mobile (`pb-28 sm:pb-36`), tautan legal mengarah ke rute 404 (`/terms` dan `/privacy`), dan markup footer diduplikasi di setiap halaman.
- **Penyebab**: Tidak adanya komponen footer terpusat yang menerapkan hak cipta resmi dan aman terhadap safe-area insets.
- **Solusi**:
  - Membuat `frontend/src/components/layout/Footer.jsx` tunggal dengan 4 varian: `default`, `landing`, `minimal`, dan `dashboard`.
  - Memastikan hak cipta resmi selalu konsisten: `© 2026 CV. Nara Teknindotama. Seluruh hak cipta dilindungi.`
  - Mengarahkan tautan legal ke rute yang valid: `/terms-conditions` dan `/privacy-policy`.
  - Menggunakan safe-area inset dinamis: `style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}` untuk menghindari benturan dengan dock sticky booking.

### 2.6. Stepper SOP Teknisi & Tombol Selesaikan Pekerjaan (TechnicianJobDetail)
- **Gejala**: Stepper alur kerja 5 tahap diatur dalam `grid grid-cols-5` tetap sehingga nama tahap seperti "Pengerjaan & SOP" terpotong. Tombol aksi melayang di bagian bawah dengan label "Selesaikan Pekerjaan (Order Selesai)" berdesakan dengan tombol "Kembali".
- **Penyebab**: Label teks tidak memiliki versi ringkas untuk mobile kecil.
- **Solusi**:
  - Menambahkan properti `shortName` pada setiap langkah (misal: "SOP", "Foto Awal", "Foto Akhir").
  - Menampilkan `shortName` pada layar < 640px dan nama lengkap pada layar >= 640px.
  - Memperbarui tombol bawah dengan label responsif: "Selesaikan Order" pada mobile dan "Selesaikan Pekerjaan (Order Selesai)" pada desktop, serta menyertakan `env(safe-area-inset-bottom, 0.75rem)`.

### 2.7. Kartu Statistik & Tata Letak Tabel Admin & Customer (AdminHome, CustomerDashboard, CustomerHistory)
- **Gejala**:
  - Kartu KPI dengan padding `p-5` dan ikon `w-10 h-10` menyebabkan angka dan teks berhimpitan pada viewport 320px.
  - Baris penyalinan kode booking di Customer Dashboard meluap karena kode panjang dan tombol "Salin Kode" berebut ruang.
- **Solusi**:
  - Menyesuaikan padding kartu statistik menjadi `p-3.5 sm:p-5` dan ikon menjadi `w-8 h-8 sm:w-10 sm:h-10`.
  - Mengubah tata letak kode booking di Customer Dashboard menjadi `flex-wrap sm:flex-nowrap` dengan pembatasan lebar kode responsif (`max-w-[120px] xs:max-w-[150px] sm:max-w-xs`).
  - Memastikan tombol aksi di Riwayat Servis Customer bertumpuk secara rapi pada mobile (`flex flex-col sm:flex-row lg:flex-col`).

---

## 3. Komponen Baru & Arsitektur Bersama

| Komponen | Jalur Berkas | Tujuan |
|---|---|---|
| `PageHeader` | `frontend/src/components/layout/PageHeader.jsx` | Header bersama responsif untuk rute publik/transaksional (Status, Booking, Login, Register, Feedback, Legal). Mendukung logo adaptif, tombol booking ringkas, dan navigasi kontekstual. |
| `Footer` | `frontend/src/components/layout/Footer.jsx` | Komponen footer bersama terstandarisasi. Mencegah duplikasi markup, menyematkan teks hak cipta resmi, rute legal benar, dan padding safe-area. |
| `useContextualBack` | `frontend/src/hooks/useContextualBack.js` | Logika navigasi kembali kontekstual yang aman dari riwayat browser kosong dan mempertahankan parameter filter/status. |
| `CompanyLogo` (Refactor) | `frontend/src/components/CompanyLogo.jsx` | Ditambahkan prop `compact` dan `iconOnly`, serta skala tipografi fluida dari 320px hingga desktop 4K. |
| `DashboardLayout` (Refactor) | `frontend/src/components/layout/DashboardLayout.jsx` | Header mobile yang bersih dan hemat ruang dengan `iconOnly={true}` dan integrasi shared `Footer`. |

---

## 4. Rute yang Direfaktor & Diverifikasi

1. **Rute Status Pelacakan (`/status`, `/status/:kode`)**:
   - Terpasang `PageHeader` dan `Footer` bersama.
   - Header modal cetak E-Invoice disesuaikan agar tidak meluap pada 320px.
2. **Rute Pemesanan Servis (`/booking`)**:
   - Terpasang `PageHeader` dan `Footer` bersama.
   - Tombol navigasi multi-langkah (Langkah 1 - 4) responsif dengan urutan `flex-col-reverse sm:flex-row`.
3. **Rute Otentikasi (`/login`, `/register`, `/staff/login`)**:
   - Terpasang `PageHeader` dan `Footer` bersama.
   - Kartu formulir diubah urutannya menjadi `order-1 lg:order-2` agar langsung terlihat di mobile.
4. **Rute Legalitas (`/terms-conditions`, `/privacy-policy`)**:
   - Terpasang `PageHeader` dan `Footer` bersama.
5. **Rute Pelengkap (`/feedback`, `/feedback/:kode`, `/offline`, `/*`)**:
   - Terpasang `PageHeader` dan `Footer` bersama.
6. **Rute Beranda Landing (`/`)**:
   - Header publik terverifikasi tidak overflow.
   - Directory informasi bisnis dipertahankan dalam `<section>`, diikuti `<Footer variant="landing" />`.
   - `StickyBottomBooking` dan `MobileNav` diselaraskan dengan safe-area insets.
7. **Rute Portal Teknisi (`/technician/dashboard`, `/technician/jobs/:id`, dll.)**:
   - Stepper alur kerja 5 langkah responsif dengan `shortName`.
   - Tombol melayang bagian bawah responsif terhadap viewport 320px dan home bar iPhone.
   - Kartu pekerjaan (`renderJobCard`) dan kartu KPI disesuaikan padding-nya.
8. **Rute Portal Admin (`/admin`, `/admin/bookings`, `/admin/invoices`, `/admin/analytics`, dll.)**:
   - Kartu statistik 5 metrik beradaptasi secara dinamis (2 kolom mobile, kartu ke-5 `col-span-2`, 5 kolom desktop).
   - Tampilan ganda mobile cards (`block lg:hidden`) dan desktop table (`hidden lg:table`) terverifikasi aktif.
9. **Rute Portal Pelanggan (`/customer/dashboard`, `/customer/ac-units`, `/customer/history`, `/customer/profile`)**:
   - Salin kode booking dan tombol aksi beradaptasi pada 320px.
   - Tombol simpan profil dan ganti password dibuat lebar penuh pada mobile.

---

## 5. Kepatuhan Desain & Aksesibilitas (A11y)

- **Target Sentuh (Touch Targets)**: Seluruh tombol interaktif, tautan navigasi, dan ikon penutup memiliki target sentuh minimal 44 x 44px atau padding pelindung.
- **Kontras Warna**: Sesuai dengan token WCAG AA dalam `DESIGN.md` (latar putih dengan teks `slate-800`/`slate-900`, aksen primer `blue-600` dengan rasio kontras >= 4.5:1).
- **Safe Area Insets**: Seluruh bilah tetap (sticky header, dock booking, floating action bar) menggunakan `env(safe-area-inset-bottom)` dan `env(safe-area-inset-top)`.
- **Zero Accidental Overflow**: Tidak ada elemen yang memicu horizontal scrollbar pada 320px. Tidak menggunakan `overflow-x: hidden` pada kontainer konten untuk menutup layout yang rusak.
- **Anti-Slop Compliance**:
  - Bebas dari tanda em dash pada seluruh UI copy dan laporan.
  - Bebas dari metrik fiktif, efek kilau buatan, atau elemen dekoratif yang tidak fungsional.
  - Hak cipta resmi selalu menyertakan teks: `© 2026 CV. Nara Teknindotama. Seluruh hak cipta dilindungi.`

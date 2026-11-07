# Kamus Data (Data Dictionary) - Operasional Servis AC
## Studi Kasus: CV Nara Teknindotama (ID Tim: A26-CS054)
**Penyusun:** Rosi Saidah & Komang Duta Cahya Yudistira (Data Science Specialist)  
**Status:** Data Sintetis Terkontrol (Tahap Validasi Pra-Wawancara PIC)  
**Target Pemodelan:**
1. **Target 1 (Booking Phase):** Estimasi Total Biaya Servis (`total_biaya` dalam IDR)
2. **Target 2 (Post-Service Phase):** Siklus Servis Berkala / Predictive Maintenance (`siklus_servis_hari`)

---

### 1. Struktur Entitas Data

| No | Nama Kolom | Tipe Data | Kategori | Deskripsi | Rentang / Nilai Valid |
|:---|:---|:---|:---|:---|:---|
| 1 | `order_id` | String | Identifier | ID transaksi servis | Format: `ORD-YYYYMMDD-XXXX` |
| 2 | `tanggal_order` | Date | Temporal | Tanggal pemesanan dibuat | YYYY-MM-DD |
| 3 | `customer_id` | String | Identifier | ID unik pelanggan | Format: `CUST-XXXX` |
| 4 | `tipe_customer` | Categorical | Fitur ML 1 & 2 | Kategori profil pelanggan | `Rumah Tangga`, `Bisnis/Kantor` |
| 5 | `tipe_ac` | Categorical | Fitur ML 1 & 2 | Jenis unit pendingin udara | `Split Standard`, `Split Inverter`, `Cassette`, `Standing Floor` |
| 6 | `kapasitas_pk` | Float | Fitur ML 1 & 2 | Kapasitas daya pendinginan (PK) | `0.5`, `0.75`, `1.0`, `1.5`, `2.0` |
| 7 | `usia_ac_tahun` | Integer | Fitur ML 1 & 2 | Estimasi usia pakai unit AC | `1` s.d. `15` tahun |
| 8 | `keluhan_utama` | Categorical | Fitur ML 1 | Gejala keluhan awal pelanggan | `Cuci Rutin / Berdebu`, `AC Kurang Dingin`, `Bocor Air / Menetes`, `Suara Berisik / Bau`, `AC Mati Total / Error` |
| 9 | `jenis_layanan` | Categorical | Fitur ML 2 | Tindakan servis yang dikerjakan | `Cuci Standar`, `Cuci Besar (Overhaul) & Pelumasan`, `Tambah/Isi Freon & Cuci`, `Perbaikan Bocor & Pipa`, `Ganti Kapasitor/Kelistrikan & Modul` |
| 10 | `teknisi_id` | String | Identifier | ID teknisi lapangan | `TEK-01` s.d. `TEK-05` |
| 11 | `penggantian_sparepart`| Boolean | Fitur ML 2 | Indikasi pergantian komponen | `0` (Tidak), `1` (Ya) |
| 12 | `freon_ditambahkan` | Boolean | Fitur ML 2 | Indikasi pengisian freon | `0` (Tidak), `1` (Ya) |
| 13 | `durasi_menit` | Integer | Metadata | Total durasi servis di lokasi | `35` s.d. `240` menit |
| 14 | `total_biaya` | Integer | Target ML 1 | Total biaya servis riil (IDR) | Rp 75.000 s.d. Rp 850.000 |
| 15 | `status_pekerjaan` | Categorical | Metadata | Status tiket pengerjaan | `Done`, `Scheduled`, `On Process`, `Cancelled` |
| 16 | `rating_feedback` | Integer | Evaluasi | Rating kepuasan pelanggan | `1` s.d. `5` (-1 jika belum selesai) |
| 17 | `siklus_servis_hari` | Integer | Target ML 2 | Rekomendasi interval servis rutin | `45` s.d. `160` hari |
| 18 | `tanggal_rekomendasi_servis` | Date | Output Reminder | Tanggal pengingat servis berikutnya | `tanggal_order + siklus_servis_hari` |
| 19 | `kategori_siklus_servis` | Categorical | Fitur Dasbor | Tingkat beban servis berkala | `Tinggi (<70 hari)`, `Standar (70-100 hari)`, `Rendah (>100 hari)` |

---

### 2. Penjelasan Aturan Anti-Leakage pada Kedua Model

1. **Model Estimasi Biaya (Dipanggil saat Booking dibuat):**
   - Menggunakan: `tipe_customer`, `tipe_ac`, `kapasitas_pk`, `usia_ac_tahun`, `keluhan_utama`.
   - Melarang: `jenis_layanan`, `penggantian_sparepart`, `freon_ditambahkan`, `durasi_menit` (karena data tersebut belum terjadi saat booking).

2. **Model Predictive Maintenance (Dipanggil saat Servis Selesai / Status = Done):**
   - Menggunakan: `tipe_customer`, `tipe_ac`, `kapasitas_pk`, `usia_ac_tahun`, `jenis_layanan`, `freon_ditambahkan`, `penggantian_sparepart`.
   - Menghasilkan: Estimasi hari ke servis berikutnya (`siklus_servis_hari`) yang digunakan untuk menjadwalkan notifikasi WhatsApp/In-app reminder secara otomatis kepada pelanggan.

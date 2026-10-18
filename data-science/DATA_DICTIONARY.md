# 📖 Kamus Data (Data Dictionary) — NARA AC Data Science

Dokumen ini memuat spesifikasi teknis, tipe data, deskripsi, dan tata kelola privasi untuk 4 dataset operasional utama CV. Nara Teknindotama yang digunakan dalam pipeline pemrosesan data, peramalan permintaan (*demand forecasting*), segmentasi pelanggan RFM, serta dashboard analitik.

---

## 1. Dataset Transaksi Servis AC (`dataset_transaksi_servis_ac.csv`)
- **Deskripsi:** Catatan transaksi servis harian per unit AC dari pelanggan ritel/residensial maupun komersial.
- **Jumlah Baris:** 545 transaksi
- **Cakupan Periode:** 05 Mei 2025 s/d 13 Oktober 2026

| Nama Kolom | Tipe Data | Nullable | Contoh Nilai | Deskripsi & Aturan Bisnis |
| :--- | :--- | :---: | :--- | :--- |
| `id_transaksi` | String (PK) | Tidak | `TRX-202505-001` | Pengenal unik transaksi dengan format `TRX-YYYYMM-NNN`. |
| `tanggal` | Date (`YYYY-MM-DD`) | Tidak | `2025-05-05` | Tanggal riil pengerjaan servis oleh teknisi di lokasi pelanggan. |
| `id_pelanggan` | String (FK) | Tidak | `CUST-0042` | Relasi ke entitas pelanggan di `dataset_pelanggan_rfm.csv`. |
| `nama_pelanggan_standar` | String (PII) | Tidak | `Budi Santoso` | Nama pelanggan terstandardisasi (Ditokenisasi di versi `governed`). |
| `kategori_layanan` | String | Tidak | `Cuci AC Rutin` | Jenis paket servis: `Cuci AC Rutin`, `Perbaikan Bocor`, `Isi Freon`, `Bongkar Pasang`. |
| `qty_unit` | Integer | Tidak | `1`, `2`, `4` | Jumlah unit pendingin ruangan (indoor/outdoor) yang ditangani. |
| `biaya_jasa` | Integer (IDR) | Tidak | `75000` | Komponen biaya tenaga kerja teknisi sesuai katalog resmi. |
| `biaya_sparepart` | Integer (IDR) | Tidak | `0`, `150000` | Biaya komponen pengganti (kapasitor, pipa, freon R32/R410A). |
| `total_tagihan_kotor` | Integer (IDR) | Tidak | `75000` | Total biaya sebelum potongan diskon (`biaya_jasa + biaya_sparepart`). |
| `diskon` | Integer (IDR) | Ya | `0`, `15000` | Nilai potongan promosi atau voucher loyalitas member. |
| `pendapatan_bersih` | Integer (IDR) | Tidak | `75000` | Pendapatan bersih riil NARA AC (`total_tagihan_kotor - diskon`). |
| `metode_pembayaran` | String | Tidak | `QRIS`, `Transfer Bank`, `Tunai` | Kanal pembayaran yang digunakan oleh pelanggan di lapangan. |
| `status_pembayaran` | String | Tidak | `Lunas`, `Pending` | Status penyelesaian finansial transaksi. |
| `rating_kepuasan` | Float | Ya | `4.8`, `5.0` | Nilai kepuasan pelanggan skala 1.0 – 5.0 pasca-pengerjaan. |
| `ada_komplain_garansi` | Integer (Binary)| Tidak | `0`, `1` | Indikator apakah servis ini memicu klaim garansi 30 hari. |
| `flag_koreksi_tanggal` | Integer (Binary)| Tidak | `0`, `1` | Penanda koreksi tanggal dari data mentah pencatatan manual. |
| `catatan_teknisi` | String | Ya | `Unit AC Daikin 1 PK indoor kotor` | Catatan teknis diagnosa lapangan teknisi. |

---

## 2. Dataset Deret Waktu Harian (`dataset_timeseries_harian.csv`)
- **Deskripsi:** Agregasi harian aktivitas operasional servis AC untuk pelatihan model peramalan deret waktu (*time-series forecasting*).
- **Jumlah Baris:** 527 hari
- **Cakupan Periode:** 05 Mei 2025 s/d 13 Oktober 2026 (Tanpa jeda tanggal)

| Nama Kolom | Tipe Data | Nullable | Contoh Nilai | Deskripsi & Formula Rekayasa Fitur |
| :--- | :--- | :---: | :--- | :--- |
| `tanggal` | Date (`YYYY-MM-DD`) | Tidak | `2025-05-05` | Kunci tanggal pengamatan deret waktu. |
| `hari_dalam_minggu` | Integer | Tidak | `0` (Senin) s/d `6` (Minggu) | Indeks hari untuk memodelkan siklus mingguan (*weekly seasonality*). |
| `is_weekend` | Integer (Binary)| Tidak | `0`, `1` | Flag akhir pekan (`1` jika Sabtu atau Minggu, `0` jika hari kerja). |
| `periode_bulan` | String | Tidak | `2025-05` | Periode bulan kalender format `YYYY-MM`. |
| `jumlah_order_reguler` | Integer (Target)| Tidak | `2`, `5` | **Target Utama**: Total order pemesanan servis reguler yang masuk. |
| `total_unit_ac_reguler`| Integer | Tidak | `3`, `7` | Akumulasi unit AC yang dicuci/diperbaiki pada hari tersebut. |
| `pendapatan_kotor_reguler`| Integer (IDR) | Tidak | `350000` | Akumulasi omzet tagihan kotor harian. |
| `pendapatan_bersih_reguler`| Integer (IDR) | Tidak | `335000` | Akumulasi pendapatan bersih riil setelah potongan. |
| `order_lag_1_hari` | Float | Tidak | `2.0` | Fitur autoregresif: jumlah order pada 1 hari sebelumnya ($t-1$). |
| `order_lag_7_hari` | Float | Tidak | `3.0` | Fitur autoregresif: jumlah order pada hari yang sama minggu lalu ($t-7$). |
| `is_peak_season` | Integer (Binary)| Tidak | `0`, `1` | Flag musim puncak kemarau (suhu tinggi mendorong servis AC). |
| `suhu_rata_rata_celsius` | Float | Tidak | `31.5` | Suhu udara rata-rata harian wilayah DIY (Stasiun BMKG Mlati). |
| `curah_hujan_mm` | Float | Tidak | `0.0`, `14.2` | Curah hujan harian (hujan lebat dapat menurunkan mobilitas teknisi). |

---

## 3. Dataset Profil & Segmentasi Pelanggan RFM (`dataset_pelanggan_rfm.csv`)
- **Deskripsi:** Ringkasan perilaku transaksi, retensi, dan nilai ekonomi dari seluruh pelanggan unik NARA AC.
- **Jumlah Baris:** 251 pelanggan unik
- **Struktur Segmen:** 53 Member Resmi, 198 Non-Member; 20 Korporat/B2B, 231 Residensial

| Nama Kolom | Tipe Data | Nullable | Contoh Nilai | Deskripsi & Definisi Bisnis |
| :--- | :--- | :---: | :--- | :--- |
| `id_pelanggan` | String (PK) | Tidak | `CUST-0001` | Pengenal unik pelanggan NARA AC. |
| `nama_pelanggan_standar`| String (PII)| Tidak | `Ibu Ratna Dewi` | Nama pelanggan (Di-hash SHA-256 pada dataset `governed`). |
| `kontak` | String (PII)| Ya | `081234567890` | Nomor WhatsApp kontak (Di-hash pada dataset `governed`). |
| `alamat_rumah` | String (PII)| Ya | `Jl. Kaliurang KM 7` | Alamat lokasi pengerjaan (Di-hash pada dataset `governed`). |
| `segmen_pelanggan` | String | Tidak | `Perorangan / Residensial` | Klasifikasi entitas: `Perorangan / Residensial` atau `Korporat / Instansi`. |
| `terdaftar_di_member` | Integer (Binary)| Tidak | `1`, `0` | Status keikutsertaan program membership NARA AC. |
| `tanggal_order_pertama` | Date | Ya | `2025-05-10` | Tanggal transaksi perdana pelanggan di NARA AC. |
| `tanggal_order_terakhir` | Date | Ya | `2026-09-20` | Tanggal order terbaru pelanggan. |
| `recency_hari` | Integer | Ya | `23` | Selisih hari sejak order terakhir terhadap tanggal batas data (*Recency*). |
| `frequency_total_order`| Integer | Tidak | `4` | Akumulasi frekuensi order yang pernah diselesaikan (*Frequency*). |
| `total_unit_dilayani` | Integer | Tidak | `6` | Total unit AC milik pelanggan yang ditangani teknisi. |
| `monetary_total_bersih`| Integer (IDR) | Tidak | `450000` | Akumulasi total nilai transaksi bersih (*Monetary*). |
| `rata_rata_jeda_order_hari`| Float | Ya | `85.5` | Rata-rata interval waktu antar-pemesanan rutin (hari). |
| `skor_r` | Integer (1–5) | Ya | `5` | Skor kuantil Recency (5 = baru saja order, 1 = paling lama tidak order). |
| `skor_f` | Integer (1–5) | Tidak | `4` | Skor kuantil Frequency (5 = sangat sering, 1 = jarang order). |
| `skor_m` | Integer (1–5) | Tidak | `4` | Skor kuantil Monetary (5 = nilai transaksi tinggi, 1 = rendah). |
| `segmen_retensi_rfm` | String | Tidak | `Champions`, `Loyal`, `At Risk`, `Lost` | Label klaster hasil kombinasi skor RFM untuk strategi pemasaran. |
| `jumlah_komplain_garansi`| Integer | Tidak | `0`, `1` | Riwayat jumlah klaim garansi pasca-servis oleh pelanggan. |

---

## 4. Dataset Kontrak Proyek Pemeliharaan B2B (`dataset_proyek_b2b_resik.csv`)
- **Deskripsi:** Buku catatan proyek pemeliharaan AC skala komersial, gedung perkantoran, dan instansi.
- **Jumlah Baris:** 79 proyek
- **Cakupan Periode:** Juli 2025 s/d Oktober 2026

| Nama Kolom | Tipe Data | Nullable | Contoh Nilai | Deskripsi & Rekonsiliasi Finansial |
| :--- | :--- | :---: | :--- | :--- |
| `id_proyek` | String (PK) | Tidak | `PRJ-B2B-2025-01` | Kode kontrak kerja sama pemeliharaan gedung. |
| `periode_bulan` | String | Tidak | `2025-07` | Periode pelaksanaan pemeliharaan AC gedung format `YYYY-MM`. |
| `nama_proyek` | String | Tidak | `Maintenance AC Rektorat UGM` | Nama instansi klien atau gedung komersial mitra. |
| `kategori_proyek` | String | Tidak | `Pendidikan`, `Komersial`, `Hotel` | Sektor industri klien B2B. |
| `lokasi_gedung` | String | Tidak | `Sleman`, `Kota Yogyakarta` | Wilayah penugasan tim teknisi spesialis B2B. |
| `jumlah_unit_ac` | Integer | Tidak | `15`, `30` | Jumlah unit AC sentral/split yang dicakup dalam SPK kontrak. |
| `nilai_proyek` | Integer (IDR) | Tidak | `5000000` | Nilai kontrak bruto yang disepakati (*Gross Project Value*). |
| `biaya_proyek` | Integer (IDR) | Tidak | `3200000` | Total biaya operasional teknisi, material, dan transportasi. |
| `fee_marketing` | Integer (IDR) | Tidak | `250000` | Alokasi komisi atau biaya perolehan proyek (*Acquisition Cost*). |
| `profit_tercatat_excel` | Integer (IDR) | Tidak | `1550000` | Profit yang dicatat pada pembukuan Excel manual UMKM. |
| `profit_bersih_terkoreksi`| Integer (IDR) | Tidak | `1550000` | Profit riil setelah verifikasi formula matematis (`nilai - biaya - fee`). |
| `selisih_koreksi_profit`| Integer (IDR) | Tidak | `0`, `-50000` | Selisih rekonsiliasi audit data science terhadap catatan manual. |
| `status_proyek` | String | Tidak | `Selesai`, `On Progress` | Status eksekusi pekerjaan fisik pemeliharaan. |
| `tanggal_mulai` | Date | Tidak | `2025-07-01` | Tanggal mulainya pekerjaan di lokasi gedung. |
| `tanggal_selesai` | Date | Ya | `2025-07-05` | Tanggal serah terima berita acara pengerjaan (BAST). |

---

## 🔒 5. Tata Kelola Privasi Data (*Data Governance & Anonymization*)

Untuk mematuhi prinsip perlindungan data pribadi (UU PDP):
- Seluruh kolom yang memuat data pengenal individu (*Personally Identifiable Information / PII*) seperti `kontak`, `alamat_rumah`, dan `nama_pelanggan_standar` telah ditransformasikan ke dalam format hash anonim ber-garam (*salted SHA-256 token*) pada folder `data/governed/`.
- Format token yang dihasilkan:
  - Nomor Telepon $\rightarrow$ `PHONE-XXXXXXXXXXXX`
  - Alamat Fisik $\rightarrow$ `ADDR-XXXXXXXXXXXX`
  - Nama Pelanggan $\rightarrow$ `CUSTNAME-XXXXXXXXXXXX`
- Data yang ditransformasikan ini aman digunakan untuk pengolahan publik, evaluasi tim, dan integrasi antarmuka tanpa mengekspos identitas pribadi pelanggan NARA AC.

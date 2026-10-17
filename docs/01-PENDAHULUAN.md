# 01. PENDAHULUAN & GAMBARAN UMUM SISTEM

**Nama Proyek:** Sistem Pengelolaan Jadwal dan Pengingat Service AC  
**Kode Proyek:** `A26-CS054`  
**Entitas Hukum:** **CV. Nara Teknindotama**  

---

## 1. Identitas Proyek & Profil Perusahaan
Sistem Informasi Operasional NARA AC dikembangkan sebagai platform digital resmi milik **CV. Nara Teknindotama**, sebuah badan usaha penyedia jasa perawatan, perbaikan, instalasi, dan rekayasa pendingin udara (HVAC - *Heating, Ventilation, and Air Conditioning*) yang berbasis di wilayah Jabodetabek.

| Atribut Perusahaan | Keterangan Resmi |
| :--- | :--- |
| **Nama Badan Usaha** | CV. Nara Teknindotama |
| **Nomor Induk Berusaha (NIB)** | `2805250066735` |
| **Pengesahan Kemenkumham (AHU)**| `AHU-0045403-AH.01.14 Tahun 2025` |
| **Nomor Pokok Wajib Pajak (NPWP)**| `10.000.000.0-258.288` |
| **Alamat Kantor Resmi** | Jalan Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor, Jawa Barat |
| **Layanan Pelanggan Resmi** | `0813-8529-3137` · `narateknindotama@gmail.com` |
| **Situs Web Resmi** | `www.narateknindotama.com` |

---

## 2. Latar Belakang
Pemeliharaan pendingin udara di daerah perkotaan tropis dengan tingkat kelembapan dan polusi tinggi seperti Jabodetabek merupakan kebutuhan esensial, baik untuk hunian tapak/apartemen (*residensial*) maupun perkantoran dan fasilitas komersial (*B2B / instansi*). Penumpukan debu, lendir pada evaporator, penurunan tekanan refrigeran (*freon*), dan keausan kapasitor tidak hanya menurunkan efisiensi pendinginan hingga lebih dari 30%, namun juga melipatgandakan konsumsi daya listrik serta mempercepat kerusakan unit kompresor.

Meskipun demikian, mayoritas bisnis jasa servis AC konvensional menghadapi kelemahan operasional sistemik:
1. **Siklus Pemeliharaan yang Terlupakan:** Pelanggan umumnya baru menghubungi teknisi saat AC mengalami kerusakan fatal (tidak dingin, bocor air, atau korsleting listrik). Tidak adanya sistem pencatatan siklus servis berkala (biasanya 60–90 hari) menyebabkan kerusakan fatal dan hilangnya peluang pendapatan berulang (*recurring revenue*) bagi penyedia jasa.
2. **Friksi dan Benturan Jadwal (*Scheduling Conflict*):** Penjadwalan teknisi dilakukan secara manual melalui aplikasi pesan instan tanpa sinkronisasi kapasitas jam kerja nyata, berakibat pada pembatalan sepihak, keterlambatan kedatangan, serta tumpang tindih alokasi teknisi.
3. **Dokumentasi Lapangan yang Tidak Transparan:** Minimnya pelaporan kondisi awal sebelum dicuci/diperbaiki (*photo evidence before/after*) dan pencatatan suku cadang yang ambigu memicu sengketa transparansi biaya antara konsumen dan teknisi.
4. **Sengketa Garansi dan Penilaian Kepuasan:** Ketiadaan batasan masa garansi yang terikat sistemik menyebabkan komplain pelanggan tidak tertangani secara adil dan terukur.
5. **Pencatatan Keuangan dan Faktur yang Tidak Terstandarisasi:** Pembayaran uang muka (DP), verifikasi transfer manual, dan diskon keanggotaan sering dihitung secara manual dan rentan kesalahan manusiawi (*human error*).

---

## 3. Rumusan Masalah
Berdasarkan latar belakang tersebut, permasalahan yang diselesaikan oleh sistem NARA AC dirumuskan sebagai berikut:
1. Bagaimana merancang mekanisme reservasi jadwal servis mandiri yang secara otomatis memvalidasi jam operasional (`08:00–19:00` WIB) serta mencegah benturan waktu dan kapasitas teknisi?
2. Bagaimana membangun sistem pelaporan teknisi berbasis gawai bergerak yang mewajibkan bukti visual (*before/after*), lembar pemeriksaan diagnostik, dan persetujuan ganda (*dual approval*) atas penambahan suku cadang?
3. Bagaimana mengotomatisasi pengingat pemeliharaan rutin (*periodic maintenance reminder*) melalui integrasi WhatsApp gateway yang tepat sasaran dan anti-duplikasi?
4. Bagaimana memastikan keandalan kalkulasi faktur digital bertahap (Estimasi Awal vs. Faktur Pajak Final) dengan penegakan diskon keanggotaan 10% yang secara ketat hanya berlaku pada biaya jasa?
5. Bagaimana mengintegrasikan model kecerdasan buatan (*AI NLP Classifier*) dan analisis data sains untuk mengotomatisasi interaksi tanya-jawab pelanggan dan meramalkan permintaan servis 14 hari ke depan?

---

## 4. Tujuan Sistem
1. Mengembangkan platform operasional terpadu berbasis web yang menghubungkan Pelanggan, Teknisi Lapangan, dan Administrator dalam satu sistem terintegrasi.
2. Menerapkan mesin penjadwalan otomatis yang menerapkan 47 Aturan Bisnis (*Business Rules*) secara konsisten pada level basis data dan API backend.
3. Menyediakan portal mandiri bagi pelanggan untuk mengelola unit AC, melacak status pekerjaan secara *real-time*, mengunduh faktur resmi, dan mengajukan klaim garansi tanpa hambatan birokrasi manual.
4. Membekali teknisi dengan instrumen pelaporan lapangan digital yang terstandarisasi guna meningkatkan akuntabilitas mutu servis.
5. Menyediakan sarana pemantauan analitik terpusat bagi manajemen CV. Nara Teknindotama guna mengukur kinerja teknisi, pendapatan jasa, dan proyeksi kapasitas beban kerja di masa mendatang.

---

## 5. Ruang Lingkup Sistem
- **Lingkup Pengguna:**
  - **Pengunjung / Pelanggan Publik:** Pemesanan cepat tanpa login awal, pelacakan pesanan melalui kode unik `NARA-AC...`, dan pengunduhan faktur resmi.
  - **Pelanggan Terdaftar (Member):** Manajemen profil unit AC pribadi, riwayat servis seumur hidup, dan hak diskon otomatis 10% pada biaya jasa.
  - **Teknisi Lapangan:** Menerima surat perintah kerja (*work order*), mengubah status penanganan, mengisi formulir pemeriksaan, dan mengunggah foto bukti pengerjaan.
  - **Administrator / Pemilik Usaha:** Konfirmasi pemesanan, penugasan teknisi, verifikasi bukti transfer bank, penyelesaian sengketa garansi, pengaturan katalog tarif, dan pemantauan analitik bisnis.
- **Lingkup Fungsional:**
  - Manajemen katalog servis dengan penetapan durasi pengerjaan, tarif dasar, masa garansi (14, 30, atau 45 hari), dan interval servis (60–180 hari).
  - Validasi jam operasional strictly pukul 08:00 s/d 19:00 WIB dengan kalkulasi durasi bertingkat berdasarkan kuantitas unit AC.
  - Alur faktur digital dua tahap (Estimasi Awal dan Faktur Final) dengan perlindungan selisih bayar (*kurang bayar* dan *lebih bayar / refund*).
  - Alur garansi purnajual dengan syarat pengisian ulasan kepuasan dan pembatasan maksimal satu klaim aktif per transaksi.
  - Penjadwalan cron harian pukul 07:00 WIB untuk pengingat servis WhatsApp.
  - Layanan AI klasifikasi 20 intent percakapan dan ekstraksi entitas AC.
  - Pipeline Data Science untuk pemodelan prediksi deret waktu 14 hari dan dashboard interaktif Streamlit.
- **Batasan Sistem (*Out of Scope*):**
  - Sistem tidak memproses gerbang pembayaran kartu kredit otomatis pihak ketiga (menggunakan transfer bank dengan verifikasi manual dan pembayaran tunai di tempat).
  - Sistem tidak melayani pemesanan di luar wilayah operasional terdaftar (Jabodetabek).

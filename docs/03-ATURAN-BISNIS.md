# 03. SPESIFIKASI ATURAN BISNIS OTORITATIF (`BR-01` s/d `BR-47`)

**Dokumen Acuan:** Spesifikasi Aturan Bisnis NARA AC (`A26-CS054 Draft v1.0`)  
**Entitas Usaha:** **CV. Nara Teknindotama**  

---

## 1. Pendahuluan
Aturan bisnis (*Business Rules*) merupakan sekumpulan batasan, kondisi, dan logika operasional yang mengatur jalannya transaksi di dalam sistem NARA AC. Seluruh aturan bisnis ditegakkan secara otoritatif pada layer backend dan basis data, sehingga manipulasi nilai pada sisi klien (frontend) tidak akan pernah memengaruhi integritas sistem.

---

## 2. Rincian Aturan Bisnis Berdasarkan Kategori

### 2.1 Kategori A: Membership, Diskon & Struktur Biaya (`BR-01` – `BR-06`)

| ID Aturan | Pernyataan Aturan Bisnis | Tujuan Operasional | Enforcing Module | Status Verifikasi |
| :--- | :--- | :--- | :--- | :---: |
| **BR-01** | **Hak Diskon Membership:** Pelanggan yang terdaftar sebagai Member berhak memperoleh diskon khusus. Pelanggan non-member dikenakan tarif standar katalog. | Mendorong retensi pelanggan jangka panjang dan pendaftaran akun. | `backend/src/services/bookingService.js` | **COMPLIANT** |
| **BR-02** | **Diskon Terbatas pada Biaya Jasa:** Diskon member 10% diberlakukan **khusus pada biaya jasa perbaikan/perawatan (`biaya_jasa`)**. Komponen biaya lain tidak boleh dipotong. | Melindungi margin laba kotor suku cadang dan material habis pakai. | `bookingService.js:computePricing()`, `AdminHome.jsx` | **COMPLIANT** |
| **BR-03** | **Pengecualian Mutlak Suku Cadang:** Biaya penggantian suku cadang (`biaya_sparepart`) dan pengisian freon tidak boleh dipotong diskon member. | Mencegah kerugian finansial akibat harga beli komponen dari suplier bersifat tetap. | `OfficialInvoicePaper.jsx`, `Scenario A` | **COMPLIANT** |
| **BR-04** | **Persetujuan Ganda Perubahan Biaya (Dual Approval):** Setiap penambahan biaya jasa atau komponen di lapangan oleh teknisi wajib disetujui bersama oleh Pelanggan dan Admin. | Menghindari praktik kecurangan di lapangan dan komplain ketidaksesuaian tagihan. | `workflowService.js`, `e2e_journey.test.js` | **COMPLIANT** |
| **BR-05** | **Otoritas Kalkulasi Server-Side:** Nilai total, subtotal, dan diskon yang dikirim oleh frontend diabaikan; server menghitung ulang nilai mutlak dari basis data. | Mencegah eksploitasi manipulasi parameter harga pada request HTTP payload. | `backend/src/routes/bookings.js:POST /bookings` | **COMPLIANT** |
| **BR-06** | **Batasan Waktu Operasional:** Jam kerja servis berlangsung dari pukul **08:00 WIB hingga 19:00 WIB**. Tidak ada pekerjaan yang boleh dijadwalkan selesai lewat pukul 19:00 WIB. | Menjaga kepatuhan jam kerja teknisi dan kenyamanan lingkungan pelanggan. | `bookingService.js:computeEnd()`, `AdminSettings.jsx` | **COMPLIANT** |

---

### 2.2 Kategori B: Pemesanan, Penjadwalan & Kapasitas (`BR-07` – `BR-16`)

| ID Aturan | Pernyataan Aturan Bisnis | Tujuan Operasional | Enforcing Module | Status Verifikasi |
| :--- | :--- | :--- | :--- | :---: |
| **BR-07** | **Konfirmasi Slot Otomatis:** Pemesanan pada slot waktu dan kapasitas yang tersedia langsung mendapatkan konfirmasi awal sistem. | Memberikan kepastian instan kepada pelanggan tanpa penundaan administratif. | `bookingService.js:isSlotAvailable()` | **COMPLIANT** |
| **BR-08** | **Penolakan Benturan Jadwal (Conflict Rejection):** Jika kapasitas teknisi pada slot jam terpilih telah penuh, sistem menolak pemesanan dengan kode galat HTTP 409. | Menjamin tidak terjadi *overbooking* yang menyebabkan teknisi gagal hadir. | `Scenario B: Scheduling Conflict Rejection (BR-07)` | **COMPLIANT** |
| **BR-09** | **Batas Waktu Pembatalan Mandiri 24 Jam:** Pelanggan hanya dapat membatalkan pemesanan secara mandiri minimal 24 jam sebelum waktu servis dijadwalkan. | Memberikan waktu bagi admin untuk mengalokasikan ulang teknisi ke pelanggan lain. | `bookingService.js:cancelBooking()`, HTTP 422 jika < 24 jam | **COMPLIANT** |
| **BR-10** | **Penjadwalan Ulang (Reschedule):** Permintaan perubahan jadwal harus diajukan minimal 12 jam sebelumnya dan bergantung pada ketersediaan slot baru. | Mencegah gangguan mendadak pada rute perjalanan harian teknisi. | `routes/bookings.js:PATCH /reschedule` | **COMPLIANT** |
| **BR-11** | **Penugasan Teknisi oleh Admin:** Alokasi spesifik teknisi ke pekerjaan dilakukan oleh Admin dengan mempertimbangkan zonasi wilayah dan kompetensi. | Menjamin penugasan teknisi yang paling efisien dari segi rute dan beban kerja. | `routes/admin.js:PATCH /bookings/:id/assign` | **COMPLIANT** |
| **BR-12** | **Validasi Ketersediaan Teknisi:** Teknisi yang tercatat memiliki status cuti (`off`) atau penugasan lain (`busy`) tidak dapat dipilih untuk penugasan baru. | Mencegah jadwal ganda (*double-booking*) pada teknisi yang sama. | `technician_availability.teknisi_id` validation | **COMPLIANT** |
| **BR-13** | **Durasi Proporsional terhadap Jumlah Unit:** Alokasi durasi servis dihitung dinamis: `durasi = durasi_katalog * jumlah_unit`. | Mengalokasikan estimasi waktu kerja yang realistis di lapangan. | `computeSlotDuration()`, `BookingPage.jsx` | **COMPLIANT** |
| **BR-14** | **Konfirmasi Otomatis 48 Jam (Auto-Done):** Pekerjaan yang telah berstatus `done` otomatis dianggap disetujui pelanggan setelah 48 jam jika tidak ada sanggahan. | Mencegah penahanan pencairan kas dan mengaktifkan masa garansi secara adil. | `reminderService.js:autoConfirmCompletedJobs()` | **COMPLIANT** |
| **BR-15** | **Riwayat Khusus Per Unit AC:** Setiap unit AC milik pelanggan memiliki riwayat servis individual yang terisolasi dari unit lainnya. | Memberikan rekam jejak kesehatan teknis setiap mesin pendingin secara terukur. | `acUnitService.js`, `ac_units` table | **COMPLIANT** |
| **BR-16** | **Pengecualian Pemesanan Batal dari Perawatan:** Pemesanan yang berstatus batal (`cancelled`) dikeluarkan mutlak dari kalkulasi interval servis berkala. | Mencegah kesalahan data interval servis pada unit yang belum pernah dikerjakan. | `Scenario F`: filter `status = 'done'` | **COMPLIANT** |

---

### 2.3 Kategori C: Unit AC & Pengingat Perawatan Berkala (`BR-17` – `BR-20`)

| ID Aturan | Pernyataan Aturan Bisnis | Tujuan Operasional | Enforcing Module | Status Verifikasi |
| :--- | :--- | :--- | :--- | :---: |
| **BR-17** | **Interval Perawatan Sesuai Katalog:** Interval pemeliharaan berkala diatur per katalog layanan (standar 90 hari, perbaikan 120 hari). | Menyesuaikan rekomendasi teknis dengan jenis beban kerja operasional AC. | `service_catalog.interval_maintenance_hari` | **COMPLIANT** |
| **BR-18** | **Pemicu Pengingat Otomatis:** Scheduler cron harian berjalan setiap pukul 07:00 WIB untuk mendeteksi unit yang telah jatuh tempo perawatan berkala. | Menjaga retensi servis pelanggan dan performa mesin pendingin tetap optimal. | `reminderService.js` (cron: `0 7 * * *`) | **COMPLIANT** |
| **BR-19** | **Deduplikasi Pesan Pengingat:** Sistem tidak akan mengirimkan pesan pengingat ulang untuk unit yang sama dalam kurun waktu 30 hari kalender. | Mencegah pengiriman pesan berulang yang berpotensi dianggap *spam* oleh pelanggan. | `reminder_log.alreadySentReminder` check | **COMPLIANT** |
| **BR-20** | **Hak Opsi Penonaktifan Pengingat:** Pelanggan memiliki kendali penuh untuk menonaktifkan atau menjeda pengingat servis pada unit AC tertentu. | Menghargai privasi dan preferensi pelanggan yang unitnya sedang tidak digunakan. | `ac_units.aktif` toggle, `CustomerAcUnits.jsx` | **COMPLIANT** |

---

### 2.4 Kategori D: Prosedur Lapangan & Laporan Teknisi (`BR-21` – `BR-22`)

| ID Aturan | Pernyataan Aturan Bisnis | Tujuan Operasional | Enforcing Module | Status Verifikasi |
| :--- | :--- | :--- | :--- | :---: |
| **BR-21** | **Kelengkapan Laporan Kerja Lapangan Wajib:** Laporan penyelesaian teknisi wajib memuat: foto kondisi sebelum servis, foto kondisi sesudah servis, checklist diagnostik, dan catatan temuan. | Menjamin transparansi mutu pekerjaan teknisi dan bukti otentik dokumentasi fisik. | `workflowService.js:submitReport()`, `TechnicianJobDetail.jsx` | **COMPLIANT** |
| **BR-22** | **Syarat Penilaian dan Ulasan (Review Gate):** Ulasan dan rating kepuasan (1-5 bintang) hanya dapat diisi jika pekerjaan telah selesai (`status = 'done'`) dan terkonfirmasi. | Memastikan keabsahan ulasan bahwa servis telah benar-benar dieksekusi di lapangan. | `routes/ops.js:POST /feedback`, `Scenario J` | **COMPLIANT** |

---

### 2.5 Kategori E: Jaminan Garansi Purnajual & Klaim (`BR-23` – `BR-32`)

| ID Aturan | Pernyataan Aturan Bisnis | Tujuan Operasional | Enforcing Module | Status Verifikasi |
| :--- | :--- | :--- | :--- | :---: |
| **BR-23** | **Durasi Garansi Terkonfigurasi:** Durasi garansi terikat pada katalog layanan: Cuci Standar (14 hari), Cuci Core/Deep Clean (30 hari), Paket Freon (45 hari). | Menyelaraskan masa garansi dengan risiko teknis dan ketahanan masing-masing servis. | `service_catalog.garansi_hari` constraint | **COMPLIANT** |
| **BR-24** | **Waktu Mulai Garansi:** Penghitungan masa berlaku garansi dimulai tepat pada tanggal dan jam konfirmasi pekerjaan selesai. | Menghitung masa garansi secara adil sejak pekerjaan diserahterimakan ke pelanggan. | `warrantyService.js:getWarrantyInfo()` | **COMPLIANT** |
| **BR-25** | **Kewajiban Ulasan pada Pengajuan Klaim:** Pelanggan yang mengajukan klaim garansi diwajibkan telah mengisi penilaian kepuasan awal dan deskripsi kerusakan. | Menampung umpan balik evaluasi mutu teknisi yang menangani pekerjaan awal. | `StatusPage.jsx`, `Scenario E & J` | **COMPLIANT** |
| **BR-26** | **Tinjauan Kelayakan oleh Admin:** Setiap klaim garansi yang diajukan wajib ditinjau dan diputuskan kelayakannya oleh Admin Operasional (`approved` / `rejected`). | Memastikan bahwa klaim garansi sesuai dengan skop pengerjaan sebelumnya. | `routes/claims.js:PATCH /decide`, `AdminClaims.jsx` | **COMPLIANT** |
| **BR-27** | **Kunjungan Inspeksi Garansi Bebas Biaya:** Klaim garansi yang disetujui akan dijadwalkan untuk kunjungan perbaikan ulang dengan tarif total Rp 0. | Menepati janji komitmen perlindungan konsumen atas hasil servis yang tidak tuntas. | `warrantyService.js:scheduleInspection()`, `biaya = 0` | **COMPLIANT** |
| **BR-28** | **Konversi Klaim Ditolak Menjadi Servis Reguler:** Klaim garansi yang ditolak dapat dialihkan menjadi pemesanan servis berbayar atas persetujuan pelanggan. | Memberikan solusi alternatif bagi pelanggan jika kerusakan di luar skop garansi. | `routes/claims.js:POST /convert-to-paid` | **COMPLIANT** |
| **BR-29** | **Pembatasan Satu Klaim Aktif:** Satu transaksi booking hanya dapat memiliki maksimal satu proses klaim garansi yang aktif dalam satu waktu. | Mencegah penumpukan tiket klaim ganda untuk permasalahan yang sama. | `warrantyService.js:hasActiveClaim()`, `Scenario E` | **COMPLIANT** |
| **BR-30** | **Penolakan Klaim Kedaluwarsa:** Pengajuan klaim garansi yang melewati tanggal berakhir garansi akan ditolak secara otomatis oleh sistem. | Menjaga kepastian batas waktu pertanggungjawaban operasional perusahaan. | `computed_expiry < NOW()`, HTTP 422 | **COMPLIANT** |
| **BR-31** | **Batasan Skop Garansi:** Garansi hanya mencakup masalah pada komponen yang diservis; kerusakan baru akibat kelistrikan eksternal tidak ditanggung. | Klausul hukum yang dicantumkan secara transparan pada Syarat & Ketentuan. | `TermsConditionsPage.jsx` | **COMPLIANT** |
| **BR-32** | **Masa Garansi Suku Cadang:** Suku cadang yang diganti mengikuti garansi resmi pabrikan/distributor yang tertera pada faktur final. | Memisahkan tanggung jawab garansi jasa dari tanggung jawab garansi material pabrikan. | `OfficialInvoicePaper.jsx`, `AdminInventory.jsx` | **COMPLIANT** |

---

### 2.6 Kategori F: Faktur, Kas & Pembayaran (`BR-33` – `BR-42`)

| ID Aturan | Pernyataan Aturan Bisnis | Tujuan Operasional | Enforcing Module | Status Verifikasi |
| :--- | :--- | :--- | :--- | :---: |
| **BR-33** | **Struktur Faktur Dua Tahap:** Sistem menyediakan Faktur Estimasi Awal (`tipe: initial`) saat booking dan Faktur Pajak Final (`tipe: final`) setelah pengerjaan. | Memberikan kejelasan estimasi biaya di awal dan akurasi rekonsiliasi total akhir. | `OfficialInvoicePaper.jsx`, `paymentService.js` | **COMPLIANT** |
| **BR-34** | **Pilihan Skema Pembayaran:** Mendukung skema Pembayaran Penuh di Awal (`full`) dan skema Pembayaran Uang Muka 50% (`dp_50`). | Memberikan fleksibilitas arus kas bagi pelanggan perorangan maupun korporat. | `bookings.skema_pembayaran` | **COMPLIANT** |
| **BR-35** | **Kanal Metode Pembayaran Sah:** Sistem menerima metode Transfer Bank Resmi (BCA/Mandiri), QRIS, dan Tunai (*Cash on Delivery*). | Menyediakan opsi pembayaran yang aman dan mudah diakses oleh seluruh lapisan konsumen. | `bookings.metode_pembayaran` | **COMPLIANT** |
| **BR-36** | **Audit Manual Transfer Bank:** Pembayaran via transfer bank berstatus `unverified` sampai berkas bukti transfer diverifikasi keabsahannya oleh Admin. | Menghindari manipulasi bukti transfer palsu atau mutasi perbankan yang belum efektif. | `routes/payments.js:POST /verify`, `AdminInvoices.jsx` | **COMPLIANT** |
| **BR-37** | **Pelunasan Tunai di Lokasi:** Pembayaran tunai yang diserahkan kepada teknisi wajib dicantumkan pada laporan kerja lapangan dan disahkan admin. | Menjaga transparansi setoran kas teknisi lapangan ke bagian keuangan kantor. | `work_orders.metode_pelunasan = 'cash'` | **COMPLIANT** |
| **BR-38** | **Format Lembar Faktur Siap Cetak:** Faktur menampilkan kop resmi CV. Nara Teknindotama, NIB, NPWP, rincian item, cap lunas, dan stempel digital. | Menyediakan dokumen penagihan dan pembukuan resmi yang diakui secara fiskal/pajak. | `OfficialInvoicePaper.jsx`, `BookingPage.jsx` | **COMPLIANT** |
| **BR-39** | **Pencatatan Kurang Bayar (Underpayment):** Jika nominal pembayaran yang diverifikasi lebih kecil dari total tagihan, sistem mencatat status `kurang_bayar`. | Memantau piutang usaha yang belum diselesaikan oleh pelanggan. | `Scenario D`, `paymentService.js:recordPayment()` | **COMPLIANT** |
| **BR-40** | **Pencatatan Lebih Bayar & Pengembalian Dana:** Jika nominal pembayaran berlebih, sistem mencatat status `lebih_bayar` dan menginisiasi pencatatan pengembalian dana (*refund*). | Menjamin integritas finansial dan akuntabilitas pengembalian hak konsumen. | `Scenario D`, `paymentService.js:recordRefund()` | **COMPLIANT** |
| **BR-41** | **Pengiriman Salinan Faktur WhatsApp:** Sistem dapat mengirimkan tautan faktur resmi langsung ke nomor WhatsApp pelanggan. | Mempermudah pelanggan menyimpan arsip kuitansi digital di smartphone mereka. | `routes/payments.js:POST /send-whatsapp` | **COMPLIANT** |
| **BR-42** | **Antrean Ulang Pengiriman Faktur (Retry Mechanism):** Kegagalan pengiriman faktur WhatsApp akan dijadwalkan ulang secara otomatis di latar belakang. | Menjamin kepastian penerimaan faktur meskipun terjadi gangguan jaringan sesaat. | `whatsapp_invoice_logs`, `Scenario H & I` | **COMPLIANT** |

---

### 2.7 Kategori G: AI, WhatsApp & Keamanan Otomasi (`BR-43` – `BR-47`)

| ID Aturan | Pernyataan Aturan Bisnis | Tujuan Operasional | Enforcing Module | Status Verifikasi |
| :--- | :--- | :--- | :--- | :---: |
| **BR-43** | **Otentikasi Kriptografis Webhook:** Setiap webhook WhatsApp yang masuk wajib diverifikasi tanda tangan HMAC-SHA256 atau token rahasia. | Mencegah injeksi pesan palsu dari peretas yang menyamar sebagai gateway WhatsApp. | `routes/whatsapp.js:verifyWebhookSignature()` | **COMPLIANT** |
| **BR-44** | **Deduplikasi Pesan Webhook (Idempotency):** Pesan webhook dengan `message_id` yang sama dalam kurun waktu pemrosesan tidak boleh diproses dua kali. | Menghindari respons percakapan ganda atau pembuatan tiket pengaduan duplikat. | `whatsapp_webhook_events` primary key lookup | **COMPLIANT** |
| **BR-45** | **Klasifikasi NLP 20 Intent:** Seluruh pesan teks masuk diklasifikasikan ke dalam 20 domain intent terstruktur dengan ekstraksi slot parameter teknis. | Mengotomatisasi identifikasi kebutuhan pelanggan secara cepat dan presisi. | `ai-service/main.py:predict_intent()` | **COMPLIANT** |
| **BR-46** | **Eskalasi ke Operator Manusia (Human Handoff):** Jika keyakinan AI di bawah ambang batas (0.55) atau terdeteksi komplain rumit, percakapan dialihkan ke Admin CS. | Menjaga kepuasan pelanggan agar tidak terjebak dalam respon chatbot yang salah arah. | `complaint_tickets`, `AdminWhatsApp.jsx` | **COMPLIANT** |
| **BR-47** | **Larangan Halusinasi AI:** AI dilarang keras mengonfirmasi booking, menyetujui klaim, atau menjanjikan diskon tanpa validasi resmi basis data backend. | Melindungi bisnis dari komitmen sepihak yang tidak valid secara hukum dan keuangan. | `chatService.js`, `Scenario H: AI Governance` | **COMPLIANT** |

---

## 3. Parameter Konfigurasi Operasional (Bagian 7.8 Spesifikasi)
Sepuluh parameter operasional dari Bagian 7.8 spesifikasi NARA AC dirancang **dinamis dan dapat dikonfigurasi melalui antarmuka Admin Settings** tanpa perlu mengubah kode sumber:

1. **Jam Buka Operasional (`operating_hours.open`):** Terkonfigurasi pada `08:00 WIB`.
2. **Jam Tutup Operasional (`operating_hours.close`):** Terkonfigurasi pada `19:00 WIB`.
3. **Hari Kerja Operasional (`operating_hours.days`):** Senin s/d Sabtu (`[1, 2, 3, 4, 5, 6]`).
4. **Durasi Slot Standar (`slot_minutes`):** `60 menit`.
5. **Waktu Tenggang Minimum Pemesanan (`min_lead_minutes`):** `60 menit` sebelum slot dimulai.
6. **Batas Maksimum Pemesanan di Muka (`max_advance_days`):** `60 hari` ke depan.
7. **Durasi Garansi Cuci Standar (`garansi_hari_standar`):** `14 hari`.
8. **Durasi Garansi Cuci Deep Clean (`garansi_hari_deep`):** `30 hari`.
9. **Durasi Garansi Layanan Freon (`garansi_hari_freon`):** `45 hari`.
10. **Batas Maksimum Percobaan WhatsApp (`wa_max_retry`):** `3 kali percobaan`.

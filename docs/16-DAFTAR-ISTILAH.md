# 16 — Daftar Istilah & Glosarium (Glossary)

Dokumen ini mendokumentasikan daftar istilah teknis rekayasa perangkat lunak (*Software Engineering*), basis data, kecerdasan buatan, serta istilah operasional tata udara dan pendingin ruangan (*Heating, Ventilation, and Air Conditioning / HVAC*) yang digunakan di seluruh sistem **NARA AC — CV. Nara Teknindotama** (Kode Proyek: **A26-CS054**).

---

## 1. Istilah Rekayasa Perangkat Lunak & Arsitektur Sistem

- **API (Application Programming Interface):** Antarmuka penghubung yang memungkinkan sistem frontend, backend, dan layanan eksternal saling berkomunikasi dan bertukar data melalui protokol standar (HTTP/JSON).
- **Audit Trail (Jejak Audit):** Rekaman log kronologis yang mencatat secara mendalam setiap aktivitas mutasi data penting dalam sistem (siapa yang mengubah, kapan diubah, dan apa nilai data sebelum serta sesudah perubahan).
- **Authentication (Autentikasi):** Proses verifikasi dan pembuktian identitas pengguna yang sah saat masuk ke dalam sistem (misalnya verifikasi email dan kata sandi atau kode OTP).
- **Authorization (Otorisasi):** Proses penentuan batasan wewenang atau hak akses yang dimiliki oleh pengguna tertentu setelah proses autentikasi berhasil (misalnya peran Pelanggan tidak boleh mengakses menu keuangan Admin).
- **BAP (Berita Acara Pekerjaan):** Dokumen laporan resmi teknis yang diterbitkan oleh teknisi di lapangan setelah menyelesaikan servis sebagai bukti pekerjaan telah tuntas dan disetujui pelanggan.
- **CSRF (Cross-Site Request Forgery):** Jenis serangan siber di mana peramban korban dipaksa mengeksekusi aksi yang tidak diinginkan pada aplikasi web tempat korban sedang terotentikasi. Dimonitor dan dicegah menggunakan teknik *Double-Submit Cookie*.
- **Cumulative Layout Shift (CLS):** Metrik performa antarmuka web yang mengukur stabilitas visual halaman saat dimuat agar elemen tidak bergeser mendadak yang dapat mengganggu pengguna.
- **Double-Submit Cookie:** Pola pengamanan CSRF di mana server mengirimkan token acak dalam cookie dan klien diwajibkan menyalin token tersebut ke dalam header HTTP pada setiap permintaan mutasi.
- **Graceful Shutdown:** Prosedur penghentian server secara bertahap dan tertib, di mana server menyelesaikan pemrosesan transaksi yang sedang berjalan terlebih dahulu sebelum mematikan koneksi basis data.
- **IDOR (Insecure Direct Object Reference):** Kerentanan keamanan kontrol akses di mana aplikasi mengizinkan penyerang mengakses atau memodifikasi objek data milik pengguna lain secara langsung melalui manipulasi parameter ID.
- **Idempotency (Idempotensi):** Sifat dari suatu operasi atau endpoint API yang menghasilkan keadaan sistem yang sama persis meskipun dieksekusi berulang kali dengan parameter identik (mencegah double-order atau double-billing).
- **JWT (JSON Web Token):** Standar token digital berbasis JSON yang ditandatangani secara kriptografis untuk mentransmisikan klaim identitas antar pihak secara aman.
- **Magic-Byte (Header Biner):** Kumpulan byte pertama dari suatu berkas biner yang bertindak sebagai tanda pengenal (*signature*) asli format berkas untuk mencegah manipulasi ekstensi palsu.
- **PWA (Progressive Web App):** Aplikasi web yang dibangun menggunakan teknologi modern sehingga memiliki perilaku menyerupai aplikasi seluler asli (native), termasuk kemampuan bekerja saat koneksi internet lambat atau terputus.
- **RBAC (Role-Based Access Control):** Pendekatan pembatasan otorisasi sistem berdasarkan peran kerja (*roles*) yang diberikan kepada pengguna dalam suatu organisasi.
- **Race Condition (Kondisi Balapan):** Situasi kegagalan sistem konkurensi di mana dua proses atau lebih mencoba mengakses dan memodifikasi data bersama secara bersamaan sehingga menghasilkan data yang tidak konsisten. Dicegah menggunakan *Row-Level Locking*.
- **Row-Level Locking (`FOR UPDATE`):** Mekanisme penguncian baris data pada basis data transaksional yang mencegah transaksi lain membaca atau memperbarui baris tersebut hingga transaksi pertama selesai melakukan `COMMIT` atau `ROLLBACK`.
- **SPA (Single-Page Application):** Arsitektur aplikasi web yang memuat satu halaman HTML tunggal dan memperbarui antarmuka pengguna secara dinamis melalui JavaScript tanpa perlu memuat ulang seluruh halaman peramban.
- **SPK (Surat Perintah Kerja):** Dokumen penugasan resmi dari kantor operasional (dispatcher) kepada teknisi lapangan yang memuat rincian jadwal, alamat pelanggan, dan lingkup pekerjaan servis.
- **UUID (Universally Unique Identifier):** Pengidentifikasi unik berstandar 128-bit yang digunakan untuk menjamin keunikan identitas data di seluruh sistem terdistribusi tanpa bergantung pada penghitung sekuensial.

---

## 2. Istilah Kecerdasan Buatan & Sains Data

- **CSAT (Customer Satisfaction Score):** Metrik pengukuran tingkat kepuasan pelanggan terhadap layanan yang diterima, dihitung berdasarkan rata-rata rating bintang 1 hingga 5.
- **Day of Week (Fitur Hari):** Transformasi data deret waktu yang mengelompokkan hari dalam seminggu (Senin hingga Minggu) untuk menangkap pola musiman lonjakan permintaan pada akhir pekan.
- **Entity Extraction (Ekstraksi Entitas):** Proses pemrosesan bahasa alami (NLP) untuk menemukan, mengekstrak, dan mengklasifikasikan informasi penting (seperti kapasitas PK, tanggal, waktu, nomor faktur) dari kalimat bebas pelanggan.
- **Intent Classification (Klasifikasi Intensi):** Tugas pemodelan pembelajaran mesin untuk memprediksi maksud atau tujuan pengguna dari pesan teks yang dikirimkan (misalnya membedakan antara pertanyaan harga dan permintaan pemesanan).
- **Lag Features (Fitur Keterlambatan):** Nilai variabel pada periode waktu sebelumnya (misalnya permintaan servis 7 hari atau 14 hari yang lalu) yang digunakan sebagai variabel masukan pada model peramalan deret waktu.
- **MAE (Mean Absolute Error):** Rata-rata dari selisih absolut antara nilai yang diprediksi oleh model peramalan dengan nilai aktual yang terjadi di lapangan.
- **NPS (Net Promoter Score):** Metrik loyalitas pelanggan yang mengukur kecenderungan pelanggan untuk merekomendasikan layanan NARA AC kepada orang lain.
- **RAG (Retrieval-Augmented Generation):** Teknik peningkatan kemampuan model bahasa dengan mengambil dokumen atau informasi faktual dari basis data pengetahuan internal sebelum menghasilkan respons.
- **RFM Analysis (Recency, Frequency, Monetary):** Metode segmentasi perilaku pelanggan berdasarkan seberapa baru mereka bertransaksi (*Recency*), seberapa sering mereka menggunakan jasa (*Frequency*), dan berapa banyak uang yang mereka belanjakan (*Monetary*).
- **Ridge Regression (Regresi Ridge):** Model regresi linier yang menerapkan penalti regularisasi L2 untuk mencegah *overfitting* dan menangani multikolinearitas antar variabel fitur.
- **RMSE (Root Mean Squared Error):** Akar kuadrat dari rata-rata kuadrat selisih antara nilai prediksi dan nilai aktual, memberikan bobot lebih tinggi pada kesalahan prediksi yang bernilai besar.
- **TF-IDF (Term Frequency-Inverse Document Frequency):** Algoritma pembobotan statistik yang mengukur seberapa penting suatu kata dalam sekumpulan dokumen untuk mengubah teks bebas menjadi vektor numerik masukan model.

---

## 3. Istilah Tata Udara & Pendingin Ruangan (HVAC)

- **Air Conditioner (AC):** Sistem pendingin udara yang berfungsi menurunkan temperatur, mengatur kelembapan, serta menyaring sirkulasi udara di dalam ruangan tertutup.
- **Ampere (Arus Listrik):** Satuan besaran kuat arus listrik kerja kompresor AC. Pengukuran Ampere wajib dilakukan teknisi untuk memastikan motor kompresor tidak kelebihan beban (*overload*).
- **Blower Fan:** Kipas silindris pada unit indoor yang berfungsi meniupkan udara dingin hasil pendinginan sirip evaporator ke seluruh penjuru ruangan.
- **Bongkar Pasang AC:** Jasa pelepasan unit AC dari lokasi lama dan pemasangan kembali unit AC di lokasi atau ruangan yang baru secara aman.
- **Capacitor (Kapasitor):** Komponen listrik yang berfungsi menyimpan muatan listrik sementara untuk memberikan torsi awal saat motor kompresor dan motor kipas outdoor mulai berputar (*starting capacitor*).
- **Cassette AC:** Tipe unit pendingin ruangan yang dipasang tertanam di dalam plafon langit-langit (*ceiling*), umumnya digunakan pada perkantoran, lobi, atau aula luas.
- **Cuci Besar (Overhaul):** Servis pembersihan intensif di mana unit indoor dan outdoor diturunkan dari dinding secara menyeluruh untuk membersihkan lendir membandel pada bak penampung dan talang belakang.
- **Drain Hose (Pipa Pembuangan):** Selang saluran pembuangan air kondensasi hasil pendinginan dari bak penampung indoor menuju luar ruangan.
- **Drain Jacket (Plastik Cuci AC):** Plastik pelindung berbentuk corong khusus yang dipasang membungkus unit indoor saat pencucian agar air semprotan bertekanan tidak membasahi dinding dan perabotan kamar.
- **Evaporator:** Koil penukar panas pada unit indoor yang menyerap panas udara ruangan melalui sirkulasi cairan refrigeran dingin bertekanan rendah.
- **Freon (Refrigeran):** Fluida atau senyawa kimia kerja yang bersirkulasi dalam siklus kompresi uap tertutup untuk menyerap panas di dalam ruangan dan membuangnya ke luar ruangan.
- **Inverter AC:** Teknologi pendingin ruangan modern yang menggunakan kompresor dengan kecepatan putaran yang dapat diatur secara dinamis oleh sirkuit elektronik untuk menghemat konsumsi daya listrik.
- **Kondensor:** Koil penukar panas pada unit outdoor yang berfungsi melepaskan panas yang diserap dari dalam ruangan ke udara bebas di luar ruangan.
- **Manifold Gauge:** Alat ukur teknis berkepala ganda (tekanan rendah dan tinggi) yang dilengkapi selang pengisian untuk mengukur tekanan kerja fluida refrigeran (PSI).
- **MCB (Miniature Circuit Breaker):** Sakelar pemutus arus listrik otomatis pada instalasi bangunan yang wajib dimatikan oleh teknisi sebelum memulai pembongkaran casing unit AC untuk keselamatan kerja.
- **PK (Paardekracht / Horsepower):** Satuan daya kompresor pendingin ruangan (misal: 0.5 PK setara ~5.000 BTU/h, 1 PK setara ~9.000 BTU/h, 2 PK setara ~18.000 BTU/h).
- **PSI (Pounds per Square Inch):** Satuan tekanan kerja fluida refrigeran di dalam sirkulasi AC (contoh: tekanan normal refrigeran R32 berkisar antara 140 hingga 160 PSI pada sisi hisap).
- **Refrigeran R32:** Jenis fluida refrigeran generasi baru dengan nilai potensi pemanasan global (*GWP*) yang rendah dan efisiensi energi yang lebih tinggi dibanding generasi sebelumnya.
- **Refrigeran R410A:** Campuran fluida refrigeran hidrofluorokarbon (HFC) yang umum digunakan pada unit AC inverter sebelum adopsi massal R32.
- **Split Wall AC:** Tipe pendingin ruangan yang paling umum digunakan pada perumahan, di mana unit terpisah menjadi unit peniup dingin di dalam ruangan (*indoor*) dan unit pelepasan panas di luar ruangan (*outdoor*).
- **Vacuum Pump (Pompa Vakum):** Alat mekanis yang wajib digunakan saat pemasangan atau perbaikan AC untuk menguras udara, kelembapan, dan uap air dari pipa tembaga sebelum kran refrigeran dibuka.

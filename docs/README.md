# PUSAT DOKUMENTASI TEKNIS SISTEM NARA AC

**Nama Proyek:** Sistem Pengelolaan Jadwal dan Pengingat Service AC  
**Kode Proyek:** `A26-CS054`  
**Entitas Hukum:** **CV. Nara Teknindotama**  
- **NIB:** `2805250066735`  
- **AHU:** `AHU-0045403-AH.01.14 Tahun 2025`  
- **NPWP:** `10.000.000.0-258.288`  
- **Alamat Kantor:** Jalan Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor, Jawa Barat  
- **Kontak Resmi:** `0813-8529-3137` · `narateknindotama@gmail.com` · `www.narateknindotama.com`  

---

## Daftar Isi Dokumentasi

Berikut adalah direktori lengkap modul dokumentasi teknis sistem NARA AC yang tersusun secara terstruktur:

1. [01. Pendahuluan & Gambaran Umum Sistem](./01-PENDAHULUAN.md)
   - Latar belakang bisnis, identifikasi masalah, tujuan pengembangan, ruang lingkup, dan identitas perusahaan.
2. [02. Analisis Kebutuhan Sistem (FR & NFR)](./02-ANALISIS-KEBUTUHAN.md)
   - Kebutuhan fungsional (`FR-001` s/d `FR-026`) dan nonfungsional (keamanan, performa, ketersediaan, aksesibilitas).
3. [03. Spesifikasi Aturan Bisnis Otoritatif](./03-ATURAN-BISNIS.md)
   - Dokumentasi lengkap 47 Aturan Bisnis (`BR-01` s/d `BR-47`) serta 10 parameter konfigurasi operasional Bagian 7.8.
4. [04. Arsitektur Sistem & Topologi Komponen](./04-ARSITEKTUR-SISTEM.md)
   - Desain arsitektur multi-tier, batas kepercayaan, gateway keamanan, dan diagram komponen arsitektur.
5. [05. Analisis Aktor & Use Case Diagram](./05-USE-CASE.md)
   - Identifikasi peran aktor (Pelanggan, Teknisi, Admin, Sistem AI), diagram use case, dan spesifikasi use case terperinci.
6. [06. Pemodelan Alur Bisnis (Activity & Sequence)](./06-ALUR-BISNIS.md)
   - Diagram alur pemesanan, activity diagram dengan swimlane, dan sequence diagram interaksi komponen.
7. [07. Perancangan Basis Data & Kamus Data](./07-DESAIN-DATABASE.md)
   - ERD relasional lengkap, kamus data 34 tabel, 21 migrasi SQL berurutan, dan analisis integritas data.
8. [08. Referensi Antarmuka Pemrograman Aplikasi (API)](./08-REFERENSI-API.md)
   - Katalog endpoint aktif `/api/v1`, format request/response, otentikasi JWT, dan penanganan galat.
9. [09. Dokumentasi Antarmuka Frontend (React 19)](./09-DOKUMENTASI-FRONTEND.md)
   - Struktur komponen, rute navigasi, pengelolaan state, form validasi, dan desain responsif mobile.
10. [10. Dokumentasi Layanan Backend (Node.js & Express)](./10-DOKUMENTASI-BACKEND.md)
    - Desain layanan inti (Booking, Workflow, Payment, Warranty, Reminder), isolasi transaksi, dan proteksi server.
11. [11. Sub-sistem AI NLP & Analitika Data Science](./11-DOKUMENTASI-AI-DATA-SCIENCE.md)
    - Klasifikasi 20 intent, ekstraksi entitas, model peramalan Ridge, dan dashboard interaktif Streamlit.
12. [12. Kerangka Keamanan, Privasi & Tata Kelola PII](./12-KEAMANAN-DAN-PRIVASI.md)
    - Mitigasi IDOR, proteksi CSRF, sanitasi upload berkas magic-byte, enkripsi kata sandi, dan kepatuhan privasi data.
13. [13. Strategi Pengujian & Hasil Verifikasi Mutu](./13-PENGUJIAN-DAN-KUALITAS.md)
    - Hasil pengujian native Node test runner (9 skenario), Vitest frontend (48 test), dan Python unittest (34 test).
14. [14. Panduan Instalasi, Konfigurasi & Deployment](./14-INSTALASI-KONFIGURASI-DEPLOYMENT.md)
    - Petunjuk setup lokal, referensi environment variables, runbook migrasi database, dan topologi VPS Nginx.
15. [15. Panduan Penggunaan Aplikasi Berdasarkan Peran](./15-PANDUAN-PENGGUNA.md)
    - Manual operasional untuk Pelanggan, Teknisi Lapangan, dan Administrator Operasional.
16. [16. Daftar Istilah & Glosarium Teknis](./16-DAFTAR-ISTILAH.md)
    - Glosarium istilah teknis rekayasa perangkat lunak dan istilah teknis pendingin ruangan (HVAC).

---

## Diagram Sumber (Mermaid)
Seluruh diagram tersimpan dalam format teks murni `.mmd` di folder [`docs/diagrams/`](./diagrams/):
- [`01-arsitektur-sistem.mmd`](./diagrams/01-arsitektur-sistem.mmd)
- [`02-use-case.mmd`](./diagrams/02-use-case.mmd)
- [`03-erd.mmd`](./diagrams/03-erd.mmd)
- [`04-alur-booking.mmd`](./diagrams/04-alur-booking.mmd)
- [`05-activity-booking.mmd`](./diagrams/05-activity-booking.mmd)
- [`06-sequence-booking.mmd`](./diagrams/06-sequence-booking.mmd)
- [`07-alur-pembayaran.mmd`](./diagrams/07-alur-pembayaran.mmd)
- [`08-alur-pekerjaan-teknisi.mmd`](./diagrams/08-alur-pekerjaan-teknisi.mmd)
- [`09-alur-garansi.mmd`](./diagrams/09-alur-garansi.mmd)
- [`10-alur-pengingat-whatsapp.mmd`](./diagrams/10-alur-pengingat-whatsapp.mmd)
- [`11-deployment.mmd`](./diagrams/11-deployment.mmd)


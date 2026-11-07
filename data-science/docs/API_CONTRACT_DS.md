# Kontrak Integrasi Model Data Science (DS -> Backend & Frontend)
## Tim: A26-CS054 | Studi Kasus: CV Nara Teknindotama
**Disusun oleh:** Rosi Saidah & Komang Duta Cahya Yudistira (Data Science Specialist)  
**Ditujukan kepada:** Kuat Riawan (Backend) & Dwiluky Hidayat (Frontend)

---

### 1. Endpoint 1: Estimasi Biaya Servis Awal (`/api/v1/predict-cost`)
- **Tujuan:** Ditampilkan di halaman formulir booking pemesanan servis untuk transparansi biaya.
- **Model File:** `models/best_cost_estimator_model.joblib`
- **Method:** `POST`

#### Request Payload:
```json
{
  "tipe_customer": "Rumah Tangga",
  "tipe_ac": "Split Standard",
  "kapasitas_pk": 1.0,
  "usia_ac_tahun": 3,
  "keluhan_utama": "AC Kurang Dingin"
}
```

#### Response Payload (200 OK):
```json
{
  "status": "success",
  "data": {
    "estimated_cost": 260000,
    "lower_bound": 224000,
    "upper_bound": 296000,
    "currency": "IDR",
    "disclaimer": "Estimasi awal ini dihitung berdasarkan gejala keluhan dan kapasitas unit. Biaya final ditentukan setelah pengecekan fisik di lokasi."
  }
}
```

---

### 2. Endpoint 2: Predictive Maintenance & Reminder (`/api/v1/predict-maintenance`)
- **Tujuan:** Dipanggil otomatis oleh backend ketika teknisi/admin mengubah status tiket menjadi **Done**. Output digunakan untuk mencatat jadwal reminder di tabel database `reminder_logs`.
- **Model File:** `models/best_maintenance_predictor_model.joblib`
- **Method:** `POST`

#### Request Payload:
```json
{
  "tipe_customer": "Bisnis/Kantor",
  "tipe_ac": "Cassette",
  "kapasitas_pk": 2.0,
  "usia_ac_tahun": 4,
  "jenis_layanan": "Tambah/Isi Freon & Cuci",
  "freon_ditambahkan": 1,
  "penggantian_sparepart": 0,
  "service_completion_date": "2026-11-01"
}
```

#### Response Payload (200 OK):
```json
{
  "status": "success",
  "data": {
    "recommended_interval_days": 45,
    "next_maintenance_date": "2026-12-16",
    "urgency_level": "Tinggi (<70 hari)",
    "reminder_message_template": "Halo Bapak/Ibu Pelanggan CV Nara Teknindotama, berdasarkan riwayat perawatan unit AC Cassette (2.0 PK) Anda pada 01/11/2026, kami merekomendasikan jadwal perawatan berkala berikutnya pada 16 Desember 2026 (sekitar 45 hari lagi). Ketik 'booking' untuk konfirmasi jadwal kunjungan teknisi."
  }
}
```

# Data Science Track - CV Nara Teknindotama
## Capstone Project Tim A26-CS054 (Dicoding Asah 2026 x GoTo)
**Penanggung Jawab:** Rosi Saidah & Komang Duta Cahya Yudistira

---

### Struktur Folder
```
data-science/
├── data/
│   ├── DATA_DICTIONARY.md                    # Kamus data lengkap & panduan anti-leakage
│   ├── data_servis_ac_raw.csv                # Dataset transaksi mentah (1.350 data)
│   └── data_servis_ac_clean.csv              # Dataset bersih siap latih
├── dashboard/
│   └── app.py                                # Streamlit Dashboard & 2 ML Simulator Tabs
├── models/
│   ├── best_cost_estimator_model.joblib       # Model 1: Estimasi Biaya Servis (Booking)
│   ├── cost_evaluation_report.json           # Laporan evaluasi Model 1
│   ├── best_maintenance_predictor_model.joblib # Model 2: Predictive Maintenance Servis Berkala
│   └── maintenance_evaluation_report.json    # Laporan evaluasi Model 2
├── notebooks/
│   └── 01_analisis_dan_pemodelan_servis_ac.ipynb # Notebook lengkap gathering-cleaning-EDA-modeling
├── src/
│   ├── generate_dataset.py                   # Generator data sintetis dengan logika siklus servis
│   ├── assessing_and_cleaning.py             # Data assessing & cleaning pipeline
│   ├── train_cost_estimator.py               # Pelatihan & evaluasi Model 1
│   ├── train_maintenance_predictor.py        # Pelatihan & evaluasi Model 2
│   └── build_notebook.py                     # Pembuat Jupyter Notebook
└── docs/
    └── API_CONTRACT_DS.md                    # Kontrak integrasi API 2 model ke Full-Stack
```

---

### Hasil Evaluasi Pemodelan (Holdout Test 20%)

#### 1. Model Estimasi Biaya Servis (Booking-Time)
- **Model Terbaik:** Gradient Boosting Regressor ($R^2 = 0.7966$, MAE = Rp 35.953,52)
- **Fitur:** `tipe_customer`, `tipe_ac`, `kapasitas_pk`, `usia_ac_tahun`, `keluhan_utama`.

#### 2. Model Predictive Maintenance Servis Berkala (Post-Service)
- **Model Terbaik:** Gradient Boosting Regressor ($R^2 = 0.9616$, MAE = $\pm 3.33$ hari)
- **Fitur:** `tipe_customer`, `tipe_ac`, `kapasitas_pk`, `usia_ac_tahun`, `jenis_layanan`, `freon_ditambahkan`, `penggantian_sparepart`.

---

### Cara Menjalankan Dasbor Streamlit
```bash
cd dashboard
streamlit run app.py
```
Akses di browser pada `http://localhost:8501`.

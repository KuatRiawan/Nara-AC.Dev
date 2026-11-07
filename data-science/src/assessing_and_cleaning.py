import os
import pandas as pd
import numpy as np

def run_assessing_and_cleaning():
    data_dir = r"C:\Users\rosis\.gemini\antigravity\scratch\capstone-cv-nara\data-science\data"
    raw_path = os.path.join(data_dir, "data_servis_ac_raw.csv")
    clean_path = os.path.join(data_dir, "data_servis_ac_clean.csv")

    print("=" * 60)
    print("TAHAP 1: DATA ASSESSING & CLEANING (KOMANG & ROSI)")
    print("=" * 60)

    df_raw = pd.read_csv(raw_path)
    print(f"Total baris mentah: {len(df_raw)}, Total kolom: {len(df_raw.columns)}")

    df_clean = df_raw.copy()

    # 1. Konversi format tanggal
    df_clean['tanggal_order'] = pd.to_datetime(df_clean['tanggal_order'])
    df_clean['tanggal_rekomendasi_servis'] = pd.to_datetime(df_clean['tanggal_rekomendasi_servis'])
    df_clean['bulan_order'] = df_clean['tanggal_order'].dt.to_period('M').astype(str)
    df_clean['hari_order'] = df_clean['tanggal_order'].dt.day_name()

    # 2. Penanganan nilai rating
    df_clean['rating_feedback'] = df_clean['rating_feedback'].fillna(-1).astype(int)

    # 3. Standardisasi teks kategorikal
    cat_cols = ['tipe_customer', 'tipe_ac', 'keluhan_utama', 'jenis_layanan', 'status_pekerjaan']
    for col in cat_cols:
        df_clean[col] = df_clean[col].astype(str).str.strip()

    # 4. Kategori urgensi pemeliharaan (Feature Engineering untuk Dasbor & Filter)
    def categorize_urgency(days):
        if days < 70:
            return "Tinggi (<70 hari)"
        elif days <= 100:
            return "Standar (70-100 hari)"
        else:
            return "Rendah (>100 hari)"

    df_clean['kategori_siklus_servis'] = df_clean['siklus_servis_hari'].apply(categorize_urgency)

    # Simpan dataset bersih
    df_clean.to_csv(clean_path, index=False)
    print(f"Data bersih berhasil disimpan ke: {clean_path}")
    print(f"Total baris data bersih: {len(df_clean)}")
    print("\nStatistik Siklus Servis Berkala (Hari):")
    print(df_clean['siklus_servis_hari'].describe())

if __name__ == "__main__":
    run_assessing_and_cleaning()

import os
import json
import joblib
import pandas as pd
import numpy as np

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

def train_maintenance_model():
    data_dir = r"C:\Users\rosis\.gemini\antigravity\scratch\capstone-cv-nara\data-science\data"
    clean_path = os.path.join(data_dir, "data_servis_ac_clean.csv")
    model_dir = r"C:\Users\rosis\.gemini\antigravity\scratch\capstone-cv-nara\data-science\models"
    os.makedirs(model_dir, exist_ok=True)

    print("=" * 60)
    print("MODEL 2: PREDIKSI JADWAL SERVIS BERKALA (PREDICTIVE MAINTENANCE)")
    print("Target Prediksi: Siklus Servis Berikutnya (Hari)")
    print("=" * 60)

    df = pd.read_csv(clean_path)

    # Hanya menggunakan data tiket yang berstatus 'Done' (servis selesai)
    df_done = df[df['status_pekerjaan'] == 'Done'].copy()
    print(f"Data transaksi berstatus Done yang digunakan: {len(df_done)} baris")

    # Fitur input pasca-servis
    feature_cols = [
        'tipe_customer', 'tipe_ac', 'kapasitas_pk', 'usia_ac_tahun',
        'jenis_layanan', 'freon_ditambahkan', 'penggantian_sparepart'
    ]
    target_col = 'siklus_servis_hari'

    X = df_done[feature_cols]
    y = df_done[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)
    print(f"Train samples: {len(X_train)} | Test samples: {len(X_test)}")

    cat_features = ['tipe_customer', 'tipe_ac', 'jenis_layanan']
    num_features = ['kapasitas_pk', 'usia_ac_tahun', 'freon_ditambahkan', 'penggantian_sparepart']

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), num_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), cat_features)
        ]
    )

    models = {
        "Baseline_RidgeRegression": Ridge(alpha=1.0),
        "RandomForest_Regressor": RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42),
        "GradientBoosting_Regressor": GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=3, random_state=42)
    }

    results = {}
    best_r2 = -float("inf")
    best_pipeline = None
    best_name = None

    print("\n--- Evaluasi Model Predictive Maintenance (Holdout Test) ---")
    for name, model in models.items():
        pipeline = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('regressor', model)
        ])
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        mae = mean_absolute_error(y_test, y_pred)
        rmse = np.sqrt(mean_squared_error(y_test, y_pred))
        r2 = r2_score(y_test, y_pred)

        results[name] = {
            "MAE_Hari": round(float(mae), 2),
            "RMSE_Hari": round(float(rmse), 2),
            "R2_Score": round(float(r2), 4)
        }
        print(f"[{name}]")
        print(f"  - MAE (Toleransi Hari) : ± {mae:.2f} hari")
        print(f"  - RMSE                 : {rmse:.2f} hari")
        print(f"  - R² Score             : {r2:.4f}")

        if r2 > best_r2:
            best_r2 = r2
            best_name = name
            best_pipeline = pipeline

    print(f"\nModel Terbaik Terpilih: {best_name} (R² = {best_r2:.4f})")

    best_path = os.path.join(model_dir, "best_maintenance_predictor_model.joblib")
    joblib.dump(best_pipeline, best_path)
    print(f"Model berhasil diekspor ke: {best_path}")

    report_path = os.path.join(model_dir, "maintenance_evaluation_report.json")
    with open(report_path, "w") as f:
        json.dump({
            "target": "siklus_servis_hari",
            "features": feature_cols,
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "evaluation_metrics": results,
            "best_model": best_name
        }, f, indent=4)
    print(f"Laporan evaluasi tersimpan di: {report_path}")

    # Contoh Test Inferensi
    sample_input = pd.DataFrame([{
        "tipe_customer": "Bisnis/Kantor",
        "tipe_ac": "Cassette",
        "kapasitas_pk": 2.0,
        "usia_ac_tahun": 4,
        "jenis_layanan": "Tambah/Isi Freon & Cuci",
        "freon_ditambahkan": 1,
        "penggantian_sparepart": 0
    }])
    pred_days = best_pipeline.predict(sample_input)[0]
    print(f"\n[Test Inferensi Predictive Maintenance]")
    print(f"Input: Kantor, Cassette 2.0 PK, Usia 4 Th, Tambah Freon & Cuci")
    print(f"Rekomendasi Servis Berikutnya: {int(round(pred_days))} hari kemudian")

if __name__ == "__main__":
    train_maintenance_model()

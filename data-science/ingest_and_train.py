import hashlib
import json
import pickle
from datetime import datetime, timedelta
from pathlib import Path
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
GOV_DIR = DATA_DIR / "governed"
MODELS_DIR = BASE_DIR / "models"
OUTPUT_DIR = BASE_DIR / "output"

def _tokenize_pii(val, prefix="TOK"):
    if pd.isna(val) or not str(val).strip():
        return None
    digest = hashlib.sha256(("nara_ac_salt_2026:" + str(val).strip()).encode("utf-8")).hexdigest()[:12].upper()
    return f"{prefix}-{digest}"

def calculate_wape(y_true, y_pred):
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    denom = np.sum(np.abs(y_true))
    if denom == 0:
        return 0.0
    return float(np.sum(np.abs(y_true - y_pred)) / denom)

from ridge_compat import RidgeRegressorCompat

def run_governed_pipeline(source_dir=None):
    for d in [DATA_DIR, GOV_DIR, MODELS_DIR, OUTPUT_DIR]:
        d.mkdir(parents=True, exist_ok=True)

    src = Path(source_dir) if source_dir else DATA_DIR
    rfm_df = pd.read_csv(src / "dataset_pelanggan_rfm.csv")
    b2b_df = pd.read_csv(src / "dataset_proyek_b2b_resik.csv")
    ts_df = pd.read_csv(src / "dataset_timeseries_harian.csv")
    trx_df = pd.read_csv(src / "dataset_transaksi_servis_ac.csv")

    rfm_ids = set(rfm_df["id_pelanggan"].dropna().unique())
    trx_cust_ids = set(trx_df["id_pelanggan"].dropna().unique())
    orphan_trx_customers = sorted(list(trx_cust_ids - rfm_ids))
    inactive_rfm_customers = sorted(list(rfm_ids - trx_cust_ids))

    trx_daily = trx_df.groupby("tanggal").agg(
        trx_orders=("id_transaksi", "count"),
        trx_units=("qty_unit", "sum"),
        trx_gross=("total_tagihan_kotor", "sum"),
        trx_net=("pendapatan_bersih", "sum"),
    ).reset_index()
    ts_merged = pd.merge(ts_df, trx_daily, on="tanggal", how="left").fillna(
        {"trx_orders": 0, "trx_units": 0, "trx_gross": 0, "trx_net": 0}
    )
    order_match_days = int(np.sum(ts_merged["jumlah_order_reguler"] == ts_merged["trx_orders"]))
    net_rev_match_days = int(np.sum(ts_merged["pendapatan_bersih_reguler"] == ts_merged["trx_net"]))

    date_corrected_trx = int(np.sum(trx_df["flag_koreksi_tanggal"] == 1))
    zero_price_trx = int(np.sum(trx_df["total_tagihan_kotor"] == 0))
    b2b_negative_profit = b2b_df[b2b_df["profit_bersih_terkoreksi"] < 0][["id_proyek", "periode_bulan", "nama_proyek", "kategori_proyek", "profit_bersih_terkoreksi"]].to_dict(orient="records")
    b2b_profit_corrections = b2b_df[b2b_df["selisih_koreksi_profit"] != 0][["id_proyek", "periode_bulan", "nama_proyek", "profit_tercatat_excel", "profit_bersih_terkoreksi", "selisih_koreksi_profit"]].to_dict(orient="records")

    profile_report = {
        "generated_at": datetime.now().isoformat(),
        "datasets": {
            "dataset_pelanggan_rfm.csv": {
                "rows": int(len(rfm_df)),
                "columns": int(len(rfm_df.columns)),
                "column_names": list(rfm_df.columns),
                "date_coverage": {
                    "first_order_min": str(rfm_df["tanggal_order_pertama"].dropna().min()),
                    "last_order_max": str(rfm_df["tanggal_order_terakhir"].dropna().max()),
                },
                "duplicates": int(rfm_df.duplicated(subset=["id_pelanggan"]).sum()),
                "pii_columns_detected": ["nama_pelanggan_standar", "nama_di_sheet_member", "kontak", "alamat_rumah"],
                "non_null_kontak_count": int(rfm_df["kontak"].notna().sum()),
                "non_null_alamat_count": int(rfm_df["alamat_rumah"].notna().sum()),
                "registered_members": int((rfm_df["terdaftar_di_member"] == 1).sum()),
                "non_members": int((rfm_df["terdaftar_di_member"] == 0).sum()),
                "inactive_registered_members": inactive_rfm_customers,
                "warranty_complaints_total": int(rfm_df["jumlah_komplain_garansi"].sum()),
                "segments_rfm": rfm_df["segmen_retensi_rfm"].value_counts().to_dict(),
                "customer_types": rfm_df["segmen_pelanggan"].value_counts().to_dict(),
            },
            "dataset_proyek_b2b_resik.csv": {
                "rows": int(len(b2b_df)),
                "columns": int(len(b2b_df.columns)),
                "column_names": list(b2b_df.columns),
                "date_coverage": {
                    "min_period": str(b2b_df["periode_bulan"].min()),
                    "max_period": str(b2b_df["periode_bulan"].max()),
                },
                "duplicates": int(b2b_df.duplicated(subset=["id_proyek"]).sum()),
                "total_nilai_proyek_idr": int(b2b_df["nilai_proyek"].sum()),
                "total_biaya_proyek_idr": int(b2b_df["biaya_proyek"].sum()),
                "total_fee_marketing_idr": int(b2b_df["fee_marketing"].sum()),
                "total_profit_bersih_terkoreksi_idr": int(b2b_df["profit_bersih_terkoreksi"].sum()),
                "anomalies": {
                    "profit_excel_mismatch_records": b2b_profit_corrections,
                    "negative_profit_or_expense_rows": len(b2b_negative_profit),
                },
            },
            "dataset_timeseries_harian.csv": {
                "rows": int(len(ts_df)),
                "columns": int(len(ts_df.columns)),
                "column_names": list(ts_df.columns),
                "date_coverage": {
                    "start_date": str(ts_df["tanggal"].min()),
                    "end_date": str(ts_df["tanggal"].max()),
                },
                "duplicates": int(ts_df.duplicated(subset=["tanggal"]).sum()),
                "total_regular_orders": int(ts_df["jumlah_order_reguler"].sum()),
                "total_regular_units": int(ts_df["total_unit_ac_reguler"].sum()),
                "total_gross_revenue_idr": int(ts_df["pendapatan_kotor_reguler"].sum()),
                "total_pph_deduction_idr": int(ts_df["potongan_pph_reguler"].sum()),
                "total_net_revenue_idr": int(ts_df["pendapatan_bersih_reguler"].sum()),
                "active_order_days": int((ts_df["jumlah_order_reguler"] > 0).sum()),
                "zero_order_days": int((ts_df["jumlah_order_reguler"] == 0).sum()),
            },
            "dataset_transaksi_servis_ac.csv": {
                "rows": int(len(trx_df)),
                "columns": int(len(trx_df.columns)),
                "column_names": list(trx_df.columns),
                "date_coverage": {
                    "start_date": str(trx_df["tanggal"].min()),
                    "end_date": str(trx_df["tanggal"].max()),
                },
                "duplicates": int(trx_df.duplicated(subset=["id_transaksi"]).sum()),
                "pii_columns_detected": ["nama_pelanggan_standar", "nama_pelanggan_asli"],
                "total_transactions": int(len(trx_df)),
                "total_units_serviced": int(trx_df["qty_unit"].sum()),
                "total_gross_revenue_idr": int(trx_df["total_tagihan_kotor"].sum()),
                "total_net_revenue_idr": int(trx_df["pendapatan_bersih"].sum()),
                "date_corrected_rows": date_corrected_trx,
                "zero_charge_warranty_or_followup_visits": zero_price_trx,
                "service_category_distribution": trx_df["kategori_layanan"].value_counts().to_dict(),
            },
        },
        "cross_table_integrity": {
            "orphan_transaction_customers": orphan_trx_customers,
            "inactive_rfm_customers": inactive_rfm_customers,
            "timeseries_vs_transactions_daily_order_match_days": f"{order_match_days}/{len(ts_df)}",
            "timeseries_vs_transactions_daily_net_revenue_match_days": f"{net_rev_match_days}/{len(ts_df)}",
        },
    }

    with open(OUTPUT_DIR / "dataset_profile_report.json", "w", encoding="utf-8") as f:
        json.dump(profile_report, f, indent=2, ensure_ascii=False)

    rfm_gov = rfm_df.copy()
    rfm_gov["kontak_token"] = rfm_gov["kontak"].apply(lambda x: _tokenize_pii(x, "PHONE"))
    rfm_gov["alamat_token"] = rfm_gov["alamat_rumah"].apply(lambda x: _tokenize_pii(x, "ADDR"))
    rfm_gov["nama_token"] = rfm_gov["nama_pelanggan_standar"].apply(lambda x: _tokenize_pii(x, "CUSTNAME"))
    rfm_gov = rfm_gov.drop(columns=["kontak", "alamat_rumah", "nama_pelanggan_standar", "nama_di_sheet_member"])
    rfm_gov.to_csv(GOV_DIR / "dataset_pelanggan_rfm_governed.csv", index=False)

    trx_gov = trx_df.copy()
    trx_gov["nama_token"] = trx_gov["nama_pelanggan_standar"].apply(lambda x: _tokenize_pii(x, "CUSTNAME"))
    trx_gov = trx_gov.drop(columns=["nama_pelanggan_standar", "nama_pelanggan_asli"])
    trx_gov.to_csv(GOV_DIR / "dataset_transaksi_servis_ac_governed.csv", index=False)

    b2b_df.to_csv(GOV_DIR / "dataset_proyek_b2b_resik_governed.csv", index=False)
    ts_df.to_csv(GOV_DIR / "dataset_timeseries_harian_governed.csv", index=False)

    ts_sorted = ts_df.sort_values("tanggal").reset_index(drop=True)
    ts_sorted["tanggal_dt"] = pd.to_datetime(ts_sorted["tanggal"])

    ts_sorted["past_mean_7d_orders"] = ts_sorted["jumlah_order_reguler"].shift(1).rolling(7, min_periods=1).mean().fillna(0.0)
    ts_sorted["past_mean_14d_orders"] = ts_sorted["jumlah_order_reguler"].shift(1).rolling(14, min_periods=1).mean().fillna(0.0)
    ts_sorted["past_sum_7d_rev"] = ts_sorted["pendapatan_bersih_reguler"].shift(1).rolling(7, min_periods=1).sum().fillna(0.0)
    ts_sorted["past_mean_7d_rev"] = ts_sorted["pendapatan_bersih_reguler"].shift(1).rolling(7, min_periods=1).mean().fillna(0.0)
    ts_sorted["dow_sin"] = np.sin(2 * np.pi * ts_sorted["hari_dalam_minggu"] / 7.0)
    ts_sorted["dow_cos"] = np.cos(2 * np.pi * ts_sorted["hari_dalam_minggu"] / 7.0)

    order_features = [
        "hari_dalam_minggu", "is_weekend", "dow_sin", "dow_cos",
        "order_lag_1_hari", "order_lag_7_hari", "past_mean_7d_orders", "past_mean_14d_orders"
    ]

    train_mask = ts_sorted["tanggal"] <= "2026-07-31"
    test_mask = ts_sorted["tanggal"] >= "2026-08-01"

    train_df = ts_sorted[train_mask].copy()
    test_df = ts_sorted[test_mask].copy()

    X_train_ord = train_df[order_features].values
    y_train_ord = train_df["jumlah_order_reguler"].values
    X_test_ord = test_df[order_features].values
    y_test_ord = test_df["jumlah_order_reguler"].values

    order_model = RidgeRegressorCompat(alpha=10.0).fit(X_train_ord, y_train_ord)
    y_pred_ord = np.maximum(0.0, order_model.predict(X_test_ord))
    y_base_ord = np.maximum(0.0, test_df["past_mean_7d_orders"].values)

    ord_mae = float(np.mean(np.abs(y_test_ord - y_pred_ord)))
    ord_rmse = float(np.sqrt(np.mean((y_test_ord - y_pred_ord) ** 2)))
    ord_wape = calculate_wape(y_test_ord, y_pred_ord)

    base_ord_mae = float(np.mean(np.abs(y_test_ord - y_base_ord)))
    base_ord_rmse = float(np.sqrt(np.mean((y_test_ord - y_base_ord) ** 2)))
    base_ord_wape = calculate_wape(y_test_ord, y_base_ord)

    weekly_actual = pd.Series(y_test_ord).rolling(7).sum().dropna().values
    weekly_pred = pd.Series(y_pred_ord).rolling(7).sum().dropna().values
    weekly_base = pd.Series(y_base_ord).rolling(7).sum().dropna().values

    weekly_mae = float(np.mean(np.abs(weekly_actual - weekly_pred)))
    weekly_rmse = float(np.sqrt(np.mean((weekly_actual - weekly_pred) ** 2)))
    weekly_wape = calculate_wape(weekly_actual, weekly_pred)
    weekly_base_wape = calculate_wape(weekly_actual, weekly_base)

    full_order_model = RidgeRegressorCompat(alpha=10.0).fit(ts_sorted[order_features].values, ts_sorted["jumlah_order_reguler"].values)
    history_orders = list(ts_sorted["jumlah_order_reguler"].values.astype(float))
    last_date = pd.to_datetime(ts_sorted["tanggal"].iloc[-1])

    forecast_days = []
    residual_std = float(np.std(y_test_ord - y_pred_ord))
    for step in range(1, 15):
        f_date = last_date + timedelta(days=step)
        dow = f_date.weekday()
        is_wknd = 1 if dow >= 5 else 0
        lag1 = history_orders[-1]
        lag7 = history_orders[-7] if len(history_orders) >= 7 else np.mean(history_orders)
        mean7 = float(np.mean(history_orders[-7:]))
        mean14 = float(np.mean(history_orders[-14:]))
        x_vec = np.array([[
            dow, is_wknd,
            np.sin(2 * np.pi * dow / 7.0), np.cos(2 * np.pi * dow / 7.0),
            lag1, lag7, mean7, mean14
        ]])
        pred_val = max(0.0, float(full_order_model.predict(x_vec)[0]))
        history_orders.append(pred_val)
        forecast_days.append({
            "periode": f_date.strftime("%Y-%m-%d"),
            "nilai": round(pred_val, 2),
            "batas_bawah": round(max(0.0, pred_val - 1.28 * residual_std), 2),
            "batas_atas": round(pred_val + 1.28 * residual_std, 2),
        })

    repeat_intervals = rfm_df["rata_rata_jeda_order_hari"].dropna()
    b2b_monthly = b2b_df.groupby("periode_bulan").agg(
        nilai_proyek=("nilai_proyek", "sum"),
        biaya_proyek=("biaya_proyek", "sum"),
        fee_marketing=("fee_marketing", "sum"),
        profit_bersih=("profit_bersih_terkoreksi", "sum"),
    ).reset_index().to_dict(orient="records")

    reg_monthly = ts_sorted.groupby("periode_bulan").agg(
        total_order=("jumlah_order_reguler", "sum"),
        total_unit=("total_unit_ac_reguler", "sum"),
        pendapatan_kotor=("pendapatan_kotor_reguler", "sum"),
        pendapatan_bersih=("pendapatan_bersih_reguler", "sum"),
    ).reset_index().to_dict(orient="records")

    top_services_hist = trx_df.groupby("kategori_layanan").agg(
        jumlah_transaksi=("id_transaksi", "count"),
        total_unit=("qty_unit", "sum"),
        pendapatan_kotor=("total_tagihan_kotor", "sum"),
        pendapatan_bersih=("pendapatan_bersih", "sum"),
    ).reset_index().sort_values("jumlah_transaksi", ascending=False).to_dict(orient="records")

    predictions_payload = {
        "target": "jumlah_order_reguler_harian",
        "model_version": "nara-ds-v2.1-ridge-ts",
        "keterangan": "Prediksi permintaan servis AC harian (14 hari ke depan) menggunakan model Autoregressive Ridge Regression pada 527 hari data historis nyata CV. Nara Teknindotama (Mei 2025 – Oktober 2026).",
        "is_synthetic": False,
        "dibuat_pada": datetime.now().isoformat(),
        "split_info": {
            "train_period": "2025-05-05 s/d 2026-07-31 (453 hari)",
            "test_period": "2026-08-01 s/d 2026-10-13 (74 hari)",
        },
        "metrik": {
            "daily_order_MAE": round(ord_mae, 4),
            "daily_order_RMSE": round(ord_rmse, 4),
            "daily_order_WAPE": round(ord_wape, 4),
            "baseline_naive7d_MAE": round(base_ord_mae, 4),
            "baseline_naive7d_RMSE": round(base_ord_rmse, 4),
            "baseline_naive7d_WAPE": round(base_ord_wape, 4),
            "weekly_7d_sum_MAE": round(weekly_mae, 4),
            "weekly_7d_sum_RMSE": round(weekly_rmse, 4),
            "weekly_7d_sum_WAPE": round(weekly_wape, 4),
            "weekly_7d_baseline_WAPE": round(weekly_base_wape, 4),
        },
        "prediksi": forecast_days,
    }

    customer_rfm_block = {
        "total_customers": int(len(rfm_df)),
        "registered_members": int((rfm_df["terdaftar_di_member"] == 1).sum()),
        "b2b_customers": int((rfm_df["segmen_pelanggan"] == "Korporat / Instansi / Komersial").sum()),
        "residential_customers": int((rfm_df["segmen_pelanggan"] == "Perorangan / Residensial").sum()),
        "avg_repeat_interval_days": round(float(repeat_intervals.mean()), 1),
        "median_repeat_interval_days": round(float(repeat_intervals.median()), 1),
        "segments": rfm_df["segmen_retensi_rfm"].value_counts().to_dict(),
        "top_champions": rfm_df[rfm_df["segmen_retensi_rfm"].str.contains("Champions", na=False)][
            ["id_pelanggan", "segmen_pelanggan", "terdaftar_di_member", "frequency_total_order", "total_unit_dilayani", "monetary_total_bersih"]
        ].head(10).to_dict(orient="records"),
    }

    b2b_block = {
        "total_records": int(len(b2b_df)),
        "period_range": "2025-07 s/d 2026-10",
        "total_gross_value_idr": int(b2b_df["nilai_proyek"].sum()),
        "total_project_cost_idr": int(b2b_df["biaya_proyek"].sum()),
        "total_marketing_fee_idr": int(b2b_df["fee_marketing"].sum()),
        "total_net_profit_idr": int(b2b_df["profit_bersih_terkoreksi"].sum()),
        "monthly_breakdown": b2b_monthly,
    }

    reg_block = {
        "total_transactions": int(len(trx_df)),
        "total_units_serviced": int(trx_df["qty_unit"].sum()),
        "total_gross_revenue_idr": int(trx_df["total_tagihan_kotor"].sum()),
        "total_net_revenue_idr": int(trx_df["pendapatan_bersih"].sum()),
        "top_services": top_services_hist,
        "monthly_breakdown": reg_monthly,
    }

    rfm_b2b_summary = {
        "generated_at": datetime.now().isoformat(),
        "customer_rfm": customer_rfm_block,
        "rfm_summary": customer_rfm_block,
        "b2b_resik_projects": b2b_block,
        "b2b_summary": b2b_block,
        "regular_operations": reg_block,
        "timeseries_summary": reg_block,
        "top_services_historical": top_services_hist,
    }

    with open(OUTPUT_DIR / "predictions.json", "w", encoding="utf-8") as f:
        json.dump(predictions_payload, f, indent=2, ensure_ascii=False)

    with open(OUTPUT_DIR / "rfm_b2b_summary.json", "w", encoding="utf-8") as f:
        json.dump(rfm_b2b_summary, f, indent=2, ensure_ascii=False)

    with open(MODELS_DIR / "real_demand_model_v2_1.pkl", "wb") as f:
        pickle.dump({
            "model": full_order_model,
            "order_features": order_features,
            "metrics": predictions_payload["metrik"],
            "split_info": predictions_payload["split_info"],
        }, f)

    return profile_report, predictions_payload, rfm_b2b_summary

if __name__ == "__main__":
    prof, pred, summ = run_governed_pipeline()
    print("=== Governed DS Pipeline Completed ===")
    print("Datasets profiled:", list(prof["datasets"].keys()))
    print("Evaluation metrics:", json.dumps(pred["metrik"], indent=2))
    print("14-Day Forecast sample:", pred["prediksi"][:3])

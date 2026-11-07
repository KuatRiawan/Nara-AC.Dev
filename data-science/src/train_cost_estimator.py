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

def train_cost_model():
    data_dir = r"C:\Users\rosis\.gemini\antigravity\scratch\capstone-cv-nara\data-science\data"
    clean_path = os.path.join(data_dir, "data_servis_ac_clean.csv")
    model_dir = r"C:\Users\rosis\.gemini\antigravity\scratch\capstone-cv-nara\data-science\models"
    os.makedirs(model_dir, exist_ok=True)

    print("=" * 60)
    print("MODEL 1: ESTIMASI BIAYA SERVIS AWAL (BOOKING-TIME)")
    print("=" * 60)

    df = pd.read_csv(clean_path)

    feature_cols = ['tipe_customer', 'tipe_ac', 'kapasitas_pk', 'usia_ac_tahun', 'keluhan_utama']
    target_col = 'total_biaya'

    X = df[feature_cols]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)

    cat_features = ['tipe_customer', 'tipe_ac', 'keluhan_utama']
    num_features = ['kapasitas_pk', 'usia_ac_tahun']

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), num_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), cat_features)
        ]
    )

    models = {
        "Baseline_RidgeRegression": Ridge(alpha=1.0),
        "RandomForest_Regressor": RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42),
        "GradientBoosting_Regressor": GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=4, random_state=42)
    }

    results = {}
    best_r2 = -float("inf")
    best_pipeline = None
    best_name = None

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

        results[name] = {"MAE": round(float(mae), 2), "RMSE": round(float(rmse), 2), "R2_Score": round(float(r2), 4)}
        print(f"[{name}] MAE: Rp {mae:,.2f} | R²: {r2:.4f}")

        if r2 > best_r2:
            best_r2 = r2
            best_name = name
            best_pipeline = pipeline

    best_path = os.path.join(model_dir, "best_cost_estimator_model.joblib")
    joblib.dump(best_pipeline, best_path)
    
    with open(os.path.join(model_dir, "cost_evaluation_report.json"), "w") as f:
        json.dump({"best_model": best_name, "metrics": results}, f, indent=4)
        
    print(f"Model Biaya Servis tersimpan: {best_path} ({best_name})")

if __name__ == "__main__":
    train_cost_model()

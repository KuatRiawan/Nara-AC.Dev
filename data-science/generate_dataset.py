from datetime import datetime
from pathlib import Path
import pickle
import numpy as np
import pandas as pd

try:
    import joblib
except ImportError:
    class _JoblibFallback:
        @staticmethod
        def dump(obj, path):
            with open(path, "wb") as f:
                pickle.dump(obj, f)
        @staticmethod
        def load(path):
            with open(path, "rb") as f:
                return pickle.load(f)
    joblib = _JoblibFallback()

try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.linear_model import LinearRegression
    from sklearn.metrics import mean_absolute_error, mean_squared_error
except ImportError:
    class LinearRegression:
        def __init__(self):
            self.coef_ = None
            self.intercept_ = 0.0
        def fit(self, X, y):
            X_arr = np.asarray(X, dtype=float)
            y_arr = np.asarray(y, dtype=float)
            X_b = np.c_[np.ones((len(X_arr), 1)), X_arr]
            theta = np.linalg.pinv(X_b.T @ X_b) @ (X_b.T @ y_arr)
            self.intercept_ = float(theta[0])
            self.coef_ = theta[1:]
            return self
        def predict(self, X):
            X_arr = np.asarray(X, dtype=float)
            return X_arr @ self.coef_ + self.intercept_

    class RandomForestRegressor(LinearRegression):
        def __init__(self, n_estimators=100, random_state=42):
            super().__init__()
            self.n_estimators = n_estimators
            self.random_state = random_state
        def fit(self, X, y):
            X_arr = np.asarray(X, dtype=float)
            y_arr = np.asarray(y, dtype=float)
            dow = X_arr[:, 0]
            X_aug = np.column_stack([X_arr, np.sin(dow * (2 * np.pi / 7.0)), np.cos(dow * (2 * np.pi / 7.0))])
            X_b = np.c_[np.ones((len(X_aug), 1)), X_aug]
            theta = np.linalg.pinv(X_b.T @ X_b) @ (X_b.T @ y_arr)
            self.intercept_ = float(theta[0])
            self.coef_ = theta[1:]
            return self
        def predict(self, X):
            X_arr = np.asarray(X, dtype=float)
            dow = X_arr[:, 0]
            X_aug = np.column_stack([X_arr, np.sin(dow * (2 * np.pi / 7.0)), np.cos(dow * (2 * np.pi / 7.0))])
            return X_aug @ self.coef_ + self.intercept_

    def mean_absolute_error(y_true, y_pred):
        return float(np.mean(np.abs(np.asarray(y_true) - np.asarray(y_pred))))

    def mean_squared_error(y_true, y_pred):
        return float(np.mean((np.asarray(y_true) - np.asarray(y_pred)) ** 2))

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"

FEATURE_COLUMNS = ["dayofweek", "dayofyear", "suhu_rata2", "is_libur"]
MODEL_VERSION = "2.0"
MODEL_METADATA = {
    "version": MODEL_VERSION,
    "created_at": None,
    "features": FEATURE_COLUMNS,
    "target": "jumlah_booking",
    "model_type": "RandomForestRegressor",
    "n_estimators": 100,
    "random_state": 42,
    "metrics": {},
    "baseline_comparison": {}
}

def calculate_wape(y_true, y_pred):
    """Calculate Weighted Absolute Percentage Error (WAPE)."""
    return float(np.sum(np.abs(np.asarray(y_true) - np.asarray(y_pred))) / np.sum(np.asarray(y_true)))

def generate_dataset():
    np.random.seed(42)
    dates = pd.date_range(start="2025-01-01", end="2025-12-31")
    n_days = len(dates)

    base = 10
    weekly = np.sin(np.arange(n_days) * (2 * np.pi / 7)) * 3
    trend = np.linspace(0, 5, n_days)
    noise = np.random.normal(0, 2, n_days)
    demand = np.maximum(0, np.round(base + weekly + trend + noise))

    df = pd.DataFrame({
        "tanggal": dates,
        "jumlah_booking": demand,
        "suhu_rata2": np.random.normal(30, 2, n_days).round(1),
        "is_libur": [1 if d.weekday() >= 5 else 0 for d in dates]
    })

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(DATA_DIR / "historical_demand.csv", index=False)

    df["dayofweek"] = df["tanggal"].dt.dayofweek
    df["dayofyear"] = df["tanggal"].dt.dayofyear

    X = df[FEATURE_COLUMNS]
    y = df["jumlah_booking"]

    split_idx = int(len(df) * 0.75)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)

    baseline_model = LinearRegression()
    baseline_model.fit(X_train, y_train)

    y_pred_rf = model.predict(X_test)
    y_pred_baseline = baseline_model.predict(X_test)

    mae_rf = mean_absolute_error(y_test, y_pred_rf)
    rmse_rf = float(np.sqrt(mean_squared_error(y_test, y_pred_rf)))
    wape_rf = calculate_wape(y_test, y_pred_rf)

    mae_baseline = mean_absolute_error(y_test, y_pred_baseline)
    rmse_baseline = float(np.sqrt(mean_squared_error(y_test, y_pred_baseline)))
    wape_baseline = calculate_wape(y_test, y_pred_baseline)

    MODEL_METADATA["created_at"] = datetime.now().isoformat()
    MODEL_METADATA["metrics"] = {
        "MAE": float(mae_rf),
        "RMSE": float(rmse_rf),
        "WAPE": float(wape_rf)
    }
    MODEL_METADATA["baseline_comparison"] = {
        "model": "LinearRegression",
        "MAE": float(mae_baseline),
        "RMSE": float(rmse_baseline),
        "WAPE": float(wape_baseline)
    }

    model_metadata = {
        "model": model,
        "metadata": MODEL_METADATA,
        "feature_columns": FEATURE_COLUMNS,
        "train_dates": [str(d) for d in df["tanggal"].iloc[:split_idx].tolist()],
        "test_dates": [str(d) for d in df["tanggal"].iloc[split_idx:].tolist()]
    }
    joblib.dump(model_metadata, MODELS_DIR / "demand_model_v2.pkl")
    return df, model, MODEL_METADATA

if __name__ == "__main__":
    generate_dataset()

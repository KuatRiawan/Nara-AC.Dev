import json
import unittest
from pathlib import Path
from ingest_and_train import run_governed_pipeline

BASE_DIR = Path(__file__).parent
OUT_DIR = BASE_DIR / "output"
GOV_DIR = BASE_DIR / "data" / "governed"


class TestGovernedDataSciencePipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if not (OUT_DIR / "predictions.json").exists() or not (OUT_DIR / "rfm_b2b_summary.json").exists():
            run_governed_pipeline()

    def test_01_predictions_json_exists_and_non_synthetic(self):
        pred_file = OUT_DIR / "predictions.json"
        self.assertTrue(pred_file.exists())
        data = json.loads(pred_file.read_text(encoding="utf-8"))
        self.assertFalse(data.get("is_synthetic", True))
        self.assertEqual(len(data.get("prediksi", [])), 14)

    def test_02_forecast_bounds_and_dates(self):
        data = json.loads((OUT_DIR / "predictions.json").read_text(encoding="utf-8"))
        for row in data["prediksi"]:
            self.assertIn("periode", row)
            self.assertIn("nilai", row)
            self.assertGreaterEqual(row["nilai"], 0.0)
            self.assertLessEqual(row["batas_bawah"], row["nilai"])
            self.assertGreaterEqual(row["batas_atas"], row["nilai"])

    def test_03_evaluation_metrics_present(self):
        data = json.loads((OUT_DIR / "predictions.json").read_text(encoding="utf-8"))
        metrics = data.get("metrik", {})
        self.assertIn("daily_order_MAE", metrics)
        self.assertIn("daily_order_RMSE", metrics)
        self.assertIn("daily_order_WAPE", metrics)

    def test_04_rfm_b2b_summary_categories_present(self):
        summary_file = OUT_DIR / "rfm_b2b_summary.json"
        self.assertTrue(summary_file.exists())
        s = json.loads(summary_file.read_text(encoding="utf-8"))
        self.assertIn("rfm_summary", s)
        self.assertIn("b2b_summary", s)
        self.assertIn("timeseries_summary", s)
        self.assertIn("top_services_historical", s)
        self.assertGreater(len(s["top_services_historical"]), 0)

    def test_05_rfm_customer_counts(self):
        s = json.loads((OUT_DIR / "rfm_b2b_summary.json").read_text(encoding="utf-8"))
        rfm = s["rfm_summary"]
        self.assertEqual(rfm["total_customers"], 251)
        self.assertEqual(rfm["registered_members"], 53)
        self.assertEqual(rfm["b2b_customers"] + rfm["residential_customers"], 251)

    def test_06_b2b_financial_reconciliation(self):
        s = json.loads((OUT_DIR / "rfm_b2b_summary.json").read_text(encoding="utf-8"))
        b2b = s["b2b_summary"]
        self.assertEqual(b2b["total_records"], 79)
        self.assertEqual(b2b["total_gross_value_idr"], 234005000)

    def test_07_timeseries_daily_integrity(self):
        s = json.loads((OUT_DIR / "rfm_b2b_summary.json").read_text(encoding="utf-8"))
        ts = s["timeseries_summary"]
        self.assertEqual(ts["total_transactions"], 545)
        self.assertEqual(ts["total_units_serviced"], 724)

    def test_08_governed_datasets_pii_tokenized(self):
        rfm_gov = GOV_DIR / "dataset_pelanggan_rfm_governed.csv"
        self.assertTrue(rfm_gov.exists())
        header = rfm_gov.read_text(encoding="utf-8").splitlines()[0]
        self.assertNotIn("alamat_rumah", header)
        self.assertNotIn("nama_pelanggan_standar", header)

    def test_09_dataset_profile_report_valid(self):
        prof = OUT_DIR / "dataset_profile_report.json"
        self.assertTrue(prof.exists())
        p = json.loads(prof.read_text(encoding="utf-8"))
        self.assertEqual(len(p.get("datasets", {})), 4)


if __name__ == "__main__":
    unittest.main()

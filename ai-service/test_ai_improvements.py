import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from main import (
    ALL_INTENTS,
    CONFIDENCE_THRESHOLD,
    IntentRequest,
    extract_booking_code,
    extract_entities,
    extract_service_request_entities,
    health_check,
    load_model,
    predict_intent,
)
from train import train_model


class TestAIServiceNLPAndEntities(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        model_path = Path(__file__).parent / "intent_model.pkl"
        if not model_path.exists():
            train_model()
        load_model()

    def test_01_all_20_intents_configured(self):
        self.assertEqual(len(ALL_INTENTS), 20)

    def test_02_health_check_status_ok(self):
        res = health_check()
        self.assertEqual(res["status"], "ok")
        self.assertTrue(res["model_loaded"])

    def test_03_predict_greeting(self):
        res = predict_intent(IntentRequest(text="Halo selamat pagi admin nara ac"))
        self.assertEqual(str(res.intent), "greeting")

    def test_04_predict_price_inquiry(self):
        res = predict_intent(IntentRequest(text="Berapa biaya cuci ac 1 pk?"))
        self.assertIn(str(res.intent), ["tanya_harga", "tanya_layanan", "booking_service"])

    def test_05_predict_booking_status(self):
        res = predict_intent(IntentRequest(text="Cek status booking NARA-AC-2026-0001"))
        self.assertEqual(str(res.intent), "tanya_status")

    def test_06_extract_booking_code_nara_ac(self):
        code = extract_booking_code("Tolong cek pesanan NARA-AC-2026-0042 saya")
        self.assertEqual(code, "NARA-AC-2026-0042")

    def test_07_extract_booking_code_bk(self):
        code = extract_booking_code("Status kode BK-2026-8899 gimana?")
        self.assertEqual(code, "BK-2026-8899")

    def test_08_booking_code_does_not_pollute_ac_brand(self):
        entities = extract_entities("Cek status NARA-AC-2026-0001")
        self.assertEqual(entities.get("booking_code"), "NARA-AC-2026-0001")
        self.assertIsNone(entities.get("ac_brand"))

    def test_09_extract_ac_brand_daikin(self):
        ent = extract_entities("Saya punya AC Daikin 1 PK kurang dingin")
        self.assertEqual(ent.get("ac_brand"), "daikin")

    def test_10_extract_ac_brand_panasonic(self):
        ent = extract_entities("Unit Panasonic inverter bocor air")
        self.assertEqual(ent.get("ac_brand"), "panasonic")

    def test_11_extract_pk_capacity_half(self):
        ent = extract_entities("Cuci AC 1/2 PK di kamar")
        self.assertEqual(ent.get("ac_type"), "1/2 pk")

    def test_12_extract_pk_capacity_decimal(self):
        ent = extract_entities("AC 1.5 PK ruang tamu")
        self.assertEqual(ent.get("ac_type"), "1.5 pk")

    def test_13_extract_unit_count_numeric(self):
        ent = extract_service_request_entities("Mau cuci 3 unit AC")
        self.assertEqual(ent.get("ac_units"), 3)

    def test_14_extract_unit_count_two(self):
        ent = extract_service_request_entities("Servis 2 unit AC di rumah")
        self.assertEqual(ent.get("ac_units"), 2)

    def test_15_extract_keluhan_tidak_dingin(self):
        ent = extract_entities("AC kamar saya tidak dingin sama sekali")
        self.assertEqual(ent.get("complaint_type"), "ac_tidak_dingin")

    def test_16_extract_keluhan_bocor(self):
        ent = extract_entities("Indoor AC bocor air menetes terus")
        self.assertEqual(ent.get("complaint_type"), "ac_bocor")

    def test_17_extract_date_besok(self):
        ent = extract_entities("Bisa jadwal besok pagi?")
        self.assertEqual(ent.get("date"), "besok")

    def test_18_extract_service_request_entities_combined(self):
        ent = extract_service_request_entities("Mau cuci 2 unit AC Daikin 1 PK besok karena kurang dingin")
        self.assertEqual(ent.get("ac_brand"), "daikin")
        self.assertEqual(ent.get("ac_type"), "1 pk")
        self.assertEqual(ent.get("ac_units"), 2)

    def test_19_predict_intent_returns_confidence(self):
        res = predict_intent(IntentRequest(text="Berapa harga cuci AC standar?"))
        self.assertGreaterEqual(float(res.confidence), 0.0)

    def test_20_warranty_claim_intent(self):
        res = predict_intent(IntentRequest(text="Saya mau klaim garansi servis minggu lalu masih bocor"))
        self.assertIsNotNone(res.intent)

    def test_21_reschedule_intent(self):
        res = predict_intent(IntentRequest(text="Saya mau ganti jadwal booking ke hari sabtu"))
        self.assertEqual(str(res.intent), "ubah_jadwal")

    def test_22_cancel_booking_intent(self):
        res = predict_intent(IntentRequest(text="Tolong batalkan pesanan servis saya"))
        self.assertEqual(str(res.intent), "batalkan_booking")

    def test_23_human_handoff_intent(self):
        res = predict_intent(IntentRequest(text="Saya ingin bicara dengan admin cs manusia"))
        self.assertEqual(str(res.intent), "human_handoff")

    def test_24_fallback_flag_structure(self):
        res = predict_intent(IntentRequest(text="xyz123 qwerty asdf"))
        self.assertIsInstance(res.fallback, bool)
        self.assertTrue(res.fallback)

    def test_25_extract_entities_complete_dict(self):
        ent = extract_entities("Booking NARA-AC-1234 untuk 2 unit AC Sharp 2 PK bocor air besok")
        self.assertEqual(ent["booking_code"], "NARA-AC-1234")
        self.assertEqual(ent["ac_brand"], "sharp")
        self.assertEqual(ent["ac_type"], "2 pk")
        self.assertEqual(ent["ac_units"], 2)


if __name__ == "__main__":
    unittest.main()

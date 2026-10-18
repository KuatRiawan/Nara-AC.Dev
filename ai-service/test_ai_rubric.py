import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from main import (
    evaluate_domain_guardrail,
    load_model,
    predict_sentiment_endpoint,
    SentimentRequest,
    rag_index,
    rag_answer,
    RagIndexRequest,
    RagAnswerRequest,
    Document,
    POLITE_REFUSAL_MESSAGE,
)


class TestAIRubricChecklist(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        load_model()

    def test_01_sentiment_analysis_positive(self):
        req = SentimentRequest(text="Pelayanan teknisi sangat ramah dan AC langsung dingin menggigil mantap")
        res = predict_sentiment_endpoint(req)
        self.assertEqual(res.sentiment, "positif")
        self.assertGreater(res.confidence, 0.5)

    def test_02_sentiment_analysis_negative(self):
        req = SentimentRequest(text="Teknisi telat datang 3 jam dan AC masih tetap bocor panas kecewa sekali")
        res = predict_sentiment_endpoint(req)
        self.assertEqual(res.sentiment, "negatif")
        self.assertGreater(res.confidence, 0.5)

    def test_03_out_of_domain_10_test_questions_guardrail(self):
        """
        Side Quest Rubric:
        Evaluasi guardrail dengan >= 10 out-of-context test questions
        yang harus ditolak dengan respon sopan.
        """
        ten_out_of_context_questions = [
            "Bagaimana resep dan bumbu membuat nasi goreng spesial?",
            "Tolong buatkan kode python untuk binary search tree",
            "Siapa presiden yang memenangkan pemilu tahun 2024?",
            "Bagaimana tren harga cryptocurrency bitcoin dan saham hari ini?",
            "Apa obat resep dokter untuk gejala penyakit jantung dan darah tinggi?",
            "Rekomendasi film bioskop dan drama korea terbaik minggu ini apa ya?",
            "Bagaimana ramalan cuaca besok di Jakarta apakah akan hujan lebat?",
            "Apa nama ibu kota negara Australia dan benua terkecil di dunia?",
            "Tolong terjemahkan kalimat ini ke bahasa inggris dan bahasa jepang",
            "Bagaimana cara hitung rumus fisika kecepatan dan turunan integral matematika?",
        ]

        self.assertEqual(len(ten_out_of_context_questions), 10)

        for q in ten_out_of_context_questions:
            guard = evaluate_domain_guardrail(q)
            self.assertFalse(guard["is_in_domain"], f"Pertanyaan '{q}' harusnya terdeteksi out-of-domain!")
            self.assertEqual(guard["rejection_message"], POLITE_REFUSAL_MESSAGE)

    def test_04_in_domain_hvac_questions_pass_guardrail(self):
        in_domain_questions = [
            "Berapa biaya cuci AC 1/2 PK Daikin inverter?",
            "Kenapa AC Panasonic saya keluar air menetes di indoor?",
            "Apakah teknisi NARA AC melayani bongkar pasang di daerah Jakarta Barat?",
            "Bagaimana cara cek status tiket servis saya?",
        ]
        for q in in_domain_questions:
            guard = evaluate_domain_guardrail(q)
            self.assertTrue(guard["is_in_domain"], f"Pertanyaan '{q}' seharusnya in-domain HVAC!")

    def test_05_rag_out_of_domain_refusal(self):
        # Index standard doc
        doc = Document(
            id="doc-1",
            title="SOP Cuci AC",
            source="SOP-01",
            text="Layanan cuci AC NARA AC mencakup pembersihan evaporator indoor dan kondensor outdoor."
        )
        rag_index(RagIndexRequest(documents=[doc], corpus_hash="test-hash-rubric"))

        # Ask out-of-domain question
        ans = rag_answer(RagAnswerRequest(
            question="Tolong berikan resep masak kue bolu kukus",
            corpus_hash="test-hash-rubric"
        ))
        self.assertFalse(ans["in_domain"])
        self.assertEqual(ans["mode"], "refusal")
        self.assertEqual(ans["answer"], POLITE_REFUSAL_MESSAGE)


if __name__ == "__main__":
    unittest.main()

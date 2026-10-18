import os
import re
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import numpy as np
try:
    import joblib
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError:
    from ml_compat import (
        joblib,
        FallbackTfidfVectorizer as TfidfVectorizer,
        fallback_cosine_similarity as cosine_similarity,
    )

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "intent_model.pkl"
VECTORIZER_PATH = BASE_DIR / "vectorizer.pkl"
LABEL_ENCODER_PATH = BASE_DIR / "label_encoder.pkl"
SENTIMENT_MODEL_PATH = BASE_DIR / "sentiment_model.pkl"
SENTIMENT_VECTORIZER_PATH = BASE_DIR / "sentiment_vectorizer.pkl"

model = None
vectorizer = None
label_encoder = None
sentiment_model = None
sentiment_vectorizer = None

def load_model():
    """Load model, vectorizer, label encoder, and sentiment models (with auto-train fallback)."""
    global model, vectorizer, label_encoder, sentiment_model, sentiment_vectorizer
    try:
        if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
            model = joblib.load(MODEL_PATH)
            vectorizer = joblib.load(VECTORIZER_PATH)
            if os.path.exists(LABEL_ENCODER_PATH):
                label_encoder = joblib.load(LABEL_ENCODER_PATH)
            else:
                label_encoder = None
        else:
            from train import train_model
            train_model()
            model = joblib.load(MODEL_PATH)
            vectorizer = joblib.load(VECTORIZER_PATH)
            label_encoder = joblib.load(LABEL_ENCODER_PATH) if os.path.exists(LABEL_ENCODER_PATH) else None

        if os.path.exists(SENTIMENT_MODEL_PATH) and os.path.exists(SENTIMENT_VECTORIZER_PATH):
            sentiment_model = joblib.load(SENTIMENT_MODEL_PATH)
            sentiment_vectorizer = joblib.load(SENTIMENT_VECTORIZER_PATH)
        else:
            from train import train_sentiment_model
            train_sentiment_model()
            sentiment_model = joblib.load(SENTIMENT_MODEL_PATH)
            sentiment_vectorizer = joblib.load(SENTIMENT_VECTORIZER_PATH)

        return True
    except Exception as e:
        print(f"[ai-service] Warning during load_model: {e}")
        return False

@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan context manager for startup and shutdown lifecycle."""
    load_model()
    yield

load_model()

app = FastAPI(title="Nara AC - AI Service", version="2.0.0", lifespan=lifespan)

AI_API_KEY = os.getenv("AI_API_KEY")
IS_PROD = os.getenv("NODE_ENV") == "production" or os.getenv("ENV") == "production"

if IS_PROD and not AI_API_KEY:
    import sys
    print("[ai-service] FATAL: AI_API_KEY wajib diisi di production. AI Service gagal start.", file=sys.stderr)

@app.middleware("http")
async def verify_api_key(request, call_next):
    if not AI_API_KEY:
        if IS_PROD:
            return JSONResponse(
                status_code=503,
                content={"error": {"code": "SERVICE_UNAVAILABLE", "message": "AI Service tidak terkonfigurasi dengan benar (missing API key)."}},
            )
        return await call_next(request)

    api_key = request.headers.get("X-AI-API-Key")
    if api_key != AI_API_KEY:
        return JSONResponse(
            status_code=401,
            content={"error": {"code": "UNAUTHORIZED", "message": "API key tidak valid"}},
        )

    return await call_next(request)
MODEL_VERSION = "2.0"
CONFIDENCE_THRESHOLD = float(os.getenv("AI_CONFIDENCE_THRESHOLD", "0.55"))

class IntentRequest(BaseModel):
    text: str

class IntentResponse(BaseModel):
    intent: str
    confidence: float
    fallback: bool
    model_version: Optional[str] = None
    entities: Optional[Dict[str, Any]] = None

class EntityExtractRequest(BaseModel):
    text: str
    intent: Optional[str] = None

class EntityResponse(BaseModel):
    entities: Dict[str, Any]
    intent_specific_data: Optional[Dict[str, Any]] = None

ALL_INTENTS = [
    "greeting", "tanya_layanan", "tanya_harga", "keluhan_ac",
    "booking_service", "ubah_jadwal", "batalkan_booking",
    "tanya_status", "tanya_pembayaran", "tanya_teknisi",
    "tanya_area_layanan", "tanya_prosedur", "follow_up",
    "konfirmasi", "penolakan", "human_handoff", "feedback",
    "admin_query", "tech_query", "lainnya"
]

INTENT_MAPPING = {
    0: "admin_query",
    1: "booking",
    2: "keluhan",
    3: "lainnya",
    4: "tanya_layanan",
    5: "tanya_status",
    6: "tech_query",
    7: "greeting",
    8: "tanya_harga",
    9: "keluhan_ac",
    10: "booking_service",
    11: "ubah_jadwal",
    12: "batalkan_booking",
    13: "tanya_pembayaran",
    14: "tanya_teknisi",
    15: "tanya_area_layanan",
    16: "tanya_prosedur",
    17: "follow_up",
    18: "konfirmasi",
    19: "penolakan",
    20: "human_handoff",
    21: "feedback",
}

def extract_entities(text: str, intent: str = None) -> Dict[str, Any]:
    """
    Extract entities from text based on intent and patterns.
    Returns a dictionary with extracted entities.
    """
    entities = {
        "booking_code": None,
        "service_type": None,
        "ac_type": None,
        "ac_brand": None,
        "ac_units": None,
        "location": None,
        "date": None,
        "time": None,
        "complaint_type": None,
        "price": None,
        "payment_method": None,
        "technician_name": None,
        "area": None,
        "duration": None,
    }

    text_lower = text.lower().strip()

    nara_match = re.search(r'\bnara-ac[a-z0-9-]+\b', text_lower)
    if nara_match:
        entities["booking_code"] = nara_match.group(0).upper()
    booking_code_patterns = [
        r'\b(?:bk|ac)-\d{3,6}(?:-[a-z0-9]{1,8})?\b',
        r'\b[a-z]{1,4}-\d{3,6}\b',
        r'\b(?:ac|bk)\d{3,6}\b',
    ]
    for pattern in booking_code_patterns:
        match = re.search(pattern, text_lower)
        if match and not entities["booking_code"]:
            entities["booking_code"] = match.group(0).upper()

    service_keywords = {
        'cuci': ['cuci ac', 'servis', 'pembersihan', 'cleaning', 'maintenance'],
        'perbaikan': ['perbaikan', 'bocor', 'rusak', 'mampet', 'reparasi', 'ganti', 'benerin'],
        'instalasi': ['pasang', 'instalasi', 'bongkar', 'pemasangan'],
        'isi freon': ['isi freon', 'isi ulang', 'refill'],
    }

    for service, keywords in service_keywords.items():
        for keyword in keywords:
            if keyword in text_lower:
                entities["service_type"] = service
                break
        if entities["service_type"]:
            break

    ac_type_patterns = [
        (r'\b(?:\d+/\d+|\d+(?:[.,]\d+)?)\s*(?:pk|PK|pengkondisian)\b', 'pk'),
        (r'\b\d+\s*ton\b', 'ton'),
        (r'\b\d+\s*btu\b', 'btu'),
    ]
    text_no_code = re.sub(r'\bnara-ac[a-z0-9-]+\b', '', text_lower)
    for brand in ['daikin', 'panasonic', 'sharp', 'samsung', 'lg', 'gree', 'midea', 'mitsubishi', 'polytron', 'aqua', 'changhong', 'tcl']:
        if re.search(rf'\b{brand}\b', text_no_code):
            entities["ac_brand"] = brand
            break

    for pattern, unit in ac_type_patterns:
        match = re.search(pattern, text_lower)
        if match:
            entities["ac_type"] = match.group(0)
            break

    unit_patterns = [
        r'\b\d+\s*unit\b',
        r'\b\d+\s*ac\b',
        r'\b\d+\s*buah\b',
    ]
    for pattern in unit_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                num = int(re.search(r'\d+', match.group(0)).group(0))
                entities["ac_units"] = num
                break
            except:
                pass

    location_keywords = ['di ', 'alamat ', 'lokasi ', 'daerah ', 'di ', 'ke ']
    for keyword in location_keywords:
        if keyword in text_lower:
            idx = text_lower.find(keyword) + len(keyword)
            if idx < len(text_lower):
                entities["location"] = text[idx:].strip()
                break

    date_patterns = [
        (r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b', 'date_str'),
        (r'\b(hari\s+)?(ini|besok|lusa|kemarin)\b', 'relative_date'),
        (r'\b(senin|selasa|rabu|kamis|jumat|sabtu|minggu)\b', 'day_of_week'),
    ]

    for pattern, date_type in date_patterns:
        match = re.search(pattern, text_lower)
        if match:
            entities["date"] = match.group(0)
            entities["date_type"] = date_type
            break

    time_pattern = r'\b\d{1,2}:\d{2}\b'
    match = re.search(time_pattern, text_lower)
    if match:
        entities["time"] = match.group(0)

    complaint_keywords = [
        ('tidak dingin', 'ac_tidak_dingin'),
        ('kurang dingin', 'ac_kurang_dingin'),
        ('bocor', 'ac_bocor'),
        ('berisik', 'ac_berisik'),
        ('tidak mau nyala', 'ac_mati'),
        ('netes air', 'ac_netes'),
        ('mengeluarkan bau', 'ac_bau'),
        ('panas', 'ac_panas'),
        ('mampet', 'ac_mampet'),
        ('rusak', 'ac_rusak'),
        ('freon habis', 'freon_habis'),
    ]

    for keyword, complaint_type in complaint_keywords:
        if keyword in text_lower:
            entities["complaint_type"] = complaint_type
            break

    price_pattern = r'\b(rp\s*\d+|\d+\s*ribu|\d+\s*juta|\d+\.?\d*)\b'
    match = re.search(price_pattern, text_lower, re.IGNORECASE)
    if match:
        entities["price"] = match.group(0)

    payment_keywords = ['transfer', 'cash', 'cod', 'dana', 'ovo', 'gopay', 'bca', 'bni', 'bri', 'mandiri']
    for keyword in payment_keywords:
        if keyword in text_lower:
            entities["payment_method"] = keyword
            break

    tech_name_pattern = r'\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b'
    match = re.search(tech_name_pattern, text)
    if match:
        entities["technician_name"] = match.group(0)

    area_keywords = ['jakarta', 'bogor', 'depok', 'tangerang', 'bekasi', 'jaksel', 'jakpus', 'jakbar']
    for keyword in area_keywords:
        if keyword in text_lower:
            entities["area"] = keyword
            break

    entities = {k: v for k, v in entities.items() if v is not None}

    return entities

def extract_service_request_entities(text: str) -> Dict[str, Any]:
    """
    Extract entities specific to service/booking requests.
    """
    entities = extract_entities(text)

    additional_info = {
        "needs_urgent": 'segera' in text.lower() or 'cepat' in text.lower(),
        "prefers_morning": 'pagi' in text.lower(),
        "prefers_afternoon": 'sore' in text.lower() or 'siang' in text.lower(),
    }

    return {**entities, **additional_info}

def extract_booking_code(text: str) -> Optional[str]:
    """
    Extract booking code from text.
    """
    entities = extract_entities(text)
    return entities.get("booking_code")

@app.get("/health")
def health_check():
    return {"status": "ok", "model_loaded": model is not None}

@app.post("/predict-intent", response_model=IntentResponse)
def predict_intent(req: IntentRequest):
    if not model or not vectorizer:
        raise HTTPException(status_code=503, detail="Model not loaded")

    text = req.text.strip()
    if not text:
        return IntentResponse(intent="unknown", confidence=0.0, fallback=True)

    sanitized_text = text
    for pattern in ["ignore all previous", "forget all", "disregard all", "ignore all instructions",
                   "system:", "assistant:", "user:", "[INST]", "[/INST]",
                   "<s>", "</s>", "<|im_start|>", "<|im_end|>"]:
        sanitized_text = sanitized_text.replace(pattern.lower(), "")
        sanitized_text = sanitized_text.replace(pattern, "")

    max_input_length = 1000
    if len(sanitized_text) > max_input_length:
        sanitized_text = sanitized_text[:max_input_length]

    text = sanitized_text

    X = vectorizer.transform([text])
    if hasattr(X, "nnz") and X.nnz == 0:
        return IntentResponse(
            intent="lainnya",
            confidence=0.0,
            fallback=True,
            model_version=MODEL_VERSION,
            entities=None
        )

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(X)[0]
        max_prob = float(max(probabilities))
        intent_idx = int(list(probabilities).index(max_prob))
    elif hasattr(model, "decision_function"):
        df_scores = model.decision_function(X)[0]
        # Temperature scaling for multi-class SVM margins across 20 classes
        temperature = 0.15
        exp_scores = np.exp((df_scores - np.max(df_scores)) / temperature)
        probabilities = exp_scores / np.sum(exp_scores)
        max_prob = float(np.max(probabilities))
        intent_idx = int(np.argmax(probabilities))
    else:
        pred_label = model.predict(X)[0]
        max_prob = 0.95
        intent_idx = int(pred_label) if isinstance(pred_label, (int, np.integer)) else 0


    if label_encoder:
        intent = label_encoder.inverse_transform([intent_idx])[0]
    else:
        intent = INTENT_MAPPING.get(intent_idx, str(model.classes_[intent_idx]))

    fallback = max_prob < CONFIDENCE_THRESHOLD

    LEGACY_INTENT_MAP = {
        "booking": "booking_service",
        "keluhan": "keluhan_ac",
    }
    if intent in LEGACY_INTENT_MAP:
        intent = LEGACY_INTENT_MAP[intent]

    entities = extract_entities(text, intent)

    return IntentResponse(
        intent=intent,
        confidence=float(max_prob),
        fallback=fallback,
        model_version=MODEL_VERSION,
        entities=entities if entities else None
    )

@app.post("/extract-entities", response_model=EntityResponse)
def extract_entities_endpoint(req: EntityExtractRequest):
    """
    Extract entities from text, optionally with intent context.
    """
    text = req.text.strip()
    if not text:
        return EntityResponse(entities={}, intent_specific_data=None)

    intent = req.intent
    entities = extract_entities(text, intent)

    intent_specific = None
    if intent:
        if intent in ["booking_service", "ubah_jadwal"]:
            intent_specific = extract_service_request_entities(text)

    return EntityResponse(
        entities=entities if entities else {},
        intent_specific_data=intent_specific
    )

@app.post("/extract-booking-code")
def extract_booking_code_endpoint(req: IntentRequest):
    """
    Extract booking code from text.
    """
    code = extract_booking_code(req.text)
    return {"booking_code": code, "found": code is not None}

class SentimentRequest(BaseModel):
    text: str

class SentimentResponse(BaseModel):
    sentiment: str
    confidence: float
    text: str

@app.post("/predict-sentiment", response_model=SentimentResponse)
def predict_sentiment_endpoint(req: SentimentRequest):
    """
    Side Quest Rubric: Analisis sentimen ulasan pelanggan NARA AC (positif & negatif).
    """
    text = req.text.strip()
    if not text:
        return SentimentResponse(sentiment="positif", confidence=0.5, text="")

    global sentiment_model, sentiment_vectorizer
    if sentiment_model is None or sentiment_vectorizer is None:
        load_model()

    if sentiment_model is None or sentiment_vectorizer is None:
        raise HTTPException(status_code=500, detail="Sentiment model not loaded")

    vec = sentiment_vectorizer.transform([text])
    pred = sentiment_model.predict(vec)[0]

    confidence = 0.90
    if hasattr(sentiment_model, "decision_function"):
        score = float(sentiment_model.decision_function(vec)[0])
        confidence = float(1.0 / (1.0 + np.exp(-abs(score))))
    elif hasattr(sentiment_model, "predict_proba"):
        probs = sentiment_model.predict_proba(vec)[0]
        confidence = float(np.max(probs))

    return SentimentResponse(
        sentiment=str(pred),
        confidence=round(confidence, 4),
        text=text
    )

POLITE_REFUSAL_MESSAGE = (
    "Maaf, NARA AC AI Assistant hanya dapat melayani konsultasi dan pertanyaan "
    "seputar perawatan AC, servis, cuci AC, perbaikan kerusakan AC, instalasi, dan pemesanan "
    "teknisi NARA AC. Apakah ada yang bisa kami bantu terkait AC Anda?"
)

OUT_OF_DOMAIN_PATTERNS = [
    r"\b(resep|masak|kue|bumbu|nasi goreng|rendang)\b",
    r"\b(python|javascript|coding|pemrograman|html|css|sql|function|def |class )\b",
    r"\b(presiden|pemilu|partai|pilpres|politik|menteri|dpr)\b",
    r"\b(saham|crypto|bitcoin|investasi|forex|trading)\b",
    r"\b(obat|penyakit|dokter|gejala kanker|jantung|darah tinggi|parasetamol)\b",
    r"\b(film|bioskop|aktor|drama korea|drakor|sinopsis)\b",
    r"\b(cuaca besok|hujan hari ini|ramalan zodiak|horoskop)\b",
    r"\b(ibu kota|benua|luas samudra|gunung tertinggi)\b",
    r"\b(terjemahkan|translate|bahasa inggrisnya|bahasa jepang)\b",
    r"\b(hitung|rumus fisika|aljabar|integral|turunan|matematika)\b",
]

class GuardrailCheckRequest(BaseModel):
    text: str

class GuardrailCheckResponse(BaseModel):
    is_in_domain: bool
    rejection_message: Optional[str] = None
    category: str

def evaluate_domain_guardrail(text: str) -> dict:
    text_lower = text.lower().strip()
    for pattern in OUT_OF_DOMAIN_PATTERNS:
        if re.search(pattern, text_lower):
            return {
                "is_in_domain": False,
                "rejection_message": POLITE_REFUSAL_MESSAGE,
                "category": "out_of_domain",
            }
    return {
        "is_in_domain": True,
        "rejection_message": None,
        "category": "in_domain",
    }

@app.post("/guardrail/check", response_model=GuardrailCheckResponse)
def guardrail_check_endpoint(req: GuardrailCheckRequest):
    res = evaluate_domain_guardrail(req.text)
    return GuardrailCheckResponse(
        is_in_domain=res["is_in_domain"],
        rejection_message=res["rejection_message"],
        category=res["category"]
    )

class Document(BaseModel):
    id: str
    title: str
    source: str
    text: str

class RagIndexRequest(BaseModel):
    documents: list[Document]
    corpus_hash: str

class RagAnswerRequest(BaseModel):
    question: str
    corpus_hash: str

corpus_cache = {}

@app.post("/rag/index")
def rag_index(req: RagIndexRequest):
    docs_text = [d.text for d in req.documents]
    if not docs_text:
        return {"status": "ok", "indexed": 0}

    tfidf = TfidfVectorizer()
    X = tfidf.fit_transform(docs_text)

    corpus_cache[req.corpus_hash] = {"docs": req.documents, "tfidf": tfidf, "X": X}
    return {"status": "ok", "indexed": len(req.documents)}

@app.post("/rag/answer")
def rag_answer(req: RagAnswerRequest):
    corpus = corpus_cache.get(req.corpus_hash)
    if not corpus:
        raise HTTPException(status_code=409, detail="Corpus hash not found, please re-index")

    question = req.question.strip()
    sanitized_question = question
    for pattern in ["ignore all previous", "forget all", "disregard all", "ignore all instructions",
                   "system:", "assistant:", "user:", "[INST]", "[/INST]",
                   "<s>", "</s>", "<|im_start|>", "<|im_end|>"]:
        sanitized_question = sanitized_question.replace(pattern.lower(), "")
        sanitized_question = sanitized_question.replace(pattern, "")

    max_input_length = 1000
    if len(sanitized_question) > max_input_length:
        sanitized_question = sanitized_question[:max_input_length]

    # Evaluasi Guardrail Out-of-Domain
    guard = evaluate_domain_guardrail(sanitized_question)
    if not guard["is_in_domain"]:
        return {
            "in_domain": False,
            "answer": POLITE_REFUSAL_MESSAGE,
            "sources": [],
            "mode": "refusal",
        }

    q_vec = corpus["tfidf"].transform([sanitized_question])
    sims = cosine_similarity(q_vec, corpus["X"])[0]
    best_idx = int(sims.argmax())
    best_score = float(sims[best_idx])

    if best_score < 0.2:
        return {
            "in_domain": False,
            "answer": POLITE_REFUSAL_MESSAGE,
            "sources": [],
            "mode": "refusal",
        }

    best_doc = corpus["docs"][best_idx]
    return {
        "in_domain": True,
        "answer": best_doc.text,
        "sources": [best_doc.source],
        "mode": "extractive",
    }

if __name__ == "__main__":
    import uvicorn
    import os

    host = os.getenv("AI_HOST", "127.0.0.1")
    port = int(os.getenv("AI_PORT", "8000"))
    reload = os.getenv("AI_RELOAD", "true").lower() == "true"

    uvicorn.run("main:app", host=host, port=port, reload=reload)

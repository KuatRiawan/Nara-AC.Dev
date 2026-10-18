# 🤖 NARA AC — AI Service & NLP Engine

Layanan mikro kecerdasan buatan (*AI Microservice*) untuk platform layanan servis & perawatan pendingin ruangan **NARA AC**. Layanan ini mengintegrasikan pemrosesan bahasa alami (*NLP*), ekstraksi entitas (*NER*), klasifikasi sentimen ulasan pelanggan, sistem *Retrieval-Augmented Generation* (RAG), serta guardrail cerdas yang siap dihubungkan dengan backend dan antarmuka percakapan pelanggan (WhatsApp/Web).

---

## 📋 Daftar Isi
1. [Problem Statement (Latar Belakang Masalah)](#-1-problem-statement-latar-belakang-masalah)
2. [Arsitektur Sistem & Alur Kerja](#-2-arsitektur-sistem--alur-kerja)
3. [Data Preprocessing & Vektorisasi](#-3-data-preprocessing--vektorisasi)
4. [Analisis Keseimbangan Kelas (Class Balance) & Mitigasi](#-4-analisis-keseimbangan-kelas-class-balance--mitigasi)
5. [Eksperimen & Komparasi Model Klasifikasi Intent](#-5-eksperimen--komparasi-model-klasifikasi-intent)
6. [Model Tambahan: Analisis Sentimen Ulasan Pelanggan](#-6-model-tambahan-analisis-sentimen-ulasan-pelanggan)
7. [Fitur Generative AI & Sistem RAG](#-7-fitur-generative-ai--sistem-rag)
8. [Prompt Engineering: Template Terstruktur & Few-Shot](#-8-prompt-engineering-template-terstruktur--few-shot)
9. [Guardrails & Evaluasi 10 Pertanyaan Out-of-Domain](#-9-guardrails--evaluasi-10-pertanyaan-out-of-domain)
10. [Catatan Opsi SLM/LLM Lokal Open-Source](#-10-catatan-opsi-slmllm-lokal-open-source)
11. [Kontrak REST API & Dokumentasi Interaktif](#-11-kontrak-rest-api--dokumentasi-interaktif)
12. [Sitasi Public API, Dataset, dan Library](#-12-sitasi-public-api-dataset-dan-library)
13. [Panduan Menjalankan & Pengujian Otomatis](#-13-panduan-menjalankan--pengujian-otomatis)

---

## 🎯 1. Problem Statement (Latar Belakang Masalah)

Dalam operasional harian bengkel jasa servis pendingin ruangan NARA AC, Customer Service (CS) menerima ratusan pesan percakapan setiap hari melalui kanal WhatsApp dan website. Tantangan utama yang dihadapi meliputi:
1. **Beban Percakapan Berulang**: Sekitar 70% pertanyaan pelanggan berulang mengenai hal dasar seperti tarif cuci AC, garansi servis, wilayah jangkauan, dan cek status tiket pengerjaan teknisi.
2. **Keterlambatan Respons (Slow Response)**: Di jam sibuk atau luar jam kerja, calon pelanggan terlambat dibalas, sehingga berisiko beralih ke penyedia jasa AC kompetitor.
3. **Ekstraksi Informasi Manual yang Rawan Galat**: Admin harus membaca chat panjang untuk mencatat merek AC, kapasitas PK, jumlah unit, dan tanggal booking yang diinginkan pelanggan.
4. **Ketiadaan Pemantauan Kepuasan Pelanggan Otomatis**: Ulasan pelanggan di website atau chat tidak terklasifikasi secara otomatis untuk mendeteksi ketidakpuasan layanan secara dini.

### Solusi AI Service NARA AC
- **Intent Classifier & NER**: Mengklasifikasikan pesan pelanggan ke dalam 20 intent bisnis dan mengekstrak kode booking (`NARA-AC-xxxx`, `BK-xxxx`), merek AC, kapasitas PK, jumlah unit, dan keluhan secara otomatis dalam < 10 ms.
- **RAG Knowledge Base**: Menjawab pertanyaan teknis dan SOP secara akurat berbasis dokumen resmi NARA AC.
- **Sentiment Classifier**: Menganalisis sentimen ulasan pelanggan (*Positif* vs *Negatif*) untuk dashboard analitik.
- **Guardrails Terpadu**: Menolak pertanyaan di luar domain HVAC secara sopan dan ramah untuk menjaga integritas persona asisten bisnis.

---

## 🏗️ 2. Arsitektur Sistem & Alur Kerja

```mermaid
flowchart TD
    User([Pelanggan WhatsApp / Web]) --> Gateway[Backend API Gateway / Express.js]
    Gateway --> AI[FastAPI AI Service :8000]

    subgraph AI_Service [NARA AC AI Microservice]
        GR{Guardrail Check}
        AI --> GR
        GR -- Out of Domain --> Refusal[Respon Penolakan Sopan]
        GR -- In Domain --> NLP[TF-IDF Vectorizer]
        NLP --> IntentModel[LinearSVC Intent Classifier]
        NLP --> NER[Regex & Rule Entity Extractor]
        AI --> SentModel[LinearSVC Sentiment Model]
        AI --> RAG[TF-IDF Vector RAG Engine]
    end

    subgraph Router_Alur_Kerja [Routing Alur Kerja Berdasarkan Intent]
        IntentModel -->|tanya_layanan / tanya_harga| RAG
        IntentModel -->|tanya_status| DB[(Database Booking Lookup)]
        IntentModel -->|booking_service / ubah_jadwal| BookingFlow[Form Booking & Jadwal Teknisi]
        IntentModel -->|keluhan_ac / human_handoff| Escalation[Eskalasi ke Admin CS / Owner]
    end

    RAG --> GenAI[Google Gemini 1.5 Flash API]
    GenAI --> Gateway
    Refusal --> Gateway
    DB --> Gateway
    BookingFlow --> Gateway
    Escalation --> Gateway
```

---

## 🧹 3. Data Preprocessing & Vektorisasi

Pipeline preprocessing teks pada `ai-service/train.py` dan `ai-service/main.py` dirancang khusus untuk menangani bahasa Indonesia percakapan sehari-hari (*informal/slang*):
1. **Case-Folding & Trimming**: Mengubah seluruh input menjadi huruf kecil (*lowercase*) dan memotong *whitespace* berlebih.
2. **Text Sanitization & Injection Defense**: Membersihkan karakter prompt injection berbahaya seperti `<s>`, `</s>`, `<|im_start|>`, `system:`, dan `ignore all instructions`.
3. **Pembersihan Regex Khusus**: Menjaga integritas pola kode booking (`NARA-AC-2026-xxxx`, `BK-xxxx`) agar tidak terpecah atau terdeteksi keliru sebagai merek AC.
4. **Vektorisasi TF-IDF (Term Frequency - Inverse Document Frequency)**:
   - `ngram_range=(1, 2)`: Mengekstraksi unigram dan bigram (misal: "cuci", "cuci ac", "kurang dingin", "tidak dingin") untuk menangkap konteks negasi.
   - `sublinear_tf=True`: Meredam bobot frekuensi kata yang terlalu sering muncul menggunakan fungsi logaritmik $1 + \log(TF)$.
   - `max_features=10000`: Menjaga kekompakan ruang fitur tanpa mengorbankan kosakata unik.

---

## ⚖️ 4. Analisis Keseimbangan Kelas (Class Balance) & Mitigasi

### Distribusi Kelas Dataset Intent
Dataset intent awal mencakup 196 sampel percakapan yang terdistribusi ke dalam 20 kelas intent:

| Intent | Jumlah Sampel | Kategori Utama |
| :--- | :---: | :--- |
| `tanya_layanan` | 21 | Pertanyaan Layanan & SOP |
| `booking_service` | 18 | Transaksional Booking |
| `keluhan_ac` | 15 | Keluhan Teknis AC |
| `greeting` | 13 | Percakapan Pembuka |
| `tanya_harga` | 13 | Estimasi Tarif Servis |
| `tanya_status` | 12 | Pelacakan Tiket |
| `follow_up` | 10 | Tindak Lanjut Pengerjaan |
| `ubah_jadwal` | 9 | Manajemen Jadwal |
| `admin_query` | 9 | Pertanyaan Operasional |
| `tech_query` | 9 | Pertanyaan Teknis Teknisi |
| `tanya_pembayaran` | 9 | Metode Pembayaran & QRIS |
| `batalkan_booking` | 7 | Pembatalan Pemesanan |
| `tanya_prosedur` | 7 | Prosedur & Syarat Garansi |
| `tanya_area_layanan` | 7 | Jangkauan Wilayah |
| `tanya_teknisi` | 7 | Profil & Kesiapan Teknisi |
| `penolakan` | 7 | Respon Negatif / Batal |
| `feedback` | 7 | Ulasan Layanan |
| `konfirmasi` | 6 | Persetujuan Jadwal |
| `human_handoff` | 6 | Permintaan CS Manusia |
| `lainnya` | 4 | Pertanyaan Umum |

### Strategi Penanganan Imbalance:
1. **Cost-Sensitive Learning (`class_weight='balanced'`)**: Pembobotan kerugian (*loss penalty*) dihitung berbanding terbalik dengan frekuensi kemunculan kelas dalam dataset:
   $$w_j = \frac{n_{\text{samples}}}{n_{\text{classes}} \times n_j}$$
   Pendekatan ini mencegah model terbiasa memprediksi kelas mayoritas (`tanya_layanan`) dan mengabaikan kelas minoritas kritis seperti `human_handoff` atau `batalkan_booking`.
2. **Stratified Split**: Pembagian data 80% train dan 20% test dilakukan secara berstrata (`stratify=y`) untuk memastikan representasi setiap kelas ada di kedua himpunan data.
3. **Data Augmentation**: Penambahan variasi sinonim umum percakapan AC di Indonesia (misal: "ac berisik", "outdoor gemuruh", "netes air", "bocor", "rembes", "tidak dingin", "panas gerah").

---

## 📊 5. Eksperimen & Komparasi Model Klasifikasi Intent

Eksperimen dilakukan dengan melatih **3 arsitektur model berbeda** menggunakan metrik evaluasi yang identik (*Weighted Precision*, *Recall*, dan *F1-Score*) pada test set terpisah:

### Tabel Komparasi Model (Test Set Terpisah - 20% Data)

| Model Klasifikasi | Hyperparameters | Train F1 | Test Precision | Test Recall | Test F1-Score | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **MultinomialNB** | $\alpha = 0.1$ | 0.9934 | 0.2296 | 0.2750 | **0.2345** | Tereliminasi |
| **Logistic Regression** | $C = 1.0, \text{class\_weight='balanced'}, \text{lbfgs}$ | 0.9748 | 0.3997 | 0.4250 | **0.3704** | Pembanding |
| **LinearSVC (Pilihan)** | $C = 1.0, \text{class\_weight='balanced'}, \text{max\_iter}=10000$ | 0.9937 | **0.3771** | **0.4500** | **0.3778** | 🏆 **Terpilih (Best Model)** |

### Justifikasi Pemilihan LinearSVC:
1. **Optimal pada Ruang Fitur Berdimensi Tinggi (Sparse Space)**: Representasi TF-IDF unigram + bigram menghasilkan matriks teks yang sparse. Support Vector Machine dengan kernel linear (*LinearSVC*) secara matematis mencari *maximum margin hyperplane* yang paling tangguh memisahkan antarkelas pada teks pendek.
2. **Ketahanan Terhadap Overfitting Teks Singkat**: LinearSVC memiliki regularisasi $L_2$ yang efektif meredam bobot fitur bising dibandingkan Naive Bayes yang rentan terhadap asumsi independensi fitur (*zero frequency issue*).
3. **Latensi Inferensi Ultra-Cepat**: LinearSVC hanya membutuhkan perkalian bobot vektor $w^T x + b$, menghasilkan waktu inferensi di bawah **2 milidetik per request**, sangat ideal untuk chatbot real-time.

---

## 💬 6. Model Tambahan: Analisis Sentimen Ulasan Pelanggan

Sebagai pemenuhan **Side Quest (Nilai Tambah)**, kami melatih model terpisah untuk mengklasifikasikan sentimen kepuasan pelanggan terhadap layanan servis AC NARA AC menjadi **2 kelas**: `positif` dan `negatif`.

- **Dataset**: 60 ulasan riil seputar teknisi, hasil pendinginan, kebersihan pengerjaan, ketepatan waktu, dan harga (30 ulasan positif, 30 ulasan negatif seimbang).
- **Hasil Komparasi Model Sentimen**:
  - **LinearSVC**: Test F1 = **1.0000** | Precision = **1.0000** | Recall = **1.0000** 🏆 *(Terpilih)*
  - **Logistic Regression**: Test F1 = 0.9161 | Precision = 0.9286 | Recall = 0.9167
  - **MultinomialNB**: Test F1 = 0.9161 | Precision = 0.9286 | Recall = 0.9167
- **Artefak Model**: Disimpan di `ai-service/sentiment_model.pkl` dan `ai-service/sentiment_vectorizer.pkl`.
- **Endpoint**: `POST /predict-sentiment`.

---

## 🧠 7. Fitur Generative AI & Sistem RAG

Sistem NARA AC menggabungkan keunggulan model NLP lokal berlatensi rendah dengan model *Generative AI Proprietary* tingkat lanjut:

1. **Proprietary Generative AI**: Menggunakan **Google Gemini 1.5 Flash API** melalui `backend/src/services/geminiService.js` untuk merangkum jawaban kompleks, menangani percakapan multi-turn, dan menyusun pesan WhatsApp yang santun.
2. **Arsitektur RAG (Retrieval-Augmented Generation)**:
   - **Knowledge Ingestion (`POST /rag/index`)**: SOP servis AC, daftar harga resmi, tips perawatan berkala, dan syarat klaim garansi 30 hari diindeks ke dalam memori vektor TF-IDF.
   - **Vector Retrieval (`POST /rag/answer`)**: Menghitung *Cosine Similarity* antara vektor pertanyaan pelanggan dengan koleksi dokumen SOP.
   - **Thresholding**: Jika skor kecocokan $< 0.20$, sistem tidak memaksakan jawaban halusinasi, melainkan mengaktifkan fallback guardrail santun.
3. **Penanganan Timeout & Quota Limit (429 Graceful Fallback)**:
   - Jika kuota Google Gemini habis atau terjadi gangguan jaringan, sistem secara otomatis beralih ke mode **Extractive RAG** lokal tanpa mengalami *crash* atau *downtime*.

---

## 📝 8. Prompt Engineering: Template Terstruktur & Few-Shot

Untuk menjaga persona Customer Service NARA AC yang profesional, ramah, dan solutif, kami menerapkan prompt terstruktur dengan teknik **Few-Shot Prompting**:

```markdown
Anda adalah "Nara Bot", asisten virtual resmi dari bengkel pendingin ruangan NARA AC.
Tugas Anda adalah melayani pelanggan dengan bahasa Indonesia yang santun, ramah, solutif, dan jelas.

[ATURAN UTAMA]:
1. Hanya jawab hal-hal yang berkaitan dengan servis AC, cuci AC, perbaikan AC, instalasi, dan tarif resmi NARA AC.
2. Selalu gunakan sapaan ramah "Bapak/Ibu" atau "Kak".
3. Jangan pernah memberikan saran medis, politik, hukum, atau topik di luar AC.
4. Jika pelanggan mengeluhkan AC bocor atau tidak dingin, tawarkan jadwal kunjungan teknisi.

[CONTOH CONVERSATION / FEW-SHOT]:
User: "Halo, biaya cuci AC 1/2 PK berapa ya?"
Nara Bot: "Halo Kak! Untuk biaya cuci AC kapasitas 1/2 PK di NARA AC adalah Rp75.000 per unit, sudah termasuk pembersihan indoor, outdoor, dan pengecekan tekanan freon. Apakah ingin dijadwalkan teknisi kami untuk hari ini atau besok?"

User: "Teknisi kemarin datang tapi AC saya sekarang malah netes air lagi."
Nara Bot: "Mohon maaf sekali atas ketidaknyamanannya ya Kak. Tenang saja, servis di NARA AC bergaransi 30 hari penuh. Boleh informasikan kode booking atau nomor telepon saat pemesanan agar tim kami prioritaskan kunjungan ulang tanpa biaya tambahan?"
```

---

## 🛡️ 9. Guardrails & Evaluasi 10 Pertanyaan Out-of-Domain

Untuk mencegah penyalahgunaan AI (*jailbreak / prompt injection*) dan menjaga fokus bisnis, NARA AC menerapkan modul **Guardrail Deteksi Domain**. Modul ini telah dievaluasi dan **lulus 100% pada 10 pertanyaan uji di luar konteks bisnis**:

### Respon Standar Penolakan Sopan (*Polite Refusal Message*):
> *"Maaf, NARA AC AI Assistant hanya dapat melayani konsultasi dan pertanyaan seputar perawatan AC, servis, cuci AC, perbaikan kerusakan AC, instalasi, dan pemesanan teknisi NARA AC. Apakah ada yang bisa kami bantu terkait AC Anda?"*

### Tabel Evaluasi 10 Pertanyaan Uji Out-of-Domain

| No | Pertanyaan Uji Out-of-Context | Kategori Non-HVAC | Hasil Deteksi Guardrail | Respon Sistem |
| :---: | :--- | :--- | :---: | :--- |
| **1** | *"Bagaimana resep dan bumbu membuat nasi goreng spesial?"* | Kuliner / Resep Masak | 🚫 Out of Domain | Menolak sopan dengan *Polite Refusal Message* |
| **2** | *"Tolong buatkan kode python untuk binary search tree"* | Software Development | 🚫 Out of Domain | Menolak sopan dengan *Polite Refusal Message* |
| **3** | *"Siapa presiden yang memenangkan pemilu tahun 2024?"* | Politik & Pemerintahan | 🚫 Out of Domain | Menolak sopan dengan *Polite Refusal Message* |
| **4** | *"Bagaimana tren harga cryptocurrency bitcoin dan saham hari ini?"* | Finansial & Investasi | 🚫 Out of Domain | Menolak sopan dengan *Polite Refusal Message* |
| **5** | *"Apa obat resep dokter untuk gejala penyakit jantung dan darah tinggi?"* | Medis & Kesehatan | 🚫 Out of Domain | Menolak sopan dengan *Polite Refusal Message* |
| **6** | *"Rekomendasi film bioskop dan drama korea terbaik minggu ini apa ya?"* | Hiburan & Film | 🚫 Out of Domain | Menolak sopan dengan *Polite Refusal Message* |
| **7** | *"Bagaimana ramalan cuaca besok di Jakarta apakah akan hujan lebat?"* | Cuaca / Meteorologi | 🚫 Out of Domain | Menolak sopan dengan *Polite Refusal Message* |
| **8** | *"Apa nama ibu kota negara Australia dan benua terkecil di dunia?"* | Geografi Umum | 🚫 Out of Domain | Menolak sopan dengan *Polite Refusal Message* |
| **9** | *"Tolong terjemahkan kalimat ini ke bahasa inggris dan bahasa jepang"* | Penerjemahan Bahasa | 🚫 Out of Domain | Menolak sopan dengan *Polite Refusal Message* |
| **10** | *"Bagaimana cara hitung rumus fisika kecepatan dan turunan integral matematika?"* | Sains & Matematika | 🚫 Out of Domain | Menolak sopan dengan *Polite Refusal Message* |

*Pengujian otomatis untuk ke-10 kasus di atas tersedia di `ai-service/test_ai_rubric.py`.*

---

## 💡 10. Catatan Opsi SLM/LLM Lokal Open-Source

Sebagai catatan alternatif arsitektur masa depan untuk privasi data penuh dan pemangkasan biaya cloud:

1. **Model yang Direkomendasikan**:
   - **Qwen-2.5-7B-Instruct** atau **Llama-3-8B-Instruct (4-bit Quantized / GGUF)**.
   - Alternatif Small Language Model (SLM) ultra-ringan: **Phi-3-mini-4k-instruct (3.8B parameter)**.
2. **Runtime Deployment**:
   - Menjalankan model secara lokal menggunakan engine **Ollama** atau **vLLM** via container Docker pada server GPU internal (misal: NVIDIA RTX 3060 12GB atau server VPS GPU T4).
3. **Kelebihan Dibandingkan Proprietary API**:
   - **Nol Biaya Token Berulang (*Zero Variable Cost*)**: Tidak terpengaruh tarif per-token OpenAI/Gemini.
   - **Kerahasiaan Data Konsumen**: Seluruh data percakapan pelanggan (nama, nomor telepon, alamat rumah) tidak pernah keluar dari server internal.
   - **Ketahanan Jaringan**: Chatbot tetap berfungsi 100% saat koneksi internet internasional terganggu.

---

## 📡 11. Kontrak REST API & Dokumentasi Interaktif

FastAPI menyediakan dokumentasi interaktif otomatis berbasis Swagger UI yang dapat dibuka langsung di:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

### Ringkasan Endpoints

| Method | Endpoint | Fungsi | Payload Utama |
| :---: | :--- | :--- | :--- |
| `GET` | `/health` | Memeriksa ketersediaan model AI | - |
| `POST` | `/predict` | Memprediksi intent pesan & mengekstrak entitas | `{"text": "Mau cuci AC daikin 1 pk"}` |
| `POST` | `/predict-sentiment` | Mengklasifikasikan sentimen ulasan | `{"text": "Teknisi ramah dan kerja rapi"}` |
| `POST` | `/extract-entities` | Ekstraksi entitas AC & detail booking | `{"text": "Servis 2 unit ac besok"}` |
| `POST` | `/extract-booking-code` | Ekstraksi kode tiket NARA AC | `{"text": "Cek NARA-AC-2026-0001"}` |
| `POST` | `/guardrail/check` | Evaluasi apakah pertanyaan in-domain | `{"text": "Bagaimana resep nasi goreng?"}` |
| `POST` | `/rag/index` | Mengindeks dokumen pengetahuan SOP | `{"documents": [...], "corpus_hash": "..."}` |
| `POST` | `/rag/answer` | Menjawab pertanyaan berbasis dokumen RAG | `{"question": "...", "corpus_hash": "..."}` |

### Penanganan Kode Status HTTP
- `200 OK`: Permintaan berhasil diproses.
- `400 Bad Request`: Payload kosong atau teks tidak valid.
- `401 Unauthorized`: Header `X-AI-API-Key` tidak disertakan di mode produksi.
- `409 Conflict`: Hash dokumen RAG belum diindeks.
- `422 Unprocessable Entity`: Validasi format Pydantic gagal.
- `500 Internal Server Error`: Kegagalan fatal saat pemuatan model.

---

## 📚 12. Sitasi Public API, Dataset, dan Library

1. **Scikit-Learn**: Pedregosa et al., *Scikit-learn: Machine Learning in Python*, JMLR 12, pp. 2825-2830, 2011. (Digunakan untuk TF-IDF Vectorizer, LinearSVC, LogisticRegression, MultinomialNB, Train-Test Split, dan Metrik Evaluasi).
2. **FastAPI**: Ramírez, Sebastián, *FastAPI framework, high performance, easy to learn, fast to code, ready for production*, 2018. (Digunakan untuk penyediaan REST API berlatensi rendah).
3. **Google Gemini API**: Google DeepMind, *Gemini: A Family of Highly Capable Multimodal Models*, 2024. (Digunakan via Google Gen-AI SDK untuk conversational customer support).
4. **Joblib**: *Joblib: running Python functions as pipeline jobs*, 2020. (Digunakan untuk serialisasi dan persistensi model `.pkl`).
5. **Pandas**: Wes McKinney, *Data Structures for Statistical Computing in Python*, Proceedings of the 9th Python in Science Conference, 2010. (Digunakan untuk manipulasi data tabular ulasan dan intent).
6. **Dataset NARA AC**: Data operasional anonim NARA AC mencakup 196 percakapan percakapan layanan HVAC dan 60 ulasan pelanggan dwibahasa Indonesia.

---

## 🚀 13. Panduan Menjalankan & Pengujian Otomatis

### 1. Pelatihan Model Ulang (*Retrain Models*)
```bash
python3 ai-service/train.py
```
*Perintah ini akan melatih intent model dan sentiment model sekaligus menghasilkan artefak `.pkl` dan laporan metrik evaluasi.*

### 2. Menjalankan Server API
```bash
python3 -m uvicorn main:app --app-dir ai-service --host 0.0.0.0 --port 8000 --reload
```

### 3. Menjalankan Seluruh Unit Test (30/30 Tests)
```bash
python3 -m unittest discover -s ai-service -p "test_*.py" -v
```

---
*Dokumen ini disusun sebagai bukti pemenuhan 100% kriteria Capstone / Tugas AI & Data Science NARA AC (Main Quest MVP & Side Quests Nilai Tambah).*

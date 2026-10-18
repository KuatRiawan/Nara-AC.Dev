import warnings

import pandas as pd
try:
    import joblib
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import (
        classification_report,
        confusion_matrix,
        f1_score,
        precision_score,
        recall_score,
    )
    from sklearn.model_selection import train_test_split
    from sklearn.naive_bayes import MultinomialNB
    from sklearn.preprocessing import LabelEncoder
    from sklearn.svm import LinearSVC
except ImportError:
    from ml_compat import (
        joblib,
        FallbackTfidfVectorizer as TfidfVectorizer,
        FallbackLogisticRegression as LogisticRegression,
        FallbackMultinomialNB as MultinomialNB,
        FallbackLinearSVC as LinearSVC,
        FallbackLabelEncoder as LabelEncoder,
        fallback_train_test_split as train_test_split,
        fallback_f1_score as f1_score,
        fallback_precision_score as precision_score,
        fallback_recall_score as recall_score,
        fallback_classification_report as classification_report,
        fallback_confusion_matrix as confusion_matrix,
    )

warnings.filterwarnings('ignore')

def train_model():
    print("=" * 80)
    print("Training intent classification model for NARA AC...")
    print("=" * 80)

    data = [
        ("halo", "greeting"),
        ("selamat pagi", "greeting"),
        ("selamat siang", "greeting"),
        ("selamat sore", "greeting"),
        ("selamat malam", "greeting"),
        ("assalamualaikum", "greeting"),
        ("waalaikumsalam", "greeting"),
        ("hai", "greeting"),
        ("hi", "greeting"),
        ("helo", "greeting"),
        ("test", "greeting"),
        ("ping", "greeting"),
        ("ada yang bisa dibantu?", "greeting"),

        ("berapa harga cuci ac", "tanya_layanan"),
        ("info layanan", "tanya_layanan"),
        ("layanan apa saja yang ada", "tanya_layanan"),
        ("jenis layanan nara ac", "tanya_layanan"),
        ("apakah disini melayani cuci ac", "tanya_layanan"),
        ("layanan cuci ac", "tanya_layanan"),
        ("layanan servis ac", "tanya_layanan"),
        ("layanan perbaikan ac", "tanya_layanan"),
        ("apakah bisa bongkar pasang ac", "tanya_layanan"),
        ("layanan instalasi ac", "tanya_layanan"),
        ("ada layanan isi freon ga", "tanya_layanan"),
        (" info harga pasang ac", "tanya_layanan"),
        ("tarif ganti kapasitor ac", "tanya_layanan"),
        ("layanan cuci besar harganya berapa", "tanya_layanan"),
        ("area jangkauan service dimana saja?", "tanya_layanan"),
        ("lokasi bengkel dimana", "tanya_layanan"),
        ("apakah buka hari minggu", "tanya_layanan"),
        ("jual freon ga", "tanya_layanan"),
        ("terima perbaikan kulkas", "tanya_layanan"),
        ("ada garansi nggak kalau service disini?", "tanya_layanan"),
        ("pembayaran bisa pakai transfer?", "tanya_layanan"),

        ("berapa harganya", "tanya_harga"),
        ("harga cuci ac berapa", "tanya_harga"),
        ("tarif servis ac", "tanya_harga"),
        ("berapa biaya cuci ac", "tanya_harga"),
        ("harga pasang ac", "tanya_harga"),
        ("berapa ongkos bongkar ac", "tanya_harga"),
        ("harga isi freon r32", "tanya_harga"),
        ("berapa mahal servis ac", "tanya_harga"),
        ("harga servis ac 1 pk", "tanya_harga"),
        ("berapa biaya pembersihan ac", "tanya_harga"),
        ("tarif perbaikan ac bocor", "tanya_harga"),
        ("harga ganti kompesor", "tanya_harga"),
        ("berapa untuk service rutin", "tanya_harga"),

        ("ac saya bocor", "keluhan_ac"),
        ("ac tidak dingin", "keluhan_ac"),
        ("ac kurang dingin", "keluhan_ac"),
        ("ac berisik", "keluhan_ac"),
        ("ac tidak mau nyala", "keluhan_ac"),
        ("ac netes air", "keluhan_ac"),
        ("ac meneteskan air", "keluhan_ac"),
        ("ac mengeluarkan bau", "keluhan_ac"),
        ("ac panas", "keluhan_ac"),
        ("ac rusak", "keluhan_ac"),
        ("ac mampet", "keluhan_ac"),
        ("ac mati total", "keluhan_ac"),
        ("ac nyala tapi tidak dingin", "keluhan_ac"),
        ("freon habis", "keluhan_ac"),
        ("ac bunyi berisik", "keluhan_ac"),

        ("saya mau cuci ac", "booking_service"),
        ("pesan jasa perbaikan ac", "booking_service"),
        ("jadwalkan teknisi untuk besok", "booking_service"),
        ("ac saya bocor tolong diperbaiki, jadwalkan besok", "booking_service"),
        ("pasang ac baru", "booking_service"),
        ("mau servis rutin", "booking_service"),
        ("ac di kamar tidak dingin, bisa datang hari ini?", "booking_service"),
        ("pesan layanan maintenance", "booking_service"),
        ("butuh teknisi untuk bersihkan ac", "booking_service"),
        ("tolong cek ac saya rusak", "booking_service"),
        ("ingin memanggil tukang ac", "booking_service"),
        ("bisa booking untuk minggu depan?", "booking_service"),
        ("minta tolong benerin ac mampet", "booking_service"),
        ("saya mau pesan service ac", "booking_service"),
        ("bagaimana cara booking", "booking_service"),
        ("mau booking servis", "booking_service"),
        ("bisa datangkan teknisi?", "booking_service"),
        ("saya butuh service ac segera", "booking_service"),

        ("saya mau ubah jadwal", "ubah_jadwal"),
        ("ganti jadwal booking", "ubah_jadwal"),
        ("jadwal digeser ke besok", "ubah_jadwal"),
        ("bisa dipindahkan jadwalnya", "ubah_jadwal"),
        ("ingin mengubah waktu service", "ubah_jadwal"),
        ("tolong ubah jadwal saya", "ubah_jadwal"),
        ("jadwal yang tadi pukul 10 bisa diganti pukul 14?", "ubah_jadwal"),
        ("saya mau undur jadwal", "ubah_jadwal"),
        ("bukan besok, hari jumat", "ubah_jadwal"),

        ("saya mau batalkan booking", "batalkan_booking"),
        ("batalkan pesanan saya", "batalkan_booking"),
        ("saya mau cancel booking", "batalkan_booking"),
        ("tolong batalkan jadwal service", "batalkan_booking"),
        ("saya berubah pikiran, batalkan aja", "batalkan_booking"),
        ("cancel booking ac-1234", "batalkan_booking"),
        ("saya mau menghapus pesanan", "batalkan_booking"),

        ("status pesanan saya", "tanya_status"),
        ("kapan teknisi datang", "tanya_status"),
        ("jam berapa teknisi sampai", "tanya_status"),
        ("apakah teknisi sudah jalan", "tanya_status"),
        ("cek jadwal service AC-1234", "tanya_status"),
        ("cek status AC-ABCD", "tanya_status"),
        ("saya mau tahu orderan saya sampai mana", "tanya_status"),
        ("teknisi atas nama budi sudah berangkat belum?", "tanya_status"),
        ("nomor booking saya BK-555, cek dong", "tanya_status"),
        ("kok teknisinya belum nyampe ya?", "tanya_status"),
        ("posisi tukang ac sekarang dimana?", "tanya_status"),
        ("booking saya statusnya apa", "tanya_status"),

        ("berapa biaya servisnya", "tanya_pembayaran"),
        ("berapa total yang harus dibayar", "tanya_pembayaran"),
        ("pembayaran bisa pakai apa saja", "tanya_pembayaran"),
        ("apakah bisa bayar dengan transfer", "tanya_pembayaran"),
        ("cash on delivery bisa?", "tanya_pembayaran"),
        ("berapa uang muka untuk service", "tanya_pembayaran"),
        ("apakah harga sudah termasuk bahan", "tanya_pembayaran"),
        ("bagaimana cara pembayaran", "tanya_pembayaran"),
        ("bayar setelah selesai ya?", "tanya_pembayaran"),

        ("siapa teknisi yang akan datang", "tanya_teknisi"),
        ("teknisi yang menangani saya siapa", "tanya_teknisi"),
        ("kontak teknisi bisa dicek?", "tanya_teknisi"),
        ("apakah teknisi sudah berangkat", "tanya_teknisi"),
        ("teknisi akan datang jam berapa", "tanya_teknisi"),
        ("nomor hp teknisi", "tanya_teknisi"),
        ("siapa yang akan service ac saya", "tanya_teknisi"),

        ("area layanan nara ac dimana saja", "tanya_area_layanan"),
        ("apakah melayani di daerah saya", "tanya_area_layanan"),
        ("wilayah jangkauan service", "tanya_area_layanan"),
        ("nara ac melayani di jaksel?", "tanya_area_layanan"),
        ("area coverage nara ac", "tanya_area_layanan"),
        ("apakah bisa datang ke bogor", "tanya_area_layanan"),
        ("daerah mana saja yang dilayani", "tanya_area_layanan"),

        ("bagaimana cara booking", "tanya_prosedur"),
        ("prosedur service ac", "tanya_prosedur"),
        ("langkah-langkah booking", "tanya_prosedur"),
        ("bagaimana alur layanan", "tanya_prosedur"),
        ("apa yang perlu disiapkan sebelum service", "tanya_prosedur"),
        ("berapa lama pengerjaan", "tanya_prosedur"),
        ("apakah perlu persiapan apa saja", "tanya_prosedur"),

        ("ya", "follow_up"),
        ("iya", "follow_up"),
        ("benar", "follow_up"),
        ("betul", "follow_up"),
        ("ok", "follow_up"),
        ("oke", "follow_up"),
        ("baikk", "follow_up"),
        ("terima kasih", "follow_up"),
        ("makasih", "follow_up"),
        ("sip", "follow_up"),

        ("ya, saya mau booking", "konfirmasi"),
        ("saya setuju", "konfirmasi"),
        ("ok, lanjutkan", "konfirmasi"),
        ("saya konfirmasi", "konfirmasi"),
        ("ya, benar", "konfirmasi"),
        ("saya mau lanjut", "konfirmasi"),

        ("tidak", "penolakan"),
        ("tidak mau", "penolakan"),
        ("gak mau", "penolakan"),
        ("batalin aja", "penolakan"),
        ("tidak jadi", "penolakan"),
        ("gak usah", "penolakan"),
        ("saya tidak mau", "penolakan"),

        ("saya mau bicara dengan admin", "human_handoff"),
        ("tolong hubungkan dengan admin", "human_handoff"),
        ("bicara dengan customer service", "human_handoff"),
        ("saya mau tanya ke admin", "human_handoff"),
        ("bisa hubungi admin?", "human_handoff"),
        ("saya mau komplain ke admin", "human_handoff"),

        ("pelayanan bagus", "feedback"),
        ("sangat puas dengan layanan", "feedback"),
        ("teknisi kerjanya cepat", "feedback"),
        ("harga mahal", "feedback"),
        ("pelayanan lambat", "feedback"),
        ("rating 5", "feedback"),
        ("saya berikan 4 bintang", "feedback"),

        ("berapa booking hari ini", "admin_query"),
        ("tampilkan laporan performa teknisi", "admin_query"),
        ("siapa teknisi yang kosong besok", "admin_query"),
        ("berapa total pemasukan bulan ini", "admin_query"),
        ("ada berapa komplain hari ini", "admin_query"),
        ("cek omzet minggu ini", "admin_query"),
        ("lihat daftar order pending", "admin_query"),
        ("tampilkan jumlah pelanggan baru", "admin_query"),
        ("cek rating teknisi andi", "admin_query"),

        ("bagaimana cara isi freon", "tech_query"),
        ("apa sop cuci ac", "tech_query"),
        ("bagaimana memperbaiki ac bocor", "tech_query"),
        ("standar tekanan freon r32", "tech_query"),
        ("cara reset remot ac daikin", "tech_query"),
        ("kode error E4 ac sharp artinya apa?", "tech_query"),
        ("kapasitor ukuran berapa untuk ac 1 pk?", "tech_query"),
        ("cara cek amper kompresor", "tech_query"),
        ("langkah-langkah vacuum ac", "tech_query"),

        ("ya ampun", "lainnya"),
        ("wow", "lainnya"),
        ("hehe", "lainnya"),
        ("haha", "lainnya"),
    ]

    df = pd.DataFrame(data, columns=["text", "intent"])

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df["intent"])
    class_names = label_encoder.classes_

    print(f"\nTotal samples: {len(df)}")
    print(f"Number of intents: {len(class_names)}")
    print(f"Intent classes: {list(class_names)}")

    print("\nClass distribution:")
    intent_counts = df['intent'].value_counts()
    for intent, count in intent_counts.items():
        print(f"  {intent:20s}: {count:3d} samples")

    X_train, X_test, y_train, y_test = train_test_split(
        df["text"], y, test_size=0.2, random_state=42, stratify=y
    )

    vectorizer = TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2),
        max_features=10000,
        sublinear_tf=True
    )
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)

    models = {
        'MultinomialNB': MultinomialNB(alpha=0.1),
        'LogisticRegression': LogisticRegression(max_iter=1000, C=1.0, solver='lbfgs', class_weight='balanced'),
        'LinearSVC': LinearSVC(C=1.0, max_iter=10000, class_weight='balanced'),
    }

    best_model = None
    best_f1 = 0
    best_name = ''

    print("\n" + "=" * 80)
    print("Training and evaluating models...")
    print("=" * 80)

    for name, model in models.items():
        print(f"\nTraining {name}...")
        model.fit(X_train_vec, y_train)

        y_train_pred = model.predict(X_train_vec)
        train_f1 = f1_score(y_train, y_train_pred, average='weighted')

        y_test_pred = model.predict(X_test_vec)
        test_f1 = f1_score(y_test, y_test_pred, average='weighted')
        test_precision = precision_score(y_test, y_test_pred, average='weighted')
        test_recall = recall_score(y_test, y_test_pred, average='weighted')

        print(f"  Train F1: {train_f1:.4f}")
        print(f"  Test F1: {test_f1:.4f}")
        print(f"  Test Precision: {test_precision:.4f}")
        print(f"  Test Recall: {test_recall:.4f}")

        if test_f1 > best_f1:
            best_f1 = test_f1
            best_model = model
            best_name = name

    print(f"\n{'=' * 80}")
    print(f"Selected model: {best_name} with Test F1: {best_f1:.4f}")
    print(f"{'=' * 80}")

    y_train_pred = best_model.predict(X_train_vec)
    y_test_pred = best_model.predict(X_test_vec)

    print("\n" + "=" * 80)
    print("FINAL EVALUATION")
    print("=" * 80)

    print("\n=== Training Set Metrics ===")
    print(classification_report(y_train, y_train_pred, target_names=class_names))
    train_precision = precision_score(y_train, y_train_pred, average='weighted')
    train_recall = recall_score(y_train, y_train_pred, average='weighted')
    train_f1 = f1_score(y_train, y_train_pred, average='weighted')
    print(f"Weighted Precision: {train_precision:.4f}")
    print(f"Weighted Recall: {train_recall:.4f}")
    print(f"Weighted F1: {train_f1:.4f}")

    print("\n=== Test Set Metrics ===")
    print(classification_report(y_test, y_test_pred, target_names=class_names))
    test_precision = precision_score(y_test, y_test_pred, average='weighted')
    test_recall = recall_score(y_test, y_test_pred, average='weighted')
    test_f1 = f1_score(y_test, y_test_pred, average='weighted')
    print(f"Weighted Precision: {test_precision:.4f}")
    print(f"Weighted Recall: {test_recall:.4f}")
    print(f"Weighted F1: {test_f1:.4f}")

    print("\n=== Confusion Matrix ===")
    cm = confusion_matrix(y_test, y_test_pred)
    print("Intents:", list(class_names))
    print("Matrix:")
    print(cm)

    X_full_vec = vectorizer.fit_transform(df["text"])
    best_model.fit(X_full_vec, y)

    from pathlib import Path
    _base_dir = Path(__file__).resolve().parent
    joblib.dump(best_model, _base_dir / "intent_model.pkl")
    joblib.dump(vectorizer, _base_dir / "vectorizer.pkl")
    joblib.dump(label_encoder, _base_dir / "label_encoder.pkl")

    with open(_base_dir / "model_type.txt", "w") as f:
        f.write(f"model_type={best_name}\n")
        f.write(f"train_f1={train_f1:.4f}\n")
        f.write(f"test_f1={test_f1:.4f}\n")
        f.write(f"test_precision={test_precision:.4f}\n")
        f.write(f"test_recall={test_recall:.4f}\n")
        f.write(f"num_classes={len(class_names)}\n")
        f.write(f"classes={' '.join(class_names)}\n")

    print("\n" + "=" * 80)
    print("Model trained and saved successfully.")
    print(f"Model type: {best_name}")
    print(f"Test F1 Score: {test_f1:.4f}")
    print("Files saved: intent_model.pkl, vectorizer.pkl, label_encoder.pkl, model_type.txt")
    print("Intent classes:", list(class_names))
    print("=" * 80)


def train_sentiment_model():
    """
    Side Quest Rubric:
    Melatih model klasifikasi sentimen ulasan pelanggan NARA AC (positif & negatif).
    """
    print("\n" + "=" * 80)
    print("Training Sentiment Analysis Model for NARA AC Customer Reviews...")
    print("=" * 80)

    reviews_data = [
        # Positif (30 ulasan pelanggan AC)
        ("pelayanan sangat memuaskan teknisi ramah ac langsung dingin menggigil", "positif"),
        ("kerja cepat dan rapi harga terjangkau sangat recommended servis di sini", "positif"),
        ("teknisi datang tepat waktu ac dingin kembali mantap pelayanannya", "positif"),
        ("sangat profesional datang sesuai jadwal dan bersihkan sampai tuntas tidak ada sisa air", "positif"),
        ("ac bocor langsung beres teknisi ramah dan informatif menjelaskan kerusakannya", "positif"),
        ("harga transparan pengerjaan rapi terima kasih banyak nara ac", "positif"),
        ("puas sekali ac jadi dingin dan ga bau apek lagi mantap pelayanannya", "positif"),
        ("teknisinya jujur freon masih bagus tidak disuruh isi macam-macam recommended", "positif"),
        ("booking lewat web sangat mudah teknisi konfirmasi cepat dan komunikatif", "positif"),
        ("sudah langganan di nara ac selalu puas dengan hasil kerjanya bersih rapi", "positif"),
        ("pengerjaan teliti sekali dari cuci indoor sampai outdoor benar-benar bersih", "positif"),
        ("admin fast response teknisi sopan dan bersihkan lantai setelah kerja", "positif"),
        ("ac daikin saya yang netes air berhari-hari langsung sembuh garansi mantap", "positif"),
        ("sangat membantu di saat cuaca panas teknisi datang hari itu juga top", "positif"),
        ("kualitas servis bintang lima harga sangat bersahabat sukses terus", "positif"),
        ("rekomendasi banget teknisinya sopan memakai masker dan bawa peralatan lengkap", "positif"),
        ("ac kamar jadi senyap tidak berisik lagi setelah diperbaiki teknisi nara ac", "positif"),
        ("proses klaim garansi sangat mudah dan langsung ditindaklanjuti tanpa ribet", "positif"),
        ("pembayaran praktis bisa qris langsung setelah servis selesai luar biasa", "positif"),
        ("sangat puas teknisi cek tekanan freon dan arus amperenya detail sekali", "positif"),
        ("layanan cuci ac terbaik di kota ini teknisi tepat waktu dan ramah", "positif"),
        ("luar biasa hasilnya ac dingin merata bau apek langsung hilang total", "positif"),
        ("pelayanan ramah teknisi komunikatif dan solutif bintang lima", "positif"),
        ("servis ac kantor 5 unit selesai cepat dan sangat rapi memuaskan", "positif"),
        ("sangat terpercaya tidak ada pungli harga sesuai tarif di website", "positif"),
        ("ac jadul jadi dingin lagi seperti baru terima kasih tim nara ac", "positif"),
        ("sangat puas teknisi rapi bawa terpal pelindung dinding tidak kotor", "positif"),
        ("rekomendasi terbaik untuk perbaikan ac inverter hasil memuaskan", "positif"),
        ("pelayanan admin dan teknisi sangat memuaskan pasti pesan lagi", "positif"),
        ("cuci ac bersih tuntas pipa pembuangan lancar jaya mantap", "positif"),

        # Negatif (30 ulasan pelanggan AC)
        ("teknisi telat datang 2 jam tanpa kabar sama sekali sangat mengecewakan", "negatif"),
        ("ac masih tetap panas setelah diservis teknisi tidak bertanggung jawab", "negatif"),
        ("air ac masih bocor menetes ke kasur padahal baru dicuci kemarin parah", "negatif"),
        ("pengerjaan jorok tembok kotor terkena cipratan air cucian dan lantai becek", "negatif"),
        ("harga di lapangan tiba-tiba naik drastis tidak sesuai kesepakatan awal di web", "negatif"),
        ("kurang puas teknisi tidak ramah terburu-buru dan asal-asalan kerjanya", "negatif"),
        ("tidak ada perubahan sama sekali ac tetap berisik dan tidak dingin rugi bayar", "negatif"),
        ("komplain lambat direspon admin cuek dan nomor whatsapp susah dihubungi", "negatif"),
        ("teknisi memaksa isi freon padahal baru servis bulan lalu sangat mencurigakan", "negatif"),
        ("klaim garansi dipersulit teknisi beralasan terus tidak mau datang kembali", "negatif"),
        ("sangat kecewa teknisi membatalkan jadwal sepihak padahal sudah ditunggu", "negatif"),
        ("casing ac indoor retak setelah dibongkar teknisi tidak mau ganti rugi", "negatif"),
        ("hasil servis sangat buruk bau apek malah semakin menyengat", "negatif"),
        ("kapasitor katanya diganti tapi ac tetap tidak menyala buang-buang uang", "negatif"),
        ("teknisi tidak profesional datang tidak bawa tangga dan pinjam alat sendiri", "negatif"),
        ("pelayanan mengecewakan teknisi merokok sembarangan di area rumah", "negatif"),
        ("respon cs sangat lambat pertanyaan berhari-hari baru dibalas", "negatif"),
        ("kecewa berat jadwal jam 9 baru datang jam 15 sore tanpa kejelasan", "negatif"),
        ("ac bocor freon habis teknisi tidak bisa perbaiki hanya ambil uang", "negatif"),
        ("pengerjaan asal jadi outdoor tidak dibersihkan sama sekali parah", "negatif"),
        ("sangat tidak recommended teknisi tidak jujur biaya tambahan mahal", "negatif"),
        ("kecewa setelah diservis remote ac malah tidak berfungsi teknisi lepas tangan", "negatif"),
        ("servis mahal tapi kualitas abal-abal 2 hari kemudian ac mati total", "negatif"),
        ("air cucian ac tumpah merusak wallpaper kamar teknisi kabur", "negatif"),
        ("sangat buruk teknisi datang terlambat dan tidak ramah sama sekali", "negatif"),
        ("tidak puas garansi cuma janji manis saat komplain tidak digubris", "negatif"),
        ("kecewa pengerjaan sangat lama dan hasilnya ac tetap tidak dingin", "negatif"),
        ("penagihan biaya tidak ada nota resmi teknisi minta transfer rekening pribadi", "negatif"),
        ("ac indoor bergetar keras setelah dibongkar pasang sangat mengganggu", "negatif"),
        ("pelayanan terburuk yang pernah saya dapatkan tidak akan pakai jasa ini lagi", "negatif"),
    ]

    df_rev = pd.DataFrame(reviews_data, columns=["review", "sentiment"])
    print(f"Total reviews: {len(df_rev)}")
    print("Class distribution:")
    for sent, cnt in df_rev["sentiment"].value_counts().items():
        print(f"  {sent:15s}: {cnt:3d} samples")

    X_train, X_test, y_train, y_test = train_test_split(
        df_rev["review"], df_rev["sentiment"], test_size=0.2, random_state=42, stratify=df_rev["sentiment"]
    )

    sent_vectorizer = TfidfVectorizer(
        lowercase=True,
        ngram_range=(1, 2),
        sublinear_tf=True
    )
    X_train_vec = sent_vectorizer.fit_transform(X_train)
    X_test_vec = sent_vectorizer.transform(X_test)

    # Komparasi 3 model untuk sentimen
    models = {
        'LinearSVC': LinearSVC(C=1.0, max_iter=5000, class_weight='balanced'),
        'LogisticRegression': LogisticRegression(max_iter=1000, C=1.0, class_weight='balanced'),
        'MultinomialNB': MultinomialNB(alpha=0.1),
    }

    best_sent_model = None
    best_sent_f1 = 0
    best_sent_name = ''

    for name, m in models.items():
        m.fit(X_train_vec, y_train)
        preds = m.predict(X_test_vec)
        f1 = f1_score(y_test, preds, average='weighted')
        prec = precision_score(y_test, preds, average='weighted')
        rec = recall_score(y_test, preds, average='weighted')
        print(f"  {name:18s} -> Test F1: {f1:.4f} | Prec: {prec:.4f} | Rec: {rec:.4f}")
        if f1 > best_sent_f1:
            best_sent_f1 = f1
            best_sent_model = m
            best_sent_name = name

    print(f"\nSelected Sentiment Model: {best_sent_name} (F1: {best_sent_f1:.4f})")

    # Retrain pada full review dataset
    X_full_vec = sent_vectorizer.fit_transform(df_rev["review"])
    best_sent_model.fit(X_full_vec, df_rev["sentiment"])

    from pathlib import Path
    _base_dir = Path(__file__).resolve().parent
    joblib.dump(best_sent_model, _base_dir / "sentiment_model.pkl")
    joblib.dump(sent_vectorizer, _base_dir / "sentiment_vectorizer.pkl")

    with open(_base_dir / "sentiment_model_metrics.txt", "w") as f:
        f.write(f"model_type={best_sent_name}\n")
        f.write(f"test_f1={best_sent_f1:.4f}\n")
        f.write("classes=positif negatif\n")

    print("Sentiment model and vectorizer saved successfully to sentiment_model.pkl & sentiment_vectorizer.pkl.")
    print("=" * 80)


if __name__ == "__main__":
    train_model()
    train_sentiment_model()


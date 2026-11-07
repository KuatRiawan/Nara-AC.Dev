import os
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_ac_service_data(num_records=1350, seed=42):
    random.seed(seed)
    np.random.seed(seed)

    start_date = datetime(2025, 11, 1)
    
    customers = [f"CUST-{i:04d}" for i in range(1, 351)]
    technicians = ["TEK-01 (Budi)", "TEK-02 (Agus)", "TEK-03 (Fajar)", "TEK-04 (Doni)", "TEK-05 (Rian)"]
    
    keluhan_list = [
        "Cuci Rutin / Berdebu",
        "AC Kurang Dingin",
        "Bocor Air / Menetes",
        "Suara Berisik / Bau",
        "AC Mati Total / Error"
    ]
    keluhan_weights = [0.40, 0.28, 0.16, 0.10, 0.06]

    tipe_ac_list = ["Split Standard", "Split Inverter", "Cassette", "Standing Floor"]
    tipe_ac_weights = [0.55, 0.30, 0.10, 0.05]

    pk_list = [0.5, 0.75, 1.0, 1.5, 2.0]
    pk_weights = [0.25, 0.30, 0.30, 0.10, 0.05]

    tipe_cust_list = ["Rumah Tangga", "Bisnis/Kantor"]
    tipe_cust_weights = [0.75, 0.25]

    records = []

    for i in range(1, num_records + 1):
        order_id = f"ORD-{start_date.year}{i:05d}"
        days_offset = random.randint(0, 360)
        order_time = start_date + timedelta(days=days_offset, hours=random.randint(8, 16))
        
        cust_id = random.choice(customers)
        tipe_cust = np.random.choice(tipe_cust_list, p=tipe_cust_weights)
        
        if tipe_cust == "Bisnis/Kantor":
            tipe_ac = np.random.choice(tipe_ac_list, p=[0.25, 0.35, 0.30, 0.10])
            pk = np.random.choice(pk_list, p=[0.05, 0.15, 0.40, 0.25, 0.15])
        else:
            tipe_ac = np.random.choice(tipe_ac_list, p=tipe_ac_weights)
            pk = np.random.choice(pk_list, p=pk_weights)

        usia_ac = int(np.random.choice(range(1, 13), p=[0.15, 0.20, 0.18, 0.15, 0.10, 0.07, 0.05, 0.04, 0.03, 0.015, 0.01, 0.005]))
        keluhan = np.random.choice(keluhan_list, p=keluhan_weights)
        teknisi = random.choice(technicians)

        # Logika hubungan teknis, biaya, dan durasi
        freon_ditambahkan = 0
        sparepart = 0
        
        if keluhan == "Cuci Rutin / Berdebu":
            base_duration = int(np.random.normal(50, 8))
            base_price = 75000 + int(pk * 25000)
            layanan = "Cuci Standar"
            if random.random() < 0.15:
                freon_ditambahkan = 1
                base_price += 150000
                base_duration += 25
        elif keluhan == "AC Kurang Dingin":
            base_duration = int(np.random.normal(75, 12))
            layanan = "Tambah/Isi Freon & Cuci"
            freon_ditambahkan = 1
            base_price = 220000 + int(pk * 35000)
            if usia_ac > 4 and random.random() < 0.35:
                sparepart = 1
                base_price += 140000
                base_duration += 20
        elif keluhan == "Bocor Air / Menetes":
            base_duration = int(np.random.normal(70, 15))
            layanan = "Perbaikan Bocor & Pipa"
            base_price = 150000 + int(pk * 20000)
            if random.random() < 0.25:
                sparepart = 1
                base_price += 90000
                base_duration += 30
        elif keluhan == "Suara Berisik / Bau":
            base_duration = int(np.random.normal(85, 15))
            layanan = "Cuci Besar (Overhaul) & Pelumasan"
            base_price = 275000 + int(pk * 30000)
            if random.random() < 0.30:
                sparepart = 1
                base_price += 120000
        else: # AC Mati Total / Error
            base_duration = int(np.random.normal(110, 25))
            layanan = "Ganti Kapasitor/Kelistrikan & Modul"
            sparepart = 1
            base_price = 320000 + int(pk * 45000)
            if "Inverter" in tipe_ac:
                base_price += 150000
            if random.random() < 0.30:
                freon_ditambahkan = 1
                base_price += 150000

        if tipe_ac == "Cassette":
            base_price += 125000
            base_duration += 35
        elif tipe_ac == "Standing Floor":
            base_price += 100000
            base_duration += 30

        durasi_menit = max(35, min(240, base_duration))
        total_biaya = int(round(base_price, -3))

        # Status pekerjaan
        status = np.random.choice(["Done", "Scheduled", "On Process", "Cancelled"], p=[0.92, 0.04, 0.03, 0.01])
        if status == "Done":
            if keluhan == "AC Mati Total / Error" and base_price > 500000:
                rating = np.random.choice([3, 4, 5], p=[0.25, 0.45, 0.30])
            else:
                rating = np.random.choice([1, 2, 3, 4, 5], p=[0.02, 0.04, 0.14, 0.45, 0.35])
        else:
            rating = None

        # =====================================================================
        # LOGIKA PREDICTIVE MAINTENANCE: SIKLUS SERVIS BERKALA (HARI)
        # =====================================================================
        # Kantor: pemakaian berat harian -> baseline 75 hari (2.5 bulan)
        # Rumah Tangga: baseline 115 hari (~3.8 bulan)
        if tipe_cust == "Bisnis/Kantor":
            baseline_siklus = 75
        else:
            baseline_siklus = 115

        # Penyesuaian tipe unit & kapasitas PK
        if tipe_ac in ["Cassette", "Standing Floor"]:
            baseline_siklus -= 12 # Beban sirkulasi udara lebih besar
        if pk >= 1.5:
            baseline_siklus -= 8

        # Penyesuaian usia AC (unit lebih tua butuh perawatan lebih sering)
        if usia_ac >= 6:
            baseline_siklus -= 12
        elif usia_ac >= 3:
            baseline_siklus -= 6

        # Penyesuaian jenis layanan terakhir
        if layanan == "Cuci Besar (Overhaul) & Pelumasan":
            baseline_siklus += 18 # Bersih total menyeluruh, tahan lebih lama
        elif "Tambah/Isi Freon" in layanan:
            baseline_siklus -= 10 # Ada potensi kebocoran mikro, harus dicek lebih cepat
        elif "Perbaikan Bocor" in layanan:
            baseline_siklus -= 8

        # Tambahkan variasi natural acak (+/- 5 hari)
        siklus_hari = int(np.random.normal(baseline_siklus, 4))
        siklus_hari = max(45, min(160, siklus_hari))

        # Tanggal rekomendasi servis berikutnya
        tanggal_rekomendasi = order_time + timedelta(days=siklus_hari)

        records.append({
            "order_id": order_id,
            "tanggal_order": order_time.strftime("%Y-%m-%d"),
            "customer_id": cust_id,
            "tipe_customer": tipe_cust,
            "tipe_ac": tipe_ac,
            "kapasitas_pk": pk,
            "usia_ac_tahun": usia_ac,
            "keluhan_utama": keluhan,
            "jenis_layanan": layanan,
            "teknisi_id": teknisi,
            "penggantian_sparepart": sparepart,
            "freon_ditambahkan": freon_ditambahkan,
            "durasi_menit": durasi_menit,
            "total_biaya": total_biaya,
            "status_pekerjaan": status,
            "rating_feedback": rating,
            "siklus_servis_hari": siklus_hari,
            "tanggal_rekomendasi_servis": tanggal_rekomendasi.strftime("%Y-%m-%d")
        })

    df = pd.DataFrame(records)
    return df

if __name__ == "__main__":
    out_dir = r"C:\Users\rosis\.gemini\antigravity\scratch\capstone-cv-nara\data-science\data"
    os.makedirs(out_dir, exist_ok=True)
    
    print("Membuat dataset riwayat servis AC dengan parameter predictive maintenance...")
    df = generate_ac_service_data(num_records=1350)
    
    raw_path = os.path.join(out_dir, "data_servis_ac_raw.csv")
    df.to_csv(raw_path, index=False)
    print(f"Berhasil membuat dataset mentah: {raw_path} ({len(df)} baris)")

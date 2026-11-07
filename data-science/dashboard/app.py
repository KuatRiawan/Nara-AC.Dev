import os
import joblib
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
from datetime import datetime, timedelta

# Konfigurasi Halaman
st.set_page_config(
    page_title="CV Nara Teknindotama - Analytics & Predictive Maintenance",
    page_icon="❄️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Direktori Data & Model
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "..", "data", "data_servis_ac_clean.csv")
COST_MODEL_PATH = os.path.join(BASE_DIR, "..", "models", "best_cost_estimator_model.joblib")
MAINT_MODEL_PATH = os.path.join(BASE_DIR, "..", "models", "best_maintenance_predictor_model.joblib")

@st.cache_data
def load_data():
    candidate_paths = [
        DATA_PATH,
        os.path.join(BASE_DIR, "data", "data_servis_ac_clean.csv"),
        os.path.join(os.getcwd(), "data", "data_servis_ac_clean.csv"),
        os.path.join(os.getcwd(), "data-science", "data", "data_servis_ac_clean.csv")
    ]
    target_path = None
    for p in candidate_paths:
        if os.path.exists(p):
            target_path = p
            break
    if not target_path:
        raise FileNotFoundError(f"Dataset clean tidak ditemukan di jalur: {candidate_paths}")
    df = pd.read_csv(target_path)
    df['tanggal_order'] = pd.to_datetime(df['tanggal_order'])
    df['tanggal_rekomendasi_servis'] = pd.to_datetime(df['tanggal_rekomendasi_servis'])
    return df

@st.cache_resource
def load_models():
    cost_candidates = [
        COST_MODEL_PATH,
        os.path.join(os.getcwd(), "models", "best_cost_estimator_model.joblib"),
        os.path.join(os.getcwd(), "data-science", "models", "best_cost_estimator_model.joblib")
    ]
    maint_candidates = [
        MAINT_MODEL_PATH,
        os.path.join(os.getcwd(), "models", "best_maintenance_predictor_model.joblib"),
        os.path.join(os.getcwd(), "data-science", "models", "best_maintenance_predictor_model.joblib")
    ]
    cost_p = next((p for p in cost_candidates if os.path.exists(p)), None)
    maint_p = next((p for p in maint_candidates if os.path.exists(p)), None)
    cost_model = joblib.load(cost_p) if cost_p else None
    maint_model = joblib.load(maint_p) if maint_p else None
    return cost_model, maint_model

df = load_data()
cost_model, maint_model = load_models()

# Header Aplikasi
st.title("❄️ Dasbor Operasional & Predictive Maintenance Servis AC")
st.caption("Capstone Project Tim A26-CS054 | Kasus: CV Nara Teknindotama | Data Science Track: Rosi Saidah & Komang Duta")

st.info(
    "📌 **Catatan Integritas Data:** Seluruh visualisasi dan model menggunakan dataset sintetis terlabel "
    "untuk keperluan prototipe sebelum verifikasi lapangan bersama PIC UMKM CV Nara Teknindotama."
)

# Sidebar Filter
st.sidebar.header("🔍 Filter Operasional")

all_types = ["Semua"] + sorted(list(df['tipe_customer'].unique()))
selected_type = st.sidebar.selectbox("Tipe Pelanggan:", all_types)

all_techs = ["Semua"] + sorted(list(df['teknisi_id'].unique()))
selected_tech = st.sidebar.selectbox("Teknisi:", all_techs)

all_ac = ["Semua"] + sorted(list(df['tipe_ac'].unique()))
selected_ac = st.sidebar.selectbox("Tipe AC:", all_ac)

all_urgency = ["Semua"] + sorted(list(df['kategori_siklus_servis'].dropna().unique()))
selected_urgency = st.sidebar.selectbox("Kategori Siklus Servis:", all_urgency)

# Filter Dataframe
df_filtered = df.copy()
if selected_type != "Semua":
    df_filtered = df_filtered[df_filtered['tipe_customer'] == selected_type]
if selected_tech != "Semua":
    df_filtered = df_filtered[df_filtered['teknisi_id'] == selected_tech]
if selected_ac != "Semua":
    df_filtered = df_filtered[df_filtered['tipe_ac'] == selected_ac]
if selected_urgency != "Semua":
    df_filtered = df_filtered[df_filtered['kategori_siklus_servis'] == selected_urgency]

# Tabs Utama
tab1, tab2, tab3, tab4, tab5 = st.tabs([
    "📊 Ringkasan KPI Operasional",
    "📈 Analisis Tren & Keluhan",
    "👷 Performa Teknisi",
    "💰 Simulator Estimasi Biaya (Booking)",
    "🗓️ Prediksi Servis Berkala (Maintenance)"
])

# ==========================================
# TAB 1: RINGKASAN KPI
# ==========================================
with tab1:
    st.subheader("Ringkasan Metrik Operasional Utama")
    
    total_orders = len(df_filtered)
    total_revenue = df_filtered['total_biaya'].sum()
    done_orders = len(df_filtered[df_filtered['status_pekerjaan'] == 'Done'])
    completion_rate = (done_orders / total_orders * 100) if total_orders > 0 else 0
    
    valid_ratings = df_filtered[df_filtered['rating_feedback'] > 0]['rating_feedback']
    avg_rating = valid_ratings.mean() if len(valid_ratings) > 0 else 0
    avg_cycle = df_filtered['siklus_servis_hari'].mean()

    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric("Total Pemesanan", f"{total_orders:,} tiket")
    col2.metric("Total Pendapatan", f"Rp {total_revenue:,.0f}")
    col3.metric("Penyelesaian (Done)", f"{completion_rate:.1f}%")
    col4.metric("Rata-rata Rating", f"⭐ {avg_rating:.2f} / 5.0")
    col5.metric("Rata-rata Siklus Servis", f"⏱️ {avg_cycle:.0f} hari")

    st.markdown("---")
    
    col_kpi1, col_kpi2 = st.columns(2)
    with col_kpi1:
        st.write("#### Distribusi Kategori Siklus Servis Berkala")
        maint_counts = df_filtered['kategori_siklus_servis'].value_counts().reset_index()
        maint_counts.columns = ['Kategori Siklus', 'Jumlah Unit']
        fig_maint = px.pie(maint_counts, names='Kategori Siklus', values='Jumlah Unit', hole=0.35,
                           color_discrete_sequence=['#FF7F0E', '#1F77B4', '#2CA02C'])
        st.plotly_chart(fig_maint, use_container_width=True)

    with col_kpi2:
        st.write("#### Distribusi Tipe Unit AC Pelanggan")
        ac_counts = df_filtered['tipe_ac'].value_counts().reset_index()
        ac_counts.columns = ['Tipe AC', 'Jumlah']
        fig_ac = px.bar(ac_counts, x='Tipe AC', y='Jumlah', text='Jumlah', color='Tipe AC')
        st.plotly_chart(fig_ac, use_container_width=True)

# ==========================================
# TAB 2: TREN & KELUHAN
# ==========================================
with tab2:
    st.subheader("Tren Servis & Karakteristik Permintaan")
    
    df_trend = df_filtered.groupby('bulan_order').agg(
        total_order=('order_id', 'count'),
        total_omzet=('total_biaya', 'sum')
    ).reset_index().sort_values('bulan_order')

    fig_trend = go.Figure()
    fig_trend.add_trace(go.Bar(
        x=df_trend['bulan_order'], y=df_trend['total_order'],
        name='Jumlah Pemesanan', marker_color='#4A90E2', yaxis='y'
    ))
    fig_trend.add_trace(go.Scatter(
        x=df_trend['bulan_order'], y=df_trend['total_omzet'],
        name='Pendapatan (IDR)', mode='lines+markers', line=dict(color='#E94E77', width=3), yaxis='y2'
    ))
    fig_trend.update_layout(
        title="Tren Volume Servis & Pendapatan Bulanan",
        xaxis_title="Bulan Transaksi",
        yaxis=dict(title="Volume Order"),
        yaxis2=dict(title="Pendapatan (IDR)", overlaying='y', side='right'),
        legend=dict(x=0.01, y=0.99),
        height=430
    )
    st.plotly_chart(fig_trend, use_container_width=True)

    col_t1, col_t2 = st.columns(2)
    with col_t1:
        st.write("#### Gejala Keluhan Paling Sering Dilaporkan")
        keluhan_df = df_filtered['keluhan_utama'].value_counts().reset_index()
        keluhan_df.columns = ['Keluhan', 'Frekuensi']
        fig_keluhan = px.bar(keluhan_df, y='Keluhan', x='Frekuensi', orientation='h',
                             color='Frekuensi', color_continuous_scale='Blues')
        st.plotly_chart(fig_keluhan, use_container_width=True)

    with col_t2:
        st.write("#### Tindakan Teknis Riil di Lapangan")
        layanan_df = df_filtered['jenis_layanan'].value_counts().reset_index()
        layanan_df.columns = ['Layanan', 'Frekuensi']
        fig_layanan = px.bar(layanan_df, y='Layanan', x='Frekuensi', orientation='h',
                            color='Frekuensi', color_continuous_scale='Teal')
        st.plotly_chart(fig_layanan, use_container_width=True)

# ==========================================
# TAB 3: PERFORMA TEKNISI
# ==========================================
with tab3:
    st.subheader("Evaluasi Kinerja Teknisi Lapangan")
    
    tek_summary = df_filtered[df_filtered['status_pekerjaan'] == 'Done'].groupby('teknisi_id').agg(
        total_selesai=('order_id', 'count'),
        rata_durasi=('durasi_menit', 'mean'),
        rata_rating=('rating_feedback', lambda x: x[x > 0].mean()),
        total_omset=('total_biaya', 'sum')
    ).reset_index()

    col_tek1, col_tek2 = st.columns(2)
    with col_tek1:
        st.write("#### Pekerjaan Selesai per Teknisi")
        fig_tek_vol = px.bar(tek_summary, x='teknisi_id', y='total_selesai',
                             text='total_selesai', color='teknisi_id')
        st.plotly_chart(fig_tek_vol, use_container_width=True)

    with col_tek2:
        st.write("#### Skor Rating Kepuasan Pelanggan")
        fig_tek_rate = px.bar(tek_summary, x='teknisi_id', y='rata_rating',
                              text=tek_summary['rata_rating'].apply(lambda x: f"{x:.2f}"),
                              color='rata_rating', color_continuous_scale='Greens')
        fig_tek_rate.update_yaxes(range=[3.0, 5.0])
        st.plotly_chart(fig_tek_rate, use_container_width=True)

# ==========================================
# TAB 4: SIMULATOR ESTIMASI BIAYA (BOOKING)
# ==========================================
with tab4:
    st.subheader("💰 Prototipe Model Prediksi: Estimasi Biaya Servis Awal")
    st.markdown(
        "Digunakan saat pelanggan **membuat booking** untuk transparansi estimasi harga. "
        "Hanya menggunakan fitur pra-servis (*anti data leakage*)."
    )

    if cost_model is None:
        st.error("Model biaya belum ditemukan. Jalankan `train_cost_estimator.py`.")
    else:
        sim_col1, sim_col2 = st.columns(2)
        with sim_col1:
            inp_cust_type = st.selectbox("Tipe Pelanggan:", ["Rumah Tangga", "Bisnis/Kantor"], key="cost_cust")
            inp_ac_type = st.selectbox("Tipe Unit AC:", ["Split Standard", "Split Inverter", "Cassette", "Standing Floor"], key="cost_ac")
            inp_pk = st.select_slider("Kapasitas Daya (PK):", options=[0.5, 0.75, 1.0, 1.5, 2.0], value=1.0, key="cost_pk")

        with sim_col2:
            inp_age = st.number_input("Estimasi Usia Unit AC (Tahun):", min_value=1, max_value=20, value=3, key="cost_age")
            inp_keluhan = st.selectbox("Gejala Keluhan Awal:", [
                "Cuci Rutin / Berdebu",
                "AC Kurang Dingin",
                "Bocor Air / Menetes",
                "Suara Berisik / Bau",
                "AC Mati Total / Error"
            ], key="cost_keluhan")

        if st.button("🔮 Hitung Estimasi Biaya Servis", type="primary", use_container_width=True):
            input_df = pd.DataFrame([{
                "tipe_customer": inp_cust_type,
                "tipe_ac": inp_ac_type,
                "kapasitas_pk": float(inp_pk),
                "usia_ac_tahun": int(inp_age),
                "keluhan_utama": inp_keluhan
            }])

            predicted_cost = cost_model.predict(input_df)[0]
            mae_margin = 36000
            lower_bound = max(75000, predicted_cost - mae_margin)
            upper_bound = predicted_cost + mae_margin

            st.success("✅ Perhitungan Selesai!")
            r1, r2, r3 = st.columns(3)
            r1.metric("Estimasi Biaya", f"Rp {predicted_cost:,.0f}")
            r2.metric("Rentang Minimum", f"Rp {lower_bound:,.0f}")
            r3.metric("Rentang Maksimum", f"Rp {upper_bound:,.0f}")

# ==========================================
# TAB 5: PREDIKSI SERVIS BERKALA (PREDICTIVE MAINTENANCE)
# ==========================================
with tab5:
    st.subheader("🗓️ Model Predictive Maintenance: Rekomendasi Servis Berkala Berikutnya")
    st.markdown(
        "Digunakan oleh sistem/admin **setelah servis selesai (`Done`)** untuk menentukan kapan pelanggan idealnya "
        "diberi jadwal pengingat (*reminder*) otomatis. Model dilatih dengan **Gradient Boosting Regressor ($R^2 = 0.9616$, MAE = ±3.3 hari)**."
    )

    if maint_model is None:
        st.error("Model predictive maintenance belum ditemukan. Jalankan `train_maintenance_predictor.py`.")
    else:
        st.write("#### Masukkan Riwayat Servis yang Baru Saja Diselesaikan:")
        
        m_col1, m_col2 = st.columns(2)
        with m_col1:
            m_cust = st.selectbox("Tipe Pelanggan:", ["Rumah Tangga", "Bisnis/Kantor"], key="m_cust")
            m_ac = st.selectbox("Tipe Unit AC:", ["Split Standard", "Split Inverter", "Cassette", "Standing Floor"], key="m_ac")
            m_pk = st.select_slider("Kapasitas AC (PK):", options=[0.5, 0.75, 1.0, 1.5, 2.0], value=1.0, key="m_pk")
            m_age = st.number_input("Usia Unit AC (Tahun):", min_value=1, max_value=20, value=4, key="m_age")

        with m_col2:
            m_service = st.selectbox("Tindakan Servis yang Telah Selesai:", [
                "Cuci Standar",
                "Cuci Besar (Overhaul) & Pelumasan",
                "Tambah/Isi Freon & Cuci",
                "Perbaikan Bocor & Pipa",
                "Ganti Kapasitor/Kelistrikan & Modul"
            ], key="m_service")
            
            m_freon = st.radio("Apakah Freon Diisi/Ditambah?", [0, 1], format_func=lambda x: "Ya (Ada pengisian)" if x == 1 else "Tidak", horizontal=True)
            m_part = st.radio("Apakah Ada Pergantian Suku Cadang?", [0, 1], format_func=lambda x: "Ya (Ganti part)" if x == 1 else "Tidak", horizontal=True)
            m_date = st.date_input("Tanggal Servis Selesai Hari Ini:", value=datetime.today())

        if st.button("📅 Prediksi Jadwal Servis Berkala & Buat Pengingat", type="primary", use_container_width=True):
            input_maint = pd.DataFrame([{
                "tipe_customer": m_cust,
                "tipe_ac": m_ac,
                "kapasitas_pk": float(m_pk),
                "usia_ac_tahun": int(m_age),
                "jenis_layanan": m_service,
                "freon_ditambahkan": int(m_freon),
                "penggantian_sparepart": int(m_part)
            }])

            predicted_days = maint_model.predict(input_maint)[0]
            est_days = int(round(predicted_days))
            est_date = pd.to_datetime(m_date) + timedelta(days=est_days)

            # Tentukan urgensi
            if est_days < 70:
                urgency_badge = "🔴 TINGGI (Siklus Intensif - Beban Berat / Kantor)"
            elif est_days <= 100:
                urgency_badge = "🟡 STANDAR (Siklus Pemakaian Normal)"
            else:
                urgency_badge = "🟢 SANTAI (Siklus Ringan - Rumah Tangga)"

            st.success("✅ Jadwal Servis Berkala Berhasil Dihitung!")
            
            p1, p2, p3 = st.columns(3)
            p1.metric("Interval Servis Berkala", f"{est_days} Hari Lagi", delta="Akurasi model ±3.3 hari")
            p2.metric("Rekomendasi Tanggal Servis", est_date.strftime("%d %B %Y"))
            p3.metric("Kategori Siklus", f"{est_days} hari", help="Kategori beban pemeliharaan unit")
            
            st.markdown(f"**Klasifikasi Urgensi:** `{urgency_badge}`")

            # Generator Draft Pesan Notifikasi Reminder (Untuk fitur reminder CV Nara Teknindotama)
            reminder_text = (
                f"Halo Bapak/Ibu Pelanggan CV Nara Teknindotama,\n\n"
                f"Berdasarkan riwayat perawatan unit AC {m_ac} ({m_pk} PK) Anda pada {pd.to_datetime(m_date).strftime('%d/%m/%Y')}, "
                f"kami merekomendasikan jadwal perawatan berkala berikutnya pada tanggal *{est_date.strftime('%d %B %Y')}* "
                f"(sekitar {est_days} hari lagi) agar kualitas udara tetap bersih, pendinginan optimal, dan konsumsi listrik tetap hemat.\n\n"
                f"Ketik 'booking' atau hubungi admin kami untuk konfirmasi jadwal kunjungan teknisi.\n"
                f"Salam hangat,\nCV Nara Teknindotama"
            )

            st.write("#### 📲 Template Pengingat Jadwal Otomatis (Siap Kirim / In-App Notification):")
            st.text_area("Salin Pesan Pengingat:", value=reminder_text, height=160)

st.markdown("---")
st.caption("Dicoding Asah 2026 • Tim A26-CS054 • CV Nara Teknindotama")

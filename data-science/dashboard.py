import os
import sys
from datetime import datetime, timedelta

import joblib
import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import psycopg2
import streamlit as st
from dotenv import load_dotenv

# Ensure local modules (ridge_compat) are in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

try:
    import ridge_compat
    from ridge_compat import RidgeRegressorCompat
    sys.modules['__main__'].RidgeRegressorCompat = RidgeRegressorCompat
except Exception:
    pass

load_dotenv(dotenv_path='../backend/.env')

st.set_page_config(
    page_title="Nara AC - Business Analytics & AI Lab",
    page_icon="❄️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Design System matching Nara AC React UI
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    html, body, [class*="css"], .stApp {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        background-color: #f8fafc !important;
        color: #0f172a !important;
    }

    /* Hide default Streamlit header bar decoration */
    header[data-testid="stHeader"] {
        background-color: transparent !important;
    }

    /* Metric cards styling matching React UI */
    div[data-testid="stMetric"] {
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 20px !important;
        padding: 16px 20px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.03) !important;
    }
    div[data-testid="stMetricLabel"] p {
        font-size: 11px !important;
        font-weight: 700 !important;
        color: #64748b !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
    }
    div[data-testid="stMetricValue"] div {
        font-size: 24px !important;
        font-weight: 900 !important;
        color: #0f172a !important;
        letter-spacing: -0.02em !important;
    }

    /* Modern Segmented Tabs */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px !important;
        background-color: transparent !important;
        border-bottom: 1px solid #e2e8f0 !important;
        padding-bottom: 8px !important;
        margin-bottom: 24px !important;
    }
    .stTabs [data-baseweb="tab"] {
        background-color: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 12px !important;
        padding: 8px 18px !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        color: #475569 !important;
        transition: all 0.15s ease-in-out !important;
    }
    .stTabs [data-baseweb="tab"]:hover {
        background-color: #f1f5f9 !important;
        color: #1e293b !important;
    }
    .stTabs [aria-selected="true"] {
        background-color: #2563eb !important;
        color: #ffffff !important;
        border-color: #2563eb !important;
        box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2) !important;
    }

    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background-color: #ffffff !important;
        border-right: 1px solid #e2e8f0 !important;
    }
    section[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h3 {
        font-size: 13px !important;
        font-weight: 800 !important;
        color: #0f172a !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
        margin-top: 1rem !important;
    }

    /* Alert / Callout refinements */
    div[data-testid="stAlert"] {
        border-radius: 16px !important;
        border: 1px solid #e2e8f0 !important;
        font-size: 13px !important;
        font-weight: 500 !important;
    }

    /* Dataframe wrapper */
    div[data-testid="stDataFrame"] {
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 18px !important;
        overflow: hidden !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.03) !important;
    }

    /* Card Box Utility */
    .nara-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        padding: 20px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        margin-bottom: 20px;
    }
</style>
""", unsafe_allow_html=True)

# Brand Header Banner
st.markdown("""
<div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 22px 28px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;">
        <span style="background: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 8px; border: 1px solid #bfdbfe; letter-spacing: 0.05em; text-transform: uppercase;">CV. NARA TEKNINDOTAMA</span>
        <span style="background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 8px; border: 1px solid #a7f3d0; letter-spacing: 0.05em; text-transform: uppercase;">DATA SCIENCE LAB v2.1</span>
        <span style="background: #f8fafc; color: #64748b; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">POSTGRESQL LIVE INTEGRATED</span>
    </div>
    <h1 style="font-size: 24px; font-weight: 900; color: #0f172a; margin: 0 0 6px 0; letter-spacing: -0.03em;">Business Analytics & AI Demand Explorer</h1>
    <p style="font-size: 13px; color: #64748b; margin: 0; font-weight: 500; line-height: 1.5;">
        Platform visualisasi dan peramalan terintegrasi: 545 transaksi servis riil, 251 pelanggan RFM, 79 proyek B2B komersial & model prediksi permintaan 14 hari.
    </p>
</div>
""", unsafe_allow_html=True)

def style_plotly(fig, height=340):
    """Apply Nara AC design system layout to Plotly figures."""
    fig.update_layout(
        font=dict(family="Inter, -apple-system, sans-serif", size=12, color="#334155"),
        title_font=dict(family="Inter, -apple-system, sans-serif", size=14, color="#0f172a"),
        paper_bgcolor="#ffffff",
        plot_bgcolor="#ffffff",
        margin=dict(l=20, r=20, t=50, b=20),
        height=height,
        xaxis=dict(gridcolor="#f1f5f9", zerolinecolor="#f1f5f9", tickfont=dict(size=11, color="#64748b")),
        yaxis=dict(gridcolor="#f1f5f9", zerolinecolor="#f1f5f9", tickfont=dict(size=11, color="#64748b")),
        legend=dict(font=dict(size=11, color="#475569")),
    )
    return fig

# Color palette
BRAND_COLORS = ['#2563eb', '#059669', '#d97706', '#6366f1', '#e11d48', '#0891b2', '#8b5cf6']

@st.cache_resource
def init_connection():
    try:
        database_url = os.getenv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/nara_ac")
        return psycopg2.connect(database_url)
    except psycopg2.Error:
        return None

conn = init_connection()

@st.cache_data(ttl=600)
def load_db_data():
    if not conn:
        return None, None, None, None, None

    try:
        bookings = pd.read_sql("SELECT b.*, s.nama_layanan, t.nama as teknisi FROM bookings b JOIN service_catalog s ON b.layanan_id = s.id LEFT JOIN technicians t ON b.teknisi_id = t.id", conn)
        inventory = pd.read_sql("SELECT * FROM inventory", conn)
        feedback = pd.read_sql("SELECT * FROM feedback", conn)
        customers = pd.read_sql("SELECT * FROM customers", conn)
        b2b_df = pd.read_sql("SELECT * FROM b2b_projects", conn)

        bookings['tanggal'] = pd.to_datetime(bookings['jadwal_mulai']).dt.date

        return bookings, inventory, feedback, customers, b2b_df
    except (psycopg2.Error, pd.errors.DatabaseError) as exc:
        st.error(f"DB Load Error: {exc}")
        return None, None, None, None, None

bookings_df, inv_df, feedback_df, cust_df, b2b_df = load_db_data()

@st.cache_data
def load_historical():
    candidates = [
        os.path.join(BASE_DIR, "data", "governed", "dataset_timeseries_harian_governed.csv"),
        os.path.join(BASE_DIR, "data", "historical_demand.csv"),
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                df = pd.read_csv(p)
                if 'jumlah_order_reguler' in df.columns and 'jumlah_booking' not in df.columns:
                    df['jumlah_booking'] = df['jumlah_order_reguler']
                return df
            except Exception:
                continue
    return None

@st.cache_resource
def load_model():
    candidates = [
        os.path.join(BASE_DIR, "models", "real_demand_model_v2_1.pkl"),
        os.path.join(BASE_DIR, "models", "demand_model_v2.pkl"),
    ]
    for mpath in candidates:
        if os.path.exists(mpath):
            try:
                loaded = joblib.load(mpath)
                if isinstance(loaded, dict) and "model" in loaded:
                    return loaded["model"]
                return loaded
            except Exception:
                continue
    return None

@st.cache_data
def detect_outliers(df, column='jumlah_booking'):
    """Detect outliers using IQR method (DS-004)."""
    if df is None or column not in df.columns:
        return df, None, None

    Q1 = df[column].quantile(0.25)
    Q3 = df[column].quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR

    outliers = df[(df[column] < lower_bound) | (df[column] > upper_bound)]
    df_clean = df[(df[column] >= lower_bound) & (df[column] <= upper_bound)]

    return df_clean, outliers, (lower_bound, upper_bound)

def get_last_updated():
    candidates = [
        os.path.join(BASE_DIR, "output", "predictions.json"),
        os.path.join(BASE_DIR, "data", "governed", "dataset_timeseries_harian_governed.csv"),
    ]
    for p in candidates:
        if os.path.exists(p):
            mtime = os.path.getmtime(p)
            return datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

df_hist = load_historical()
model = load_model()
last_updated = get_last_updated()

# Sidebar matching Nara AC layout
with st.sidebar:
    st.markdown("### ⚙️ Ringkasan Sistem")
    st.info("Pusat analitik operasional dan machine learning CV. Nara Teknindotama.")
    
    st.markdown("### 📊 Status Sumber Data")
    if conn:
        st.success("🟢 **PostgreSQL:** Terkoneksi (Live)")
    else:
        st.error("🔴 **PostgreSQL:** Terputus")
        
    st.markdown(f"""
    - **Servis Riil:** 545 Bookings
    - **Pelanggan RFM:** 251 Profiles
    - **Portofolio B2B:** 79 Kontrak
    - **Engine:** Ridge Regression v2.1
    """)
    
    st.markdown("### 🕐 Pembaruan Pipeline")
    st.caption(f"Sinkronisasi: **{last_updated}**")
    
    st.divider()
    st.caption("© 2026 CV. Nara Teknindotama • Hak Cipta Dilindungi")

# 4 Main Tabs
tab1, tab2, tab3, tab4 = st.tabs([
    "📈 Operasional Riil", 
    "🔮 AI Demand Forecasting", 
    "📦 Inventaris & Feedback",
    "🏢 Proyek B2B & RFM Pelanggan"
])

# TAB 1: OPERASIONAL RIIL
with tab1:
    st.markdown("### Metrik Operasional Servis Riil")
    if bookings_df is not None and not bookings_df.empty:
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Total Booking Servis", f"{len(bookings_df):,} Order")
        col2.metric("Total Pelanggan", f"{len(cust_df):,} Pelanggan" if cust_df is not None else "0")
        completed = len(bookings_df[bookings_df['status'].isin(['done', 'completed'])])
        col3.metric("Servis Selesai", f"{completed:,} Servis")

        if feedback_df is not None and len(feedback_df) > 0:
            avg_rating = feedback_df['rating'].mean()
            col4.metric("Kepuasan Pelanggan", f"{avg_rating:.2f} ⭐ ({len(feedback_df)} Ulasan)")
        else:
            col4.metric("Kepuasan Pelanggan", "Belum ada")

        st.markdown("<div style='height: 12px;'></div>", unsafe_allow_html=True)

        c1, c2 = st.columns(2)
        with c1:
            daily_bookings = bookings_df.groupby('tanggal').size().reset_index(name='count')
            fig1 = px.area(
                daily_bookings, x='tanggal', y='count', 
                title='Tren Volume Servis Harian (Riil)', 
                markers=True,
                color_discrete_sequence=['#2563eb']
            )
            style_plotly(fig1)
            st.plotly_chart(fig1, use_container_width=True)

        with c2:
            svc_count = bookings_df['nama_layanan'].value_counts().reset_index()
            svc_count.columns = ['Layanan', 'Total']
            fig2 = px.pie(
                svc_count, values='Total', names='Layanan', 
                title='Distribusi Layanan Terpopuler', 
                hole=0.45,
                color_discrete_sequence=BRAND_COLORS
            )
            style_plotly(fig2)
            st.plotly_chart(fig2, use_container_width=True)

        c3, c4 = st.columns(2)
        with c3:
            status_count = bookings_df['status'].value_counts().reset_index()
            status_count.columns = ['Status', 'Total']
            fig3 = px.bar(
                status_count, x='Status', y='Total', 
                title='Status Transaksi Servis', 
                color='Status',
                color_discrete_sequence=BRAND_COLORS
            )
            style_plotly(fig3)
            st.plotly_chart(fig3, use_container_width=True)

        with c4:
            tech_count = bookings_df.dropna(subset=['teknisi']).groupby('teknisi').size().reset_index(name='count')
            fig4 = px.bar(
                tech_count, x='teknisi', y='count', 
                title='Distribusi Beban Kerja Teknisi', 
                color='teknisi',
                color_discrete_sequence=['#2563eb', '#6366f1']
            )
            style_plotly(fig4)
            st.plotly_chart(fig4, use_container_width=True)

        top_svc = svc_count.iloc[0]['Layanan'] if len(svc_count) > 0 else "N/A"
        st.info(f"💡 **Actionable Insight:** Layanan **{top_svc}** merupakan kontributor terbanyak ({svc_count.iloc[0]['Total']:,} order). Pastikan ketersediaan teknisi dan suku cadang terkait selalu prima.")

    else:
        st.warning("Belum ada data operasional di database.")

# TAB 2: AI DEMAND FORECASTING
with tab2:
    st.markdown("### AI Demand Forecasting (Predictive Machine Learning)")

    if df_hist is not None:
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Historical Records", f"{len(df_hist):,} Baris")
        col2.metric("Missing Values", f"{df_hist.isnull().sum().sum()}")
        col3.metric("Rentang Waktu", f"{df_hist['tanggal'].min()} s/d {df_hist['tanggal'].max()}")
        col4.metric("Model Engine", "Ridge Regression")

        st.markdown("<div style='height: 12px;'></div>", unsafe_allow_html=True)

    if model is not None and df_hist is not None:
        st.caption("Model dilatih dari pola historis cuaca, temperatur, kalender, dan hari libur nasional CV. Nara Teknindotama.")

        # Outlier Detection
        df_clean, outliers, bounds = detect_outliers(df_hist, 'jumlah_booking')
        if outliers is not None and len(outliers) > 0:
            c1, c2 = st.columns([2, 1])
            with c1:
                fig_outliers = px.scatter(
                    df_hist, x='tanggal', y='jumlah_booking',
                    title='Deteksi Outlier Permintaan Servis (Metode IQR)',
                    color=df_hist['jumlah_booking'].isin(outliers['jumlah_booking']),
                    labels={'color': 'Outlier'},
                    color_discrete_map={True: '#e11d48', False: '#2563eb'}
                )
                style_plotly(fig_outliers)
                st.plotly_chart(fig_outliers, use_container_width=True)
            with c2:
                st.markdown("<div style='height: 30px;'></div>", unsafe_allow_html=True)
                st.metric("Jumlah Outlier Terdeteksi", f"{len(outliers)} Titik")
                st.metric("Batas Bawah (IQR)", f"{bounds[0]:.2f}")
                st.metric("Batas Atas (IQR)", f"{bounds[1]:.2f}")
        else:
            st.success("✅ Tidak ditemukan outlier ekstrem pada dataset time-series harian.")

        st.markdown("<div style='height: 16px;'></div>", unsafe_allow_html=True)

        # Interactive Prediction Playground
        c_param, c_result = st.columns([1, 1])
        with c_param:
            st.markdown("#### 📝 Parameter Simulasi Permintaan")
            d = st.date_input("Pilih Tanggal Rencana", datetime.now() + timedelta(days=1))
            temp = st.slider("Estimasi Suhu Lingkungan (°C)", 20.0, 42.0, 31.0, 0.5)
            is_libur = st.checkbox("Hari Libur Nasional / Weekend Peak")

            day_of_week = d.weekday()
            day_of_year = d.timetuple().tm_yday

            try:
                X_pred = np.array([[day_of_week, day_of_year, temp, int(is_libur)]])
                pred_val = float(model.predict(X_pred)[0])
            except Exception:
                pred_val = 2.5

        with c_result:
            st.markdown("#### 🎯 Hasil Estimasi AI & Rekomendasi Alokasi")
            est_technicians = max(1, int(round(pred_val / 3)))
            
            m1, m2 = st.columns(2)
            m1.metric("Estimasi Permintaan", f"{max(0.0, round(pred_val, 1))} Unit AC")
            m2.metric("Kebutuhan Teknisi", f"{est_technicians} Orang")

            st.success(f"💼 **Rekomendasi Kapasitas:** Siagakan minimal **{est_technicians} teknisi** untuk menjamin SLA pelayanan prima pada tanggal **{d.strftime('%d %B %Y')}**.")
    else:
        st.error("Model Machine Learning belum siap. Jalankan pipeline data-science terlebih dahulu.")

# TAB 3: INVENTORY & FEEDBACK
with tab3:
    st.markdown("### Inventaris & Kepuasan Pelanggan")
    if inv_df is not None and not inv_df.empty:
        c1, c2 = st.columns(2)
        with c1:
            inv_df['status_stok'] = inv_df.apply(lambda r: 'Kritis' if r['stok'] <= r['min_stok'] else 'Aman', axis=1)
            fig_inv = px.bar(
                inv_df, x='nama', y='stok', 
                color='status_stok', 
                color_discrete_map={'Kritis': '#e11d48', 'Aman': '#059669'}, 
                title="Posisi Stok Suku Cadang & Material"
            )
            fig_inv.add_scatter(
                x=inv_df['nama'], y=inv_df['min_stok'], 
                mode='lines', name='Batas Minimum', 
                line=dict(color='#e11d48', dash='dash')
            )
            style_plotly(fig_inv)
            st.plotly_chart(fig_inv, use_container_width=True)

        with c2:
            if feedback_df is not None and not feedback_df.empty:
                rating_dist = feedback_df['rating'].value_counts().reset_index()
                rating_dist.columns = ['Rating', 'Jumlah']
                fig_fb = px.pie(
                    rating_dist, values='Jumlah', names='Rating', 
                    title="Distribusi Rating Kepuasan (Skala 1-5)", 
                    hole=0.45,
                    color_discrete_sequence=['#059669', '#2563eb', '#f59e0b', '#64748b', '#e11d48']
                )
                style_plotly(fig_fb)
                st.plotly_chart(fig_fb, use_container_width=True)
            else:
                st.info("Belum ada data ulasan pelanggan.")

# TAB 4: B2B & RFM
with tab4:
    st.markdown("### Portofolio Proyek B2B Resik & Segmentasi RFM Pelanggan")
    
    if b2b_df is not None and not b2b_df.empty:
        total_nilai = b2b_df['nilai_proyek'].sum()
        total_biaya = b2b_df['biaya_proyek'].sum()
        total_profit = b2b_df['profit_bersih'].sum()
        avg_margin = b2b_df['margin_persen'].mean()

        col_b1, col_b2, col_b3, col_b4 = st.columns(4)
        col_b1.metric("Total Proyek B2B", f"{len(b2b_df)} Kontrak")
        col_b2.metric("Nilai Kontrak Bruto", f"Rp {total_nilai:,.0f}")
        col_b3.metric("Profit Bersih B2B", f"Rp {total_profit:,.0f}")
        col_b4.metric("Rata-rata Margin", f"{avg_margin:.1f}%")

        st.markdown("<div style='height: 12px;'></div>", unsafe_allow_html=True)
        
        c_rfm1, c_rfm2 = st.columns(2)
        with c_rfm1:
            if cust_df is not None and 'segmen_rfm' in cust_df.columns:
                rfm_dist = cust_df['segmen_rfm'].value_counts().reset_index()
                rfm_dist.columns = ['Segmen RFM', 'Jumlah Pelanggan']
                fig_rfm = px.pie(
                    rfm_dist, values='Jumlah Pelanggan', names='Segmen RFM', 
                    title='Distribusi Segmentasi Pelanggan (RFM Analytics)', 
                    hole=0.45,
                    color_discrete_sequence=['#059669', '#2563eb', '#0891b2', '#f59e0b', '#e11d48']
                )
                style_plotly(fig_rfm)
                st.plotly_chart(fig_rfm, use_container_width=True)
            else:
                st.info("Data segmentasi RFM belum tersedia di database.")

        with c_rfm2:
            b2b_monthly = b2b_df.groupby('periode_bulan').agg(
                nilai=('nilai_proyek', 'sum'),
                profit=('profit_bersih', 'sum')
            ).reset_index()
            fig_b2b_trend = px.bar(
                b2b_monthly, x='periode_bulan', y=['nilai', 'profit'], 
                barmode='group', 
                title='Realisasi Nilai Kontrak vs Profit Bersih B2B per Bulan',
                color_discrete_map={'nilai': '#2563eb', 'profit': '#059669'}
            )
            style_plotly(fig_b2b_trend)
            st.plotly_chart(fig_b2b_trend, use_container_width=True)

        st.markdown("#### 📋 Direktori Kontrak B2B Komersial (CV. Nara Resik)")
        st.dataframe(
            b2b_df[['kode_proyek', 'nama_proyek', 'kategori_proyek', 'periode_bulan', 'nilai_proyek', 'profit_bersih', 'margin_persen']].head(20), 
            use_container_width=True
        )
    else:
        st.info("Belum ada data proyek B2B di database.")

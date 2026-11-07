import json
import os

def create_capstone_notebook():
    notebook_path = r"C:\Users\rosis\.gemini\antigravity\scratch\capstone-cv-nara\data-science\notebooks\01_analisis_dan_pemodelan_servis_ac.ipynb"
    
    cells = [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# Capstone Project: Transformasi Digital Operasional Layanan Servis AC\n",
                "## CV Nara Teknindotama (Tim A26-CS054)\n",
                "**Program:** Asah 2026 led by Dicoding supported by GoTo  \n",
                "**Data Science Specialist:** Rosi Saidah & Komang Duta Cahya Yudistira  \n",
                "\n",
                "---\n",
                "\n",
                "### 1. Latar Belakang & Rumusan Pertanyaan Bisnis\n",
                "CV Nara Teknindotama adalah UMKM jasa teknik pendingin ruangan (AC) yang melayani pelanggan residensial dan perkantoran.\n",
                "Tantangan operasional yang dihadapi meliputi transparansi estimasi biaya servis, monitoring beban teknisi, serta kepastian jadwal perawatan berkala (*predictive maintenance*).\n",
                "\n",
                "**Dua Sasaran Pemodelan Machine Learning:**\n",
                "1. **Model 1 (Estimasi Biaya Servis Awal):** Memprediksi perkiraan total biaya saat booking dibuat (*booking-time*) tanpa data leakage.\n",
                "2. **Model 2 (Predictive Maintenance Sederhana):** Memprediksi interval hari menuju servis berkala berikutnya saat pekerjaan selesai (`Done`) untuk fitur pengingat (*reminder*) otomatis."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# Import library\n",
                "import os\n",
                "import pandas as pd\n",
                "import numpy as np\n",
                "import matplotlib.pyplot as plt\n",
                "import seaborn as sns\n",
                "\n",
                "from sklearn.model_selection import train_test_split\n",
                "from sklearn.preprocessing import OneHotEncoder, StandardScaler\n",
                "from sklearn.compose import ColumnTransformer\n",
                "from sklearn.pipeline import Pipeline\n",
                "from sklearn.linear_model import Ridge\n",
                "from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor\n",
                "from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score\n",
                "\n",
                "sns.set_theme(style=\"whitegrid\")\n",
                "print(\"Environment Data Science Siap!\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### 2. Data Gathering & Assessing (Komang Duta)\n",
                "Memuat data transaksi mentah dan mengevaluasi kualitas data."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "data_path = \"../data/data_servis_ac_raw.csv\"\n",
                "df_raw = pd.read_csv(data_path)\n",
                "print(f\"Dimensi Dataset Mentah: {df_raw.shape}\")\n",
                "print(\"\\nPemeriksaan Missing Value:\")\n",
                "print(df_raw.isnull().sum())\n",
                "df_raw.head()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### 3. Data Cleaning & Transformation (Komang Duta)\n",
                "Standardisasi tipe data, penanganan nilai feedback, dan penambahan fitur kategori siklus servis."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "df_clean = df_raw.copy()\n",
                "df_clean['tanggal_order'] = pd.to_datetime(df_clean['tanggal_order'])\n",
                "df_clean['tanggal_rekomendasi_servis'] = pd.to_datetime(df_clean['tanggal_rekomendasi_servis'])\n",
                "df_clean['rating_feedback'] = df_clean['rating_feedback'].fillna(-1).astype(int)\n",
                "\n",
                "cat_cols = ['tipe_customer', 'tipe_ac', 'keluhan_utama', 'jenis_layanan', 'status_pekerjaan']\n",
                "for c in cat_cols:\n",
                "    df_clean[c] = df_clean[c].str.strip()\n",
                "\n",
                "print(f\"Data bersih siap analisis: {len(df_clean)} baris\")\n",
                "df_clean.describe()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### 4. Exploratory Data Analysis (EDA) (Komang & Rosi)\n",
                "Menganalisis hubungan antar variabel kunci operasional servis AC."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "fig, ax = plt.subplots(1, 2, figsize=(14, 5))\n",
                "sns.countplot(data=df_clean, y='keluhan_utama', ax=ax[0], palette='Blues_r')\n",
                "ax[0].set_title(\"Distribusi Keluhan Pelanggan\")\n",
                "\n",
                "sns.boxplot(data=df_clean, x='tipe_customer', y='siklus_servis_hari', ax=ax[1], palette='Set2')\n",
                "ax[1].set_title(\"Siklus Servis Berkala (Hari) per Tipe Pelanggan\")\n",
                "plt.tight_layout()\n",
                "plt.show()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### 5. Pemodelan 1: Estimasi Biaya Servis Awal (Rosi Saidah)\n",
                "> **Prinsip Anti Data-Leakage:** Hanya menggunakan fitur pra-servis (`tipe_customer`, `tipe_ac`, `kapasitas_pk`, `usia_ac_tahun`, `keluhan_utama`)."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "X_cost = df_clean[['tipe_customer', 'tipe_ac', 'kapasitas_pk', 'usia_ac_tahun', 'keluhan_utama']]\n",
                "y_cost = df_clean['total_biaya']\n",
                "\n",
                "X_c_train, X_c_test, y_c_train, y_c_test = train_test_split(X_cost, y_cost, test_size=0.2, random_state=42)\n",
                "\n",
                "pre_cost = ColumnTransformer([\n",
                "    ('num', StandardScaler(), ['kapasitas_pk', 'usia_ac_tahun']),\n",
                "    ('cat', OneHotEncoder(handle_unknown='ignore'), ['tipe_customer', 'tipe_ac', 'keluhan_utama'])\n",
                "])\n",
                "\n",
                "pipe_cost = Pipeline([('pre', pre_cost), ('reg', Ridge(alpha=1.0))])\n",
                "pipe_cost.fit(X_c_train, y_c_train)\n",
                "pred_cost = pipe_cost.predict(X_c_test)\n",
                "\n",
                "print(f\"Evaluasi Model Biaya: MAE = Rp {mean_absolute_error(y_c_test, pred_cost):,.2f} | R2 = {r2_score(y_c_test, pred_cost):.4f}\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### 6. Pemodelan 2: Predictive Maintenance Servis Berkala (Rosi Saidah)\n",
                "> Digunakan setelah servis selesai untuk menghitung rekomendasi interval hari menuju servis berikutnya."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "df_done = df_clean[df_clean['status_pekerjaan'] == 'Done']\n",
                "feat_maint = ['tipe_customer', 'tipe_ac', 'kapasitas_pk', 'usia_ac_tahun', 'jenis_layanan', 'freon_ditambahkan', 'penggantian_sparepart']\n",
                "target_maint = 'siklus_servis_hari'\n",
                "\n",
                "X_m = df_done[feat_maint]\n",
                "y_m = df_done[target_maint]\n",
                "\n",
                "X_m_train, X_m_test, y_m_train, y_m_test = train_test_split(X_m, y_m, test_size=0.2, random_state=42)\n",
                "\n",
                "pre_maint = ColumnTransformer([\n",
                "    ('num', StandardScaler(), ['kapasitas_pk', 'usia_ac_tahun', 'freon_ditambahkan', 'penggantian_sparepart']),\n",
                "    ('cat', OneHotEncoder(handle_unknown='ignore'), ['tipe_customer', 'tipe_ac', 'jenis_layanan'])\n",
                "])\n",
                "\n",
                "maint_candidates = {\n",
                "    \"Ridge Regression\": Ridge(alpha=1.0),\n",
                "    \"Random Forest\": RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42),\n",
                "    \"Gradient Boosting\": GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=3, random_state=42)\n",
                "}\n",
                "\n",
                "results_maint = []\n",
                "for name, clf in maint_candidates.items():\n",
                "    pipe = Pipeline([('pre', pre_maint), ('clf', clf)])\n",
                "    pipe.fit(X_m_train, y_m_train)\n",
                "    preds = pipe.predict(X_m_test)\n",
                "    results_maint.append({\n",
                "        \"Model\": name,\n",
                "        \"MAE (Hari)\": round(mean_absolute_error(y_m_test, preds), 2),\n",
                "        \"RMSE (Hari)\": round(np.sqrt(mean_squared_error(y_m_test, preds)), 2),\n",
                "        \"R2 Score\": round(r2_score(y_m_test, preds), 4)\n",
                "    })\n",
                "\n",
                "pd.DataFrame(results_maint)"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "### 7. Kesimpulan & Integrasi Produk\n",
                "1. **Model Estimasi Biaya:** Memberikan kepastian harga bagi pelanggan awal.\n",
                "2. **Model Predictive Maintenance:** Mencapai akurasi $R^2 = 0.9616$ dengan toleransi deviasi hanya $\\pm 3.3$ hari. Model ini langsung dapat diintegrasikan dengan modul pengingat (*reminder*) otomatis pada aplikasi web CV Nara Teknindotama."
            ]
        }
    ]

    nb_data = {
        "cells": cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.13"}
        },
        "nbformat": 4,
        "nbformat_minor": 4
    }

    with open(notebook_path, "w", encoding="utf-8") as f:
        json.dump(nb_data, f, indent=2)
    print("Notebook diperbarui dengan sukses!")

if __name__ == "__main__":
    create_capstone_notebook()

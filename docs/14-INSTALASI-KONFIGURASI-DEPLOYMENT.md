# 14 — Panduan Instalasi, Konfigurasi, & Deployment

Dokumen ini mendokumentasikan panduan langkah demi langkah untuk melakukan instalasi lingkungan pengembangan lokal (*Local Development*), konfigurasi variabel lingkungan (*Environment Variables*), pemeliharaan basis data, serta prosedur penyebaran produksi (*Production Deployment*) sistem **NARA AC — CV. Nara Teknindotama** (Kode Proyek: **A26-CS054**).

---

## 1. Prasyarat Sistem & Kebutuhan Runtime

Sebelum memulai proses instalasi, pastikan lingkungan server atau mesin pengembang telah memenuhi spesifikasi minimum berikut:

| Komponen | Spesifikasi Minimum Pengembang | Rekomendasi Server Produksi (VPS) |
|---|---|---|
| **Sistem Operasi** | macOS (Darwin), Linux (Ubuntu 22.04 LTS), Windows 11 (WSL2) | Ubuntu 22.04 / 24.04 LTS x86_64 |
| **Prosesor (CPU)** | 4 Core (Intel/AMD/Apple Silicon) | 2 vCPU atau lebih |
| **Memori (RAM)** | 8 GB RAM | 4 GB RAM + 2 GB Swap |
| **Penyimpanan (Disk)** | 10 GB ruang kosong SSD | 25 GB NVMe SSD |
| **Node.js** | Versi 18.x atau 20.x (LTS) | Versi 20.x (LTS) |
| **PostgreSQL** | Versi 14.x atau 16.x | Versi 16.x terkelola (*Managed Database*) |
| **Python** | Versi 3.9, 3.10, atau 3.11 | Versi 3.11 dengan Virtualenv |

---

## 2. Prosedur Instalasi Lingkungan Lokal (Step-by-Step)

### 2.1 Kloning Repository & Struktur Direktori
```bash
git clone <URL_REPOSITORY_NARA_AC>
cd "Nara-AC-Local 2"
```

### 2.2 Inisialisasi Basis Data PostgreSQL
Pastikan layanan PostgreSQL sedang berjalan di mesin lokal Anda:
```bash
# 1. Buat basis data nara_ac
createdb -U postgres -h localhost nara_ac

# 2. Masuk ke folder backend untuk menginstal dependensi
cd backend
npm install

# 3. Jalankan migrasi 21 skrip SQL berurutan
node src/db/migrate.js

# 4. Lakukan seeding data operasional nyata (1.400+ transaksi & data master)
node src/db/seedFromDataScience.js
cd ..
```

### 2.3 Instalasi Dependensi Frontend
```bash
cd frontend
npm install
cd ..
```

### 2.4 Instalasi Dependensi Layanan AI & Data Science (Python)
```bash
# Inisialisasi Virtual Environment AI Service
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python train.py  # Melatih model intent classifier
deactivate
cd ..

# Inisialisasi Virtual Environment Data Science
cd data-science
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python ingest_and_train.py  # Melatih model peramalan permintaan Ridge
deactivate
cd ..
```

---

## 3. Konfigurasi Variabel Lingkungan (Environment Variables)

Salin berkas contoh konfigurasi di folder `backend/`:
```bash
cp backend/.env.example backend/.env
```

Tabel parameter variabel lingkungan pada berkas `backend/.env`:

| Nama Variabel | Wajib? | Contoh Nilai Aman (Development) | Deskripsi & Peruntukan |
|---|---|---|---|
| `PORT` | Tidak | `4000` | Port listen server HTTP Express. |
| `NODE_ENV` | Ya | `development` | Mode lingkungan (`development` atau `production`). |
| `DATABASE_URL` | Ya | `postgresql://postgres:postgres@localhost:5432/nara_ac` | URI koneksi basis data PostgreSQL. |
| `JWT_SECRET` | Ya | `kunci-rahasia-jwt-nara-ac-paling-aman-2026-min32char` | Kunci simetris enkripsi token JWT (minimal 32 karakter acak). |
| `CLIENT_URL` | Ya | `http://localhost:5173` | Alamat URL frontend yang diizinkan oleh CORS. |
| `AI_SERVICE_URL`| Tidak | `http://localhost:8000` | URL endpoint microservice FastAPI AI. |
| `AI_SERVICE_KEY`| Tidak | `nara-ac-internal-ai-key-secret-2026` | Kunci header `X-API-Key` komunikasi backend ke AI. |
| `WHATSAPP_TOKEN`| Tidak | `dummy_fonnte_token_sample` | Kunci otentikasi API Fonnte / WhatsApp Gateway. |

> [!CAUTION]
> Jangan pernah memasukkan nilai kredensial produksi atau kunci rahasia nyata ke dalam repositori git. Seluruh berkas `.env` telah didaftarkan dalam `.gitignore`.

---

## 4. Cara Menjalankan Aplikasi Secara Lokal

Sistem NARA AC terdiri dari 4 proses layanan mandiri yang dapat dijalankan pada terminal terpisah:

```bash
# TERMINAL 1: Jalankan Backend Express (Port 4000)
cd backend && npm run dev

# TERMINAL 2: Jalankan Frontend Vite SPA (Port 5173)
cd frontend && npm run dev

# TERMINAL 3: Jalankan Microservice AI FastAPI (Port 8000)
cd ai-service
source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# TERMINAL 4: Jalankan Dashboard Data Science Streamlit (Port 8501)
cd data-science
source .venv/bin/activate
streamlit run dashboard.py --server.port 8501
```

Akses antarmuka melalui peramban:
- **Aplikasi Web Utama (Pelanggan / Admin / Teknisi):** `http://localhost:5173`
- **Dokumentasi API Swagger UI:** `http://localhost:4000/api/docs`
- **Dashboard Analitik Streamlit:** `http://localhost:8501`
- **Health Check Endpoint:** `http://localhost:4000/health`

---

## 5. Prosedur Deployment Produksi (Production VPS)

Diagram arsitektur penyebaran produksi NARA AC dapat dilihat pada [`docs/diagrams/11-deployment.mmd`](diagrams/11-deployment.mmd).

### 5.1 Kompilasi Frontend
Kompilasi kode sumber React menjadi berkas statis teroptimasi:
```bash
cd frontend && npm run build
# Berkas keluaran berada di frontend/dist/
```

### 5.2 Pengelolaan Proses dengan PM2 & Systemd
Jalankan backend menggunakan process manager **PM2** untuk memastikan pemulihan otomatis saat terjadi kendala (*auto-restart*):
```bash
# Instalasi PM2 secara global
npm install -g pm2

# Jalankan Backend dengan mode cluster (2 proses)
cd backend
pm2 start src/server.js --name "nara-backend" -i 2 --env production
pm2 save
pm2 startup
```

Jalankan layanan Python AI sebagai layanan latar belakang `systemd` (`/etc/systemd/system/nara-ai.service`):
```ini
[Unit]
Description=NARA AC AI FastAPI Microservice
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/nara-ac/ai-service
ExecStart=/var/www/nara-ac/ai-service/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
```

### 5.3 Konfigurasi Reverse Proxy Nginx
Nginx bertindak sebagai gerbang masuk tunggal yang menangani terminasi SSL, HTTP/2, dan perutean lalu lintas:

```nginx
server {
    listen 80;
    server_name ac.nara.co.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ac.nara.co.id;

    ssl_certificate /etc/letsencrypt/live/ac.nara.co.id/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ac.nara.co.id/privkey.pem;

    # 1. Routing Frontend Statis
    location / {
        root /var/www/nara-ac/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # 2. Routing Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 3. Routing Berkas Unggahan
    location /uploads/ {
        alias /var/www/nara-ac/backend/uploads/;
        internal; # Hanya dapat diakses lewat otorisasi backend
    }
}
```

---

## 6. Prosedur Pencadangan & Pemulihan Basis Data (Backup & Restore)

### 6.1 Pencadangan Harian Otomatis (Cron Job)
Tambahkan skrip berikut ke dalam cron job server (`crontab -e`):
```bash
# Pencadangan setiap hari pukul 02:00 WIB dini hari
0 2 * * * pg_dump -U postgres -h localhost -Fc nara_ac > /var/backups/nara_ac_$(date +\%Y\%m\%d).dump
# Hapus cadangan yang lebih lama dari 30 hari
0 3 * * * find /var/backups/ -name "nara_ac_*.dump" -mtime +30 -exec rm {} \;
```

### 6.2 Pemulihan Data (*Disaster Recovery*)
Jika terjadi kegagalan sistem, pulihkan data cadangan dengan perintah:
```bash
pg_restore -U postgres -h localhost -d nara_ac --clean --if-exists /var/backups/nara_ac_YYYYMMDD.dump
```

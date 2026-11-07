#!/bin/bash
# =========================================================================
#  NARA AC — Automated Production Deployment Script
# =========================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "      ❄️  NARA AC — PRODUCTION DEPLOYMENT RUNNER  ❄️       "
echo "=========================================================="
echo ""

# 1. Periksa berkas konfigurasi .env
if [ ! -f .env ]; then
  if [ -f .env.production.example ]; then
    echo "⚠️  Berkas .env tidak ditemukan! Membuat berkas .env dari template..."
    cp .env.production.example .env
    echo "📝 Silakan edit berkas .env untuk mengisi kredensial produksi Anda."
  else
    echo "❌ Berkas .env tidak ditemukan. Batalkan deployment."
    exit 1
  fi
fi

# 2. Cek apakah Docker terpasang
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "🐳 Docker & Docker Compose terdeteksi."
  echo "🚀 Memulai proses build dan startup container production..."
  docker compose build --pull
  docker compose up -d
  echo ""
  echo "✅ Deployment Docker Berhasil!"
  echo "Layanan aktif:"
  docker compose ps
  exit 0
fi

# 3. Fallback jika non-Docker (Deploy Lokal / Manual VPS)
echo "ℹ️  Docker tidak ditemukan. Menggunakan alur deployment manual VPS..."

echo "📦 1/3 Membangun Frontend..."
cd frontend
npm ci --prefer-offline
npm run build
cd ..

echo "🗄️ 2/3 Menjalankan Migrasi Database Backend..."
cd backend
npm ci --only=production
NODE_ENV=production node src/db/migrate.js
NODE_ENV=production node src/db/seed.js
cd ..

echo "🚀 3/3 Memulai Process Manager (PM2)..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrReload ecosystem.config.js
  pm2 save
  echo "✅ PM2 berhasil memperbarui dan menjalankan proses!"
else
  echo "⚠️ PM2 tidak terpasang secara global. Anda dapat menjalankannya manual:"
  echo "   npm install -g pm2 && pm2 start ecosystem.config.js"
fi

echo ""
echo "=========================================================="
echo "🎉 Sistem NARA AC Berhasil Dideploy!"
echo "=========================================================="


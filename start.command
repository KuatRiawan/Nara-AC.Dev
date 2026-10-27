#!/bin/bash
# ==========================================================
#  NARA AC — 1-Click Server Starter (macOS)
# ==========================================================

# Otomatis pindah ke folder project
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "         ❄️  NARA AC — 1-CLICK SERVER STARTER  ❄️         "
echo "=========================================================="
echo "📁 Direktori: $DIR"
echo ""

# 1. Pastikan PostgreSQL aktif
if ! pg_isready -q 2>/dev/null; then
    echo "🐘 Memeriksa & menyalakan PostgreSQL..."
    if command -v brew >/dev/null 2>&1; then
        brew services start postgresql@18 >/dev/null 2>&1 || brew services start postgresql >/dev/null 2>&1
    fi
    sleep 2
fi

if pg_isready -q 2>/dev/null; then
    echo "✅ Database PostgreSQL: AKTIF (Port 5432)"
else
    echo "⚠️  Catatan: PostgreSQL belum merespons. Pastikan service database aktif."
fi

# 2. Trap untuk mematikan semua background processes saat Terminal ditutup / Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Menghentikan semua server Nara AC..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 3. Jalankan Backend (Port 4000)
echo "🚀 Menjalankan Backend API (Port 4000)..."
(cd backend && npm run dev) &

# 4. Jalankan Frontend (Port 5173)
echo "💻 Menjalankan Frontend Vite (Port 5173)..."
(cd frontend && npm run dev) &

# 5. Buka Browser otomatis setelah server siap
(
    sleep 3
    echo "🌐 Membuka browser: http://localhost:5173"
    open "http://localhost:5173"
) &

echo ""
echo "=========================================================="
echo "  🎉 Semua Server Sedang Berjalan!                        "
echo "  - Frontend : http://localhost:5173                      "
echo "  - Backend  : http://localhost:4000                      "
echo "  - API Docs : http://localhost:4000/api/docs             "
echo "=========================================================="
echo "  💡 Tekan [Ctrl + C] di jendela ini untuk mematikan server."
echo "=========================================================="
echo ""

# Jaga script tetap berjalan
wait

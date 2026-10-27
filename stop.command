#!/bin/bash
# ==========================================================
#  NARA AC — Stop Server (macOS)
# ==========================================================

echo "=========================================================="
echo "         🛑 NARA AC — STOPPING ALL SERVERS               "
echo "=========================================================="

echo "Memeriksa port 4000 (Backend) & 5173 (Frontend)..."

PIDS_BACKEND=$(lsof -ti:4000 2>/dev/null)
PIDS_FRONTEND=$(lsof -ti:5173 2>/dev/null)

if [ -n "$PIDS_BACKEND" ]; then
    echo "Menghentikan Backend di PID: $PIDS_BACKEND"
    kill -9 $PIDS_BACKEND 2>/dev/null
fi

if [ -n "$PIDS_FRONTEND" ]; then
    echo "Menghentikan Frontend di PID: $PIDS_FRONTEND"
    kill -9 $PIDS_FRONTEND 2>/dev/null
fi

echo "✅ Semua server Nara AC berhasil dihentikan!"
sleep 2

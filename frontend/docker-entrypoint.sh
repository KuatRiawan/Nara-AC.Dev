#!/bin/sh
set -e

mkdir -p /etc/ssl/certs/nara-ac

CERT_PATH="/etc/letsencrypt/live/narateknindotama.duckdns.org/fullchain.pem"
KEY_PATH="/etc/letsencrypt/live/narateknindotama.duckdns.org/privkey.pem"

if [ -f "$CERT_PATH" ] && [ -f "$KEY_PATH" ]; then
    echo "[nginx] Let's Encrypt certificates found. Copying to active SSL path..."
    cp -L "$CERT_PATH" /etc/ssl/certs/nara-ac/fullchain.pem
    cp -L "$KEY_PATH" /etc/ssl/certs/nara-ac/privkey.pem
else
    echo "[nginx] No Let's Encrypt certificates detected. Generating fallback self-signed cert..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/certs/nara-ac/privkey.pem \
        -out /etc/ssl/certs/nara-ac/fullchain.pem \
        -subj "/CN=narateknindotama.duckdns.org" >/dev/null 2>&1 || true
fi

exec nginx -g "daemon off;"

BEGIN;

ALTER TABLE complaint_tickets
  ADD COLUMN IF NOT EXISTS severity VARCHAR(30) NOT NULL DEFAULT 'normal'
  CHECK (severity IN ('normal', 'urgent', 'severe'));

ALTER TABLE service_catalog
  ADD COLUMN IF NOT EXISTS garansi_hari INT NOT NULL DEFAULT 14
  CHECK (garansi_hari IN (14, 30, 45));

UPDATE service_catalog
SET garansi_hari = CASE
  WHEN LOWER(nama_layanan) LIKE '%core%' AND LOWER(nama_layanan) LIKE '%freon%' THEN 45
  WHEN LOWER(nama_layanan) LIKE '%core%' OR LOWER(nama_layanan) LIKE '%bongkar%' OR LOWER(nama_layanan) LIKE '%pasang%' OR LOWER(nama_layanan) LIKE '%freon%' OR LOWER(nama_layanan) LIKE '%perbaikan%' THEN 30
  ELSE 14
END
WHERE garansi_hari = 14;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS konfirmasi_pelanggan BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS waktu_konfirmasi_pelanggan TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS biaya_tambahan_jasa NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catatan_biaya_tambahan_jasa TEXT,
  ADD COLUMN IF NOT EXISTS persetujuan_biaya_pelanggan BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS persetujuan_biaya_admin BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status_persetujuan_biaya VARCHAR(30) NOT NULL DEFAULT 'none'
    CHECK (status_persetujuan_biaya IN ('none', 'pending_approval', 'approved', 'rejected'));

UPDATE bookings
SET konfirmasi_pelanggan = TRUE,
    waktu_konfirmasi_pelanggan = COALESCE(selesai_aktual, updated_at, created_at, NOW())
WHERE konfirmasi_pelanggan = FALSE
  AND EXISTS (SELECT 1 FROM feedback f WHERE f.booking_id = bookings.id);

ALTER TABLE warranty_claims
  ADD COLUMN IF NOT EXISTS foto_bukti_url TEXT;

ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS last_message_id VARCHAR(120);

CREATE TABLE IF NOT EXISTS whatsapp_webhook_events (
  id SERIAL PRIMARY KEY,
  message_id VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(30) NOT NULL,
  event_type VARCHAR(40) NOT NULL DEFAULT 'incoming_message',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_webhook_events_phone ON whatsapp_webhook_events(phone);

INSERT INTO settings (key, value, updated_at)
VALUES (
  'operating_hours',
  '{"open": "08:00", "close": "19:00", "days": [1, 2, 3, 4, 5, 6], "slot_minutes": 60, "min_lead_minutes": 60, "max_advance_days": 60, "reminder_hour": 8}'::jsonb,
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = jsonb_set(settings.value, '{close}', '"19:00"'::jsonb, true),
    updated_at = NOW();

INSERT INTO settings (key, value, updated_at)
VALUES (
  'business_profile',
  jsonb_build_object(
    'name', 'CV. Nara Teknindotama',
    'brand', 'NARA AC',
    'tagline', 'Solusi Profesional Perawatan, Instalasi & Perbaikan AC 24 Jam',
    'nib', '2805250066735',
    'npwp', '10.000.000.0-258.288',
    'akta_pendirian', '07 Tanggal Akta – 09 Mei 2025 (Notaris Ilyas, S.H.)',
    'nomor_ahu', 'AHU-0045403-AH.01.14 Tahun 2025',
    'address', 'Jalan Teluk Langsa RT. 002 RW. 016, Ciangsana, Gunung Putri, Kab. Bogor, Jawa Barat',
    'phone', '0813-8529-3137',
    'whatsapp', '6281385293137',
    'email', 'narateknindotama@gmail.com',
    'website', 'www.narateknindotama.com',
    'instagram', '@narateknindotamaserviceac',
    'tiktok', 'Nara Theknik',
    'hours', 'Senin - Sabtu: 08:00 - 19:00 WIB (Layanan Darurat 24 Jam)'
  ),
  NOW()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = NOW();

COMMIT;

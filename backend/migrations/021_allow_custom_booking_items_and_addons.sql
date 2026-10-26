-- 021_allow_custom_booking_items_and_addons.sql
-- Allow on-site technician add-ons and custom sparepart line-items
ALTER TABLE booking_items ALTER COLUMN layanan_id DROP NOT NULL;
ALTER TABLE booking_items ADD COLUMN IF NOT EXISTS nama_item TEXT;
ALTER TABLE booking_items ADD COLUMN IF NOT EXISTS jenis TEXT DEFAULT 'jasa';

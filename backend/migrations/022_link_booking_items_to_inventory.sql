-- 022_link_booking_items_to_inventory.sql
-- Link on-site added booking items directly to inventory stock deductions
ALTER TABLE booking_items ADD COLUMN IF NOT EXISTS inventory_usage_id INTEGER REFERENCES inventory_usage(id) ON DELETE SET NULL;
ALTER TABLE booking_items ADD COLUMN IF NOT EXISTS inventory_item_id INTEGER REFERENCES inventory(id) ON DELETE SET NULL;
ALTER TABLE booking_items ADD COLUMN IF NOT EXISTS inventory_qty NUMERIC(10,2);

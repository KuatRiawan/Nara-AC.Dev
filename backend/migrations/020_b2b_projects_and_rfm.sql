-- 020_b2b_projects_and_rfm.sql
-- Integrasi Skema Data Science: Portofolio Proyek B2B Resik & Atribut RFM Pelanggan

CREATE TABLE IF NOT EXISTS b2b_projects (
  id SERIAL PRIMARY KEY,
  kode_proyek TEXT UNIQUE NOT NULL,
  nama_proyek TEXT NOT NULL,
  kategori_proyek TEXT,
  periode_bulan TEXT,
  tanggal_proyek DATE,
  nilai_proyek NUMERIC(15,2) DEFAULT 0,
  biaya_proyek NUMERIC(15,2) DEFAULT 0,
  fee_marketing NUMERIC(15,2) DEFAULT 0,
  profit_bersih NUMERIC(15,2) DEFAULT 0,
  margin_persen NUMERIC(6,2) DEFAULT 0,
  no_po TEXT,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_projects_periode ON b2b_projects(periode_bulan);
CREATE INDEX IF NOT EXISTS idx_b2b_projects_tanggal ON b2b_projects(tanggal_proyek);

-- Tambah Atribut Segmen RFM & Riwayat ke tabel Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS kode_pelanggan TEXT UNIQUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS segmen_pelanggan TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS segmen_rfm TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS skor_rfm INT DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_order INT DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_belanja NUMERIC(15,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS terdaftar_member BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_customers_segmen_rfm ON customers(segmen_rfm);
CREATE INDEX IF NOT EXISTS idx_customers_kode_pelanggan ON customers(kode_pelanggan);

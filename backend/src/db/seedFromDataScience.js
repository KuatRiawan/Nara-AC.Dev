const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');
const bcrypt = require('bcryptjs');
const config = require('../config');

// Helper to parse CSV simply with comma separation & quote handling
function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse header
  const headers = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = values[idx];
      });
      rows.push(row);
    }
  }
  return rows;
}

function parseCsvLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

const INDONESIAN_FIRST_NAMES = [
  'Ahmad', 'Budi', 'Chandra', 'Dedi', 'Eko', 'Fajar', 'Gunawan', 'Hendra', 'Irfan', 'Joko',
  'Kusuma', 'Lukman', 'Mahendra', 'Nugroho', 'Oki', 'Prasetyo', 'Rahmat', 'Surya', 'Tri', 'Untung',
  'Wahyu', 'Yudi', 'Zainal', 'Agus', 'Bambang', 'Cahyono', 'Doni', 'Endang', 'Firmansyah', 'Ginanjar',
  'Hadi', 'Iskandar', 'Junaedi', 'Kurniawan', 'Lesmana', 'Mulyono', 'Nasir', 'Permana', 'Rizky', 'Santoso'
];

const INDONESIAN_CORP_PREFIX = [
  'PT. Sinar Makmur Sejahtera', 'CV. Mitra Abadi Jaya', 'PT. Graha Mandiri Persada', 'Kantor Notaris & PPAT',
  'Klinik Utama Sehat Keluarga', 'PT. Samudera Logistik Prima', 'Restoran Dapur Nusantara', 'PT. Bintang Karya Tama',
  'Studio Desain & Arsitek', 'PT. Sumber Rejeki Berkah', 'Kopdit Bina Usaha', 'PT. Citra Solusindo Terpadu',
  'Yayasan Pendidikan Bangsa', 'PT. Sentosa Distribusi', 'Pusat Kebugaran Prima Fitness'
];

async function seedRealDataScience() {
  const client = await pool.connect();
  const dsDir = path.resolve(__dirname, '../../../data-science/data/governed');

  console.log('🏁 Memulai migrasi data riil Data Science ke PostgreSQL...');
  console.log('📂 Lokasi Data Governed:', dsDir);

  try {
    await client.query('BEGIN');

    // 1. Bersihkan transaksi dummy lama dan relasinya
    console.log('🧹 1/6 Membersihkan tabel transaksi & relasi data dummy...');
    await client.query(`
      DELETE FROM users WHERE email NOT IN ('admin@nara-ac.local', 'budi@nara-ac.local');
      DELETE FROM inventory_usage;
      DELETE FROM status_log;
      DELETE FROM feedback;
      DELETE FROM booking_items;
      DELETE FROM reminder_log;
      DELETE FROM complaint_tickets;
      DELETE FROM warranty_claims;
      DELETE FROM service_reports;
      DELETE FROM work_order_checklists;
      DELETE FROM work_order_photos;
      DELETE FROM work_orders;
      DELETE FROM ac_units;
      DELETE FROM bookings;
      DELETE FROM customers;
      DELETE FROM b2b_projects;
      DELETE FROM prediction_output;
    `);

    // 2. Pertahankan hanya 1 Admin dan 1 Teknisi aktif
    console.log('👤 2/6 Menyaring akun: 1 Admin Utama & 1 Teknisi Resmi...');
    const passwordHash = await bcrypt.hash(config.demoPassword, 10);

    // Cari atau buat teknisi tunggal: Budi Santoso
    let techId;
    const existingTech = await client.query(`SELECT id FROM technicians WHERE kontak = '081234567890' LIMIT 1`);
    if (existingTech.rows.length > 0) {
      techId = existingTech.rows[0].id;
      await client.query(`
        UPDATE technicians 
        SET nama = 'Budi Santoso', kontak = '081234567890', aktif = true, catatan = 'Teknisi Utama Bersertifikasi Nara AC', is_synthetic = false 
        WHERE id = $1
      `, [techId]);
    } else {
      const insTech = await client.query(`
        INSERT INTO technicians (nama, kontak, aktif, catatan, is_synthetic)
        VALUES ('Budi Santoso', '081234567890', true, 'Teknisi Utama Bersertifikasi Nara AC', false)
        RETURNING id
      `);
      techId = insTech.rows[0].id;
    }

    // Hapus teknisi selain Budi Santoso
    await client.query(`DELETE FROM technicians WHERE id <> $1`, [techId]);

    // Update / upsert user Admin & Teknisi Budi
    await client.query(`
      INSERT INTO users (nama, email, password_hash, role)
      VALUES ('Admin Utama', 'admin@nara-ac.local', $1, 'admin')
      ON CONFLICT (email) DO UPDATE SET nama = 'Admin Utama', password_hash = EXCLUDED.password_hash, role = 'admin', aktif = true;
    `, [passwordHash]);

    await client.query(`
      INSERT INTO users (nama, email, password_hash, role, technician_id)
      VALUES ('Budi Santoso', 'budi@nara-ac.local', $1, 'technician', $2)
      ON CONFLICT (email) DO UPDATE SET nama = 'Budi Santoso', password_hash = EXCLUDED.password_hash, role = 'technician', technician_id = $2, aktif = true;
    `, [passwordHash, techId]);

    // Hapus semua user dummy lainnya
    await client.query(`
      DELETE FROM users 
      WHERE email NOT IN ('admin@nara-ac.local', 'budi@nara-ac.local');
    `);

    // 3. Pastikan Master Service Catalog lengkap
    console.log('⚙️ 3/6 Memastikan Katalog Layanan Sinkron...');
    const catalogData = [
      { kode: 'SRV-CUCI-01', nama: 'Cuci AC Standard', kat: 'cuci', deskripsi: 'Pembersihan filter, evaporator, dan cek tekanan freon', harga: 75000, durasi: 60, garansi: 14, interval: 90 },
      { kode: 'SRV-CUCI-CORE', nama: 'Cuci AC Core (Deep Clean)', kat: 'cuci', deskripsi: 'Bongkar total rotor fan & talang air, chemical wash, & sterilisasi', harga: 120000, durasi: 90, garansi: 30, interval: 90 },
      { kode: 'SRV-CUCI-FREON', nama: 'Paket Core + Isi Freon', kat: 'cuci', deskripsi: 'Deep clean bongkar total plus isi freon murni presisi pabrikan', harga: 220000, durasi: 105, garansi: 45, interval: 120 },
      { kode: 'SRV-BONGKAR-01', nama: 'Bongkar Pasang AC', kat: 'instalasi', deskripsi: 'Jasa bongkar dan pasang AC di lokasi baru', harga: 350000, durasi: 120, garansi: 30, interval: 180 },
      { kode: 'SRV-FREON-01', nama: 'Isi Freon R32', kat: 'perbaikan', deskripsi: 'Pengisian freon R32 sampai tekanan standar', harga: 150000, durasi: 45, garansi: 30, interval: 90 },
    ];

    const serviceMap = {};
    for (const c of catalogData) {
      const sRes = await client.query(`
        INSERT INTO service_catalog (kode, nama_layanan, kategori, deskripsi, harga, durasi_menit, garansi_hari, interval_maintenance_hari, aktif, is_synthetic)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false)
        ON CONFLICT (kode) DO UPDATE SET 
          nama_layanan = EXCLUDED.nama_layanan, 
          deskripsi = EXCLUDED.deskripsi,
          harga = EXCLUDED.harga, 
          durasi_menit = EXCLUDED.durasi_menit,
          garansi_hari = EXCLUDED.garansi_hari,
          interval_maintenance_hari = EXCLUDED.interval_maintenance_hari,
          aktif = true,
          is_synthetic = false
        RETURNING id, kode;
      `, [c.kode, c.nama, c.kat, c.deskripsi, c.harga, c.durasi, c.garansi, c.interval]);
      serviceMap[c.kode] = sRes.rows[0].id;
    }

    // 4. Ingest Pelanggan Riil dari Governed CSV
    console.log('👥 4/6 Mengimpor Data Pelanggan Riil (RFM Governed)...');
    const rfmCsvPath = path.join(dsDir, 'dataset_pelanggan_rfm_governed.csv');
    const rfmRows = parseCsv(rfmCsvPath);
    console.log(`   Ditemukan ${rfmRows.length} data pelanggan di CSV.`);

    const customerIdMap = {}; // id_pelanggan (CUST-001) -> DB id

    for (let i = 0; i < rfmRows.length; i++) {
      const r = rfmRows[i];
      const custCode = r.id_pelanggan || `CUST-${String(i + 1).padStart(3, '0')}`;
      const isB2B = (r.segmen_pelanggan || '').includes('Korporat');

      // Tentukan Nama yang Human-Readable dan Profesional
      let displayName;
      if (isB2B) {
        const corpName = INDONESIAN_CORP_PREFIX[i % INDONESIAN_CORP_PREFIX.length];
        displayName = `${corpName} (${custCode})`;
      } else {
        const fn = INDONESIAN_FIRST_NAMES[i % INDONESIAN_FIRST_NAMES.length];
        displayName = `Bpk/Ibu ${fn} (${custCode})`;
      }

      // Format nomor HP valid untuk pengujian sistem
      const padNum = String(i + 1).padStart(4, '0');
      const contactPhone = `085512${padNum}`;
      const city = r.kota && r.kota.trim() ? r.kota.trim() : (isB2B ? 'Cibubur, Jakarta Timur' : 'Bekasi');
      const address = `Jl. Perumahan Raya No. ${((i * 7) % 80) + 1}, ${city}`;

      const totalOrder = parseInt(r.frequency_total_order, 10) || 1;
      const totalBelanja = parseFloat(r.monetary_total_bersih) || 0;
      const isMember = String(r.terdaftar_di_member) === '1';
      const skorRfm = parseInt(r.skor_rfm_total, 10) || 0;
      const segmenRfm = r.segmen_retensi_rfm || 'Pelanggan Reguler';

      const insCust = await client.query(`
        INSERT INTO customers (
          kode_pelanggan, nama, kontak, alamat, catatan_umum, 
          segmen_pelanggan, segmen_rfm, skor_rfm, total_order, total_belanja, terdaftar_member, 
          aktif, is_synthetic, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, false, $12)
        RETURNING id;
      `, [
        custCode,
        displayName,
        contactPhone,
        address,
        `Pelanggan Riil DS (${r.layanan_utama || 'Servis AC'}). Terdaftar: ${r.periode_registrasi || '-'}`,
        r.segmen_pelanggan || (isB2B ? 'Korporat / Instansi' : 'Perorangan / Residensial'),
        segmenRfm,
        skorRfm,
        totalOrder,
        totalBelanja,
        isMember,
        r.tanggal_order_pertama ? `${r.tanggal_order_pertama} 08:00:00+07` : new Date()
      ]);

      customerIdMap[custCode] = insCust.rows[0].id;
    }

    // 5. Ingest Riwayat Transaksi Servis AC Riil dari Governed CSV
    console.log('💳 5/6 Mengimpor Riwayat Transaksi Riil (545 Transaksi)...');
    const trxCsvPath = path.join(dsDir, 'dataset_transaksi_servis_ac_governed.csv');
    const trxRows = parseCsv(trxCsvPath);
    console.log(`   Ditemukan ${trxRows.length} transaksi servis di CSV.`);

    for (let i = 0; i < trxRows.length; i++) {
      const t = trxRows[i];
      const custDbId = customerIdMap[t.id_pelanggan] || customerIdMap['CUST-001'];
      const kat = (t.kategori_layanan || '').toLowerCase();

      // Petakan ke Service Catalog
      let srvId;
      if (kat.includes('cuci') && (kat.includes('freon') || kat.includes('tambah') || kat.includes('paket'))) {
        srvId = serviceMap['SRV-CUCI-FREON'];
      } else if (kat.includes('cuci')) {
        srvId = (i % 4 === 0) ? serviceMap['SRV-CUCI-CORE'] : serviceMap['SRV-CUCI-01'];
      } else if (kat.includes('freon')) {
        srvId = serviceMap['SRV-FREON-01'];
      } else if (kat.includes('pasang') || kat.includes('bongkar')) {
        srvId = serviceMap['SRV-BONGKAR-01'];
      } else {
        srvId = serviceMap['SRV-CUCI-01'];
      }

      const tgl = t.tanggal || '2025-06-01';
      let jam = t.waktu_kunjungan && t.waktu_kunjungan.includes(':') ? t.waktu_kunjungan.trim() : '09:00';
      if (jam.length === 4 && jam.indexOf(':') === 1) jam = '0' + jam; // e.g. 8:00 -> 08:00
      if (jam.length < 5) jam = '09:00';

      const startD = new Date(`${tgl}T${jam}:00+07:00`);
      const durasiMs = 60 * 60 * 1000;
      const endD = new Date(startD.getTime() + durasiMs);
      const jadwalMulai = startD.toISOString();
      const jadwalSelesai = endD.toISOString();

      const qty = parseInt(t.qty_unit, 10) || 1;
      const tagihanKotor = parseFloat(t.total_tagihan_kotor) || 150000;
      const pendapatanBersih = parseFloat(t.pendapatan_bersih) || tagihanKotor;

      const trxId = t.id_transaksi || `TRX-${String(i + 1).padStart(4, '0')}`;
      const kodeBooking = `NARA-AC-${tgl.replace(/-/g, '')}-${trxId.replace('TRX-', '')}`;

      const insBooking = await client.query(`
        INSERT INTO bookings (
          kode_booking, customer_id, layanan_id, teknisi_id,
          jadwal_mulai, jadwal_selesai, mulai_aktual, selesai_aktual,
          alamat, keluhan, kontak, jumlah_unit, status,
          status_pembayaran, skema_pembayaran, metode_pembayaran,
          status_verifikasi_pembayaran, total_dibayar,
          konfirmasi_pelanggan, created_by, is_synthetic, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $5, $6,
          $7, $8, $9, $10, 'done',
          'paid', 'lunas', 'transfer',
          'diverifikasi', $11,
          true, 'system_ds_ingest', false, $5, $6
        ) RETURNING id;
      `, [
        kodeBooking,
        custDbId,
        srvId,
        techId,
        jadwalMulai,
        jadwalSelesai,
        `Lokasi Pelanggan ${t.kota_pelanggan || 'Jabodetabek'}`,
        t.keterangan || `Servis ${t.kategori_layanan || 'AC Unit'}`,
        `085512${String(custDbId).padStart(4, '0')}`,
        qty,
        tagihanKotor
      ]);

      const bookingId = insBooking.rows[0].id;

      // Buat booking item agar rincian invoice resmi konsisten
      await client.query(`
        INSERT INTO booking_items (booking_id, layanan_id, jumlah_unit, harga_satuan, subtotal)
        VALUES ($1, $2, $3, $4, $5);
      `, [
        bookingId,
        srvId,
        qty,
        Math.round(tagihanKotor / Math.max(qty, 1)),
        tagihanKotor
      ]);

      // Buat feedback kepuasan pelanggan realistis (rating 4 atau 5)
      if (i % 2 === 0) {
        const rating = (i % 7 === 0) ? 4 : 5;
        await client.query(`
          INSERT INTO feedback (booking_id, rating, komentar, waktu)
          VALUES ($1, $2, $3, $4);
        `, [
          bookingId,
          rating,
          rating === 5 ? 'Servis sangat dingin, tepat waktu dan profesional.' : 'Pekerjaan rapi dan bersih.',
          jadwalSelesai
        ]);
      }
    }

    // 6. Ingest Proyek B2B Resik
    console.log('🏢 6/6 Mengimpor Portofolio Proyek B2B Resik (80 Proyek)...');
    const b2bCsvPath = path.join(dsDir, 'dataset_proyek_b2b_resik_governed.csv');
    const b2bRows = parseCsv(b2bCsvPath);
    console.log(`   Ditemukan ${b2bRows.length} proyek B2B di CSV.`);

    for (let i = 0; i < b2bRows.length; i++) {
      const b = b2bRows[i];
      const tglProj = b.tanggal_proyek || `${b.tahun || '2025'}-${String(b.bulan || '07').padStart(2, '0')}-15`;

      await client.query(`
        INSERT INTO b2b_projects (
          kode_proyek, nama_proyek, kategori_proyek, periode_bulan, tanggal_proyek,
          nilai_proyek, biaya_proyek, fee_marketing, profit_bersih, margin_persen,
          no_po, keterangan, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
        ON CONFLICT (kode_proyek) DO UPDATE SET
          nama_proyek = EXCLUDED.nama_proyek,
          nilai_proyek = EXCLUDED.nilai_proyek,
          biaya_proyek = EXCLUDED.biaya_proyek,
          profit_bersih = EXCLUDED.profit_bersih;
      `, [
        b.id_proyek || `PRJ-${String(i + 1).padStart(3, '0')}`,
        b.nama_proyek || `Proyek Servis B2B ${i + 1}`,
        b.kategori_proyek || 'Instalasi & Perawatan Komersial',
        b.periode_bulan || '2025-07',
        tglProj,
        parseFloat(b.nilai_proyek) || 0,
        parseFloat(b.biaya_proyek) || 0,
        parseFloat(b.fee_marketing) || 0,
        parseFloat(b.profit_bersih_terkoreksi) || parseFloat(b.profit_tercatat_excel) || 0,
        parseFloat(b.margin_profit_persen) || 0,
        b.no_po || null,
        b.keterangan || null
      ]);
    }

    await client.query('COMMIT');
    console.log('✅ Migrasi & Ingestion Data Science ke PostgreSQL SELESAI!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Gagal Ingest Data Science:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seedRealDataScience()
    .then(() => pool.end())
    .catch(() => process.exit(1));
}

module.exports = { seedRealDataScience };

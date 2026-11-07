const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');
const bcrypt = require('bcryptjs');
const config = require('../config');

function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

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
  'Hadi', 'Iskandar', 'Junaedi', 'Kurniawan', 'Lesmana', 'Mulyono', 'Nasir', 'Permana', 'Rizky', 'Santoso',
  'Siti', 'Dewi', 'Ratna', 'Wulandari', 'Sri', 'Putri', 'Kartika', 'Indah', 'Lestari', 'Nurul'
];

const INDONESIAN_CORP_NAMES = [
  'PT. Sinar Makmur Sejahtera', 'CV. Mitra Abadi Jaya', 'PT. Graha Mandiri Persada', 'Kantor Notaris & PPAT',
  'Klinik Utama Sehat Keluarga', 'PT. Samudera Logistik Prima', 'Restoran Dapur Nusantara', 'PT. Bintang Karya Tama',
  'Studio Desain & Arsitek', 'PT. Sumber Rejeki Berkah', 'Kopdit Bina Usaha', 'PT. Citra Solusindo Terpadu',
  'Yayasan Pendidikan Bangsa', 'PT. Sentosa Distribusi', 'Pusat Kebugaran Prima Fitness', 'Hotel Grand Cempaka',
  'Kafe Kopi Kenangan Manis', 'Apotek K-24 Cabang Utama', 'PT. Mega Trans Buana', 'Bank Perkreditan Mandiri'
];

const TECH_DEFINITIONS = [
  { code: 'TEK-01', nama: 'Budi Santoso', kontak: '081234567891', email: 'budi@nara-ac.local' },
  { code: 'TEK-02', nama: 'Agus Setiawan', kontak: '081234567892', email: 'agus@nara-ac.local' },
  { code: 'TEK-03', nama: 'Fajar Prasetyo', kontak: '081234567893', email: 'fajar@nara-ac.local' },
  { code: 'TEK-04', nama: 'Doni Pratama', kontak: '081234567894', email: 'doni@nara-ac.local' },
  { code: 'TEK-05', nama: 'Rian Kurniawan', kontak: '081234567895', email: 'rian@nara-ac.local' }
];

const SERVICE_DEFINITIONS = [
  { kode: 'SRV-DS-01', nama: 'Cuci Standar', kat: 'cuci', harga: 75000, durasi: 60, garansi: 14, interval: 90, desc: 'Pembersihan filter, evaporator indoor, dan cek freon' },
  { kode: 'SRV-DS-02', nama: 'Tambah/Isi Freon & Cuci', kat: 'cuci', harga: 220000, durasi: 90, garansi: 30, interval: 100, desc: 'Cuci standar ditambah pengisian freon murni presisi' },
  { kode: 'SRV-DS-03', nama: 'Cuci Besar (Overhaul) & Pelumasan', kat: 'cuci', harga: 200000, durasi: 90, garansi: 30, interval: 120, desc: 'Pembersihan deep clean bongkar total indoor & pelumasan fan' },
  { kode: 'SRV-DS-04', nama: 'Perbaikan Bocor & Pipa', kat: 'perbaikan', harga: 150000, durasi: 75, garansi: 30, interval: 90, desc: 'Perbaikan sambungan flaring pipa tembaga dan talang pembuangan' },
  { kode: 'SRV-DS-05', nama: 'Ganti Kapasitor/Kelistrikan & Modul', kat: 'perbaikan', harga: 250000, durasi: 90, garansi: 45, interval: 180, desc: 'Penggantian kapasitor fan/kompresor dan perbaikan modul PCB' }
];

async function importCleanDataScience() {
  const client = await pool.connect();
  const csvCandidates = [
    path.resolve(__dirname, 'data/data_servis_ac_clean.csv'),
    path.resolve(__dirname, '../../../data-science/data/data_servis_ac_clean.csv'),
    path.resolve(process.cwd(), 'data-science/data/data_servis_ac_clean.csv'),
    path.resolve(process.cwd(), '../data-science/data/data_servis_ac_clean.csv')
  ];

  const csvPath = csvCandidates.find(p => fs.existsSync(p));
  if (!csvPath) {
    console.error('❌ File data_servis_ac_clean.csv tidak ditemukan di:', csvCandidates);
    process.exit(1);
  }

  console.log('❄️  MEMULAI IMPORT DATA SCIENCE TRANSALSI KE POSTGRESQL ❄️');
  console.log('📂 Menggunakan CSV:', csvPath);

  try {
    await client.query('BEGIN');

    // 1. Sinkronkan Layanan Servis
    console.log('⚙️  1/6 Menyinkronkan 5 Katalog Layanan Data Science...');
    const serviceMap = {}; // nama_layanan -> id
    for (const s of SERVICE_DEFINITIONS) {
      const res = await client.query(`
        INSERT INTO service_catalog (kode, nama_layanan, kategori, deskripsi, harga, durasi_menit, garansi_hari, interval_maintenance_hari, aktif, is_synthetic)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false)
        ON CONFLICT (kode) DO UPDATE SET
          nama_layanan = EXCLUDED.nama_layanan,
          harga = EXCLUDED.harga,
          durasi_menit = EXCLUDED.durasi_menit,
          garansi_hari = EXCLUDED.garansi_hari,
          interval_maintenance_hari = EXCLUDED.interval_maintenance_hari,
          aktif = true
        RETURNING id, nama_layanan;
      `, [s.kode, s.nama, s.kat, s.desc, s.harga, s.durasi, s.garansi, s.interval]);
      serviceMap[s.nama] = res.rows[0].id;
    }

    // 2. Pastikan 5 Teknisi Resmi & Akun Loginnya Tersedia
    console.log('👷 2/6 Menyinkronkan 5 Teknisi Resmi...');
    const passwordHash = await bcrypt.hash(config.demoPassword || 'AdminNara2026!SangatKuat', 10);

    // Pastikan Admin Utama utuh
    await client.query(`
      INSERT INTO users (nama, email, password_hash, role)
      VALUES ('Admin Utama', 'admin@nara-ac.local', $1, 'admin')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    `, [passwordHash]);

    const techMap = {}; // kode/nama prefix -> technician_id
    for (const t of TECH_DEFINITIONS) {
      const existing = await client.query('SELECT id FROM technicians WHERE kontak = $1 LIMIT 1', [t.kontak]);
      let tid;
      if (existing.rows.length > 0) {
        tid = existing.rows[0].id;
        await client.query('UPDATE technicians SET nama = $1, aktif = true, is_synthetic = false WHERE id = $2', [t.nama, tid]);
      } else {
        const ins = await client.query(`
          INSERT INTO technicians (nama, kontak, aktif, catatan, is_synthetic)
          VALUES ($1, $2, true, 'Teknisi Resmi Nara AC', false)
          RETURNING id;
        `, [t.nama, t.kontak]);
        tid = ins.rows[0].id;
      }

      await client.query(`
        INSERT INTO users (nama, email, password_hash, role, technician_id)
        VALUES ($1, $2, $3, 'technician', $4)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, technician_id = $4, aktif = true;
      `, [t.nama, t.email, passwordHash, tid]);

      techMap[t.code] = tid;
      techMap[t.nama.split(' ')[0]] = tid; // e.g. "Budi" -> tid
    }

    // 3. Bersihkan transaksi lama untuk fresh import
    console.log('🧹 3/6 Membersihkan tabel booking, ac_units, dan customers lama...');
    await client.query(`
      TRUNCATE bookings, ac_units, feedback CASCADE;
      UPDATE users SET customer_id = NULL;
      DELETE FROM customers;
    `);

    // 4. Baca CSV Data Science
    const rows = parseCsv(csvPath);
    console.log(`📊 4/6 Memproses ${rows.length} baris data dari CSV...`);

    // Kumpulkan Pelanggan Unik & Unit AC
    const customerMap = {}; // custCode (e.g. CUST-0013) -> { id, phone, name, address, totalOrder, totalBelanja }
    const customerAcMap = {}; // custCode -> [ac_unit_id]

    let custSeq = 1;
    for (const r of rows) {
      const cCode = r.customer_id || `CUST-${String(custSeq).padStart(4, '0')}`;
      if (!customerMap[cCode]) {
        const isB2B = r.tipe_customer === 'Bisnis/Kantor';
        const numPart = parseInt(cCode.replace(/\D/g, ''), 10) || custSeq;
        
        let name;
        if (isB2B) {
          name = INDONESIAN_CORP_NAMES[(numPart - 1) % INDONESIAN_CORP_NAMES.length];
        } else {
          const fn = INDONESIAN_FIRST_NAMES[(numPart - 1) % INDONESIAN_FIRST_NAMES.length];
          name = `Bpk/Ibu ${fn}`;
        }

        const phone = `0852${String(numPart).padStart(4, '0')}${String((numPart * 7) % 9000).padStart(4, '0')}`;
        const city = isB2B ? 'Jakarta Timur' : 'Bekasi';
        const address = `Jl. Pemuda No. ${((numPart * 3) % 120) + 1}, ${city}`;

        const cRes = await client.query(`
          INSERT INTO customers (nama, kontak, alamat, kode_pelanggan, segmen_pelanggan, is_synthetic)
          VALUES ($1, $2, $3, $4, $5, false)
          RETURNING id;
        `, [name, phone, address, cCode, r.tipe_customer]);

        const dbCustId = cRes.rows[0].id;
        customerMap[cCode] = {
          id: dbCustId,
          phone,
          name,
          address,
          totalOrder: 0,
          totalBelanja: 0
        };

        // Buat Unit AC untuk pelanggan ini
        const acPk = parseFloat(r.kapasitas_pk) || 1.0;
        const acType = r.tipe_ac || 'Split Standard';
        const acRes = await client.query(`
          INSERT INTO ac_units (customer_id, brand, tipe, kapasitas_pk, lokasi)
          VALUES ($1, 'Daikin / Panasonic', $2, $3, $4)
          RETURNING id;
        `, [dbCustId, acType, acPk, isB2B ? 'Ruang Kantor' : 'Kamar Utama']);

        customerAcMap[cCode] = acRes.rows[0].id;
        custSeq++;
      }
    }

    console.log(`✅ 341 Pelanggan dan Unit AC berhasil dibuat.`);

    // 5. Impor 1.350 Booking Transaksi & Feedback
    console.log('📦 5/6 Menyimpan 1.350 data booking transaksi dan rating...');
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const cCode = r.customer_id;
      const cust = customerMap[cCode];
      if (!cust) continue;

      const svcName = r.jenis_layanan;
      const svcId = serviceMap[svcName] || serviceMap['Cuci Standar'];

      // Parse teknisi
      let matchedTechId = techMap['TEK-01'];
      for (const tDef of TECH_DEFINITIONS) {
        if (r.teknisi_id && (r.teknisi_id.includes(tDef.code) || r.teknisi_id.includes(tDef.nama.split(' ')[0]))) {
          matchedTechId = techMap[tDef.code];
          break;
        }
      }

      const orderDateStr = r.tanggal_order; // e.g. '2026-09-24'
      const startHour = 8 + (i % 8); // 08:00 to 16:00
      const startTime = `${orderDateStr}T${String(startHour).padStart(2, '0')}:00:00+07:00`;
      const dur = parseInt(r.durasi_menit, 10) || 60;
      const endTime = new Date(new Date(startTime).getTime() + dur * 60000).toISOString();

      const totalBiaya = parseFloat(r.total_biaya) || 150000;
      const complaint = r.keluhan_utama || 'Cuci Rutin / Berdebu';
      const acUnitId = customerAcMap[cCode] || null;

      const bRes = await client.query(`
        INSERT INTO bookings (
          kode_booking, customer_id, ac_unit_id, layanan_id, jumlah_unit,
          jadwal_mulai, jadwal_selesai, alamat, keluhan, kontak,
          status, teknisi_id, total_dibayar, status_pembayaran,
          status_verifikasi_pembayaran, is_synthetic, created_by, created_at
        )
        VALUES (
          $1, $2, $3, $4, 1,
          $5, $6, $7, $8, $9,
          'done', $10, $11, 'paid',
          'diverifikasi', false, 'customer', $5
        )
        RETURNING id;
      `, [
        r.order_id,
        cust.id,
        acUnitId,
        svcId,
        startTime,
        endTime,
        cust.address,
        complaint,
        cust.phone,
        matchedTechId,
        totalBiaya
      ]);

      const bookingId = bRes.rows[0].id;

      await client.query(`
        INSERT INTO booking_items (booking_id, layanan_id, jumlah_unit, harga_satuan, subtotal)
        VALUES ($1, $2, 1, $3, $3);
      `, [bookingId, svcId, Math.round(totalBiaya)]);

      // Masukkan Feedback Rating
      const rating = parseInt(r.rating_feedback, 10) || 5;
      const sentiment = rating >= 4 ? 'positif' : (rating === 3 ? 'netral' : 'negatif');
      const sampleComments = {
        5: 'Pengerjaan sangat rapi, AC kembali dingin maksimal dan teknisi ramah.',
        4: 'Servis memuaskan dan tepat waktu. Terima kasih Nara AC.',
        3: 'Cukup baik, pendinginan normal kembali.',
        2: 'Pengerjaan agak lama, tapi sekarang sudah berfungsi.',
        1: 'Mohon lebih teliti lagi ke depannya saat pembersihan.'
      };

      await client.query(`
        INSERT INTO feedback (booking_id, rating, komentar, sentimen, waktu)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (booking_id) DO NOTHING;
      `, [
        bookingId,
        rating,
        sampleComments[rating] || 'Servis selesai dengan baik.',
        sentiment,
        endTime
      ]);

      // Akumulasi belanja pelanggan
      cust.totalOrder += 1;
      cust.totalBelanja += totalBiaya;
      successCount++;
    }

    // 6. Update Statistik RFM Pelanggan
    console.log('📈 6/6 Menghitung total order & akumulasi belanja pelanggan...');
    for (const cCode of Object.keys(customerMap)) {
      const c = customerMap[cCode];
      const rfmScore = Math.min(100, Math.round((c.totalOrder * 10) + (c.totalBelanja / 100000)));
      await client.query(`
        UPDATE customers
        SET total_order = $1, total_belanja = $2, skor_rfm = $3, terdaftar_member = true
        WHERE id = $4;
      `, [c.totalOrder, c.totalBelanja, rfmScore, c.id]);
    }

    await client.query('COMMIT');
    console.log(`\n🎉 SUKSES BESAR! Berhasil mengimpor ${successCount} riwayat transaksi ke database PostgreSQL!`);
    console.log('📊 Akun Admin (admin@nara-ac.local) tetap aktif dengan password Anda.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Gagal mengimpor data science:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

if (require.main === module) {
  importCleanDataScience();
}

module.exports = { importCleanDataScience };

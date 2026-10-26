const { pool } = require('./pool');
const bcrypt = require('bcryptjs');
const config = require('../config');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO settings (key, value) VALUES 
      ('operating_hours', '{"open": "08:00", "close": "19:00", "days": [1,2,3,4,5,6], "slot_minutes": 60, "min_lead_minutes": 60, "max_advance_days": 60, "reminder_hour": 8}')
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
    `);

    const { SERVICES_CATALOG } = require('./syncPriceList');
    for (const item of SERVICES_CATALOG) {
      await client.query(`
        INSERT INTO service_catalog (
          kode, nama_layanan, kategori, deskripsi, harga, durasi_menit, garansi_hari, interval_maintenance_hari, aktif, is_synthetic, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false, NOW())
        ON CONFLICT (kode) DO UPDATE SET
          nama_layanan = EXCLUDED.nama_layanan,
          kategori = EXCLUDED.kategori,
          deskripsi = EXCLUDED.deskripsi,
          harga = EXCLUDED.harga,
          durasi_menit = EXCLUDED.durasi_menit,
          garansi_hari = EXCLUDED.garansi_hari,
          interval_maintenance_hari = EXCLUDED.interval_maintenance_hari,
          aktif = true,
          updated_at = NOW();
      `, [
        item.kode,
        item.nama_layanan,
        item.kategori,
        item.deskripsi,
        item.harga,
        item.durasi_menit,
        item.garansi_hari,
        item.interval_maintenance_hari
      ]);
    }

    const techData = [
      { nama: 'Budi Santoso', kontak: '081234567890' },
      { nama: 'Agus Setiawan', kontak: '081234567891' }
    ];
    const techs = [];
    for (const t of techData) {
      const found = await client.query('SELECT id, nama FROM technicians WHERE kontak = $1', [t.kontak]);
      if (found.rows.length > 0) {
        const tid = found.rows[0].id;
        await client.query('UPDATE technicians SET nama = $1, aktif = true WHERE id = $2', [t.nama, tid]);
        techs.push({ id: tid, nama: t.nama });
      } else {
        const ins = await client.query('INSERT INTO technicians (nama, kontak, is_synthetic) VALUES ($1, $2, true) RETURNING id, nama', [t.nama, t.kontak]);
        techs.push(ins.rows[0]);
      }
    }

    const passwordHash = await bcrypt.hash(config.demoPassword, 10);

    await client.query(`
      INSERT INTO users (nama, email, password_hash, role)
      VALUES ('Admin Utama', 'admin@nara-ac.local', $1, 'admin')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
    `, [passwordHash]);

    for (const t of techs) {
      const email = `${t.nama.split(' ')[0].toLowerCase()}@nara-ac.local`;
      await client.query(`
        INSERT INTO users (nama, email, password_hash, role, technician_id)
        VALUES ($1, $2, $3, 'technician', $4)
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
      `, [t.nama, email, passwordHash, t.id]);
    }

    const custRes = await client.query(`
      INSERT INTO customers (nama, kontak, alamat, is_synthetic)
      VALUES 
      ('Citra Lestari', '085512341234', 'Jl. Merdeka No.10, Jakarta', true),
      ('Dani Pratama', '085512341235', 'Jl. Sudirman No.5, Jakarta', true)
      ON CONFLICT (kontak) DO NOTHING
      RETURNING id;
    `);
    const customers = custRes.rows;

    if (customers.length === 0) {
      const existingCust = await client.query(`SELECT id FROM customers WHERE kontak IN ('085512341234', '085512341235')`);
      customers.push(...existingCust.rows);
    }

    await client.query(`
      INSERT INTO inventory (nama, kategori, stok, satuan, min_stok)
      VALUES 
      ('Freon R32', 'freon', 50.0, 'kg', 10.0),
      ('Pipa Tembaga 1/4', 'pipa', 100.0, 'meter', 20.0)
      ON CONFLICT (nama) DO NOTHING;
    `);

    const svcs = (await client.query('SELECT id FROM service_catalog')).rows;

    if (customers.length > 0 && svcs.length > 0 && techs.length > 0) {
      const existingPast = (await client.query('SELECT 1 FROM bookings WHERE kode_booking = $1', ['BK-PAST-001'])).rows.length > 0;
      const existingFut = (await client.query('SELECT 1 FROM bookings WHERE kode_booking = $1', ['BK-FUT-001'])).rows.length > 0;

      if (!existingPast) {
        await client.query(`
          INSERT INTO bookings (kode_booking, customer_id, layanan_id, jadwal_mulai, jadwal_selesai, alamat, keluhan, kontak, status, teknisi_id, is_synthetic, status_pembayaran)
          VALUES (
            'BK-PAST-001', $1, $2, now() - interval '2 days', now() - interval '2 days' + interval '1 hour',
            'Jl. Merdeka No.10', 'AC kurang dingin', '085512341234', 'done', $3, true, 'paid'
          ) ON CONFLICT (kode_booking) DO NOTHING;
        `, [customers[0].id, svcs[0].id, techs[0].id]);
      }

      if (!existingFut) {
        await client.query(`
          INSERT INTO bookings (kode_booking, customer_id, layanan_id, jadwal_mulai, jadwal_selesai, alamat, keluhan, kontak, status, teknisi_id, is_synthetic, status_pembayaran)
          VALUES (
            'BK-FUT-001', $1, $2, now() + interval '1 days', now() + interval '1 days' + interval '1 hour',
            'Jl. Sudirman No.5', 'AC netes air', '085512341235', 'scheduled', $3, true, 'pending'
          ) ON CONFLICT (kode_booking) DO NOTHING;
        `, [customers[1].id, svcs[1].id, techs[1].id]);
      }
    }

    await client.query('COMMIT');
    console.log('Seeding selesai!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding gagal:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };

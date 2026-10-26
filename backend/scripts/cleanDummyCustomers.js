const { pool, query } = require('../src/db/pool');

async function cleanDummyCustomers() {
  console.log('--- Memulai Pembersihan Data Pelanggan Dummy ---');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Identifikasi customer dummy yang akan dihapus
    const findDummyRes = await client.query(`
      SELECT id, nama, kontak, kode_pelanggan
      FROM customers
      WHERE (
        nama IN (
          'User Reset Test', 'Budi Raharjo', 'Rules Tester', 'Customer Payment Test',
          'Duplicate Test', 'Single Unit Invoice', 'Two Unit Invoice', 'Core Service Test',
          'Freon Core Test', 'Customer A', 'Customer B', 'Idempotency Test', 'No Tech Test',
          'Test Booking User', 'Invoice Test User', 'Scheduled Status Test', 'Admin List Test',
          'Persist Test User', 'Multi Service Tester', 'Duration Tester', 'Workflow Tester'
        )
        OR nama ILIKE '%test%'
        OR kontak LIKE '08110000%'
        OR kontak LIKE '0812001000%'
      )
      AND (kode_pelanggan IS NULL OR kode_pelanggan = '')
      AND kontak NOT IN ('082124289987', '081234567890');
    `);

    const dummyCustomers = findDummyRes.rows;
    console.log(`Ditemukan ${dummyCustomers.length} pelanggan dummy pengujian.`);

    if (dummyCustomers.length > 0) {
      const dummyIds = dummyCustomers.map(c => c.id);

      // A. Hapus log terkait booking milik dummy customers
      const bRes = await client.query(`SELECT id FROM bookings WHERE customer_id = ANY($1)`, [dummyIds]);
      const dummyBookingIds = bRes.rows.map(b => b.id);
      console.log(`Ditemukan ${dummyBookingIds.length} booking terkait pelanggan dummy.`);

      if (dummyBookingIds.length > 0) {
        await client.query(`DELETE FROM reminder_log WHERE booking_id = ANY($1)`, [dummyBookingIds]);
        await client.query(`DELETE FROM whatsapp_invoice_logs WHERE booking_id = ANY($1)`, [dummyBookingIds]);
        await client.query(`DELETE FROM feedback WHERE booking_id = ANY($1)`, [dummyBookingIds]);
        await client.query(`DELETE FROM warranty_claims WHERE booking_id = ANY($1)`, [dummyBookingIds]);
        await client.query(`DELETE FROM booking_items WHERE booking_id = ANY($1)`, [dummyBookingIds]);
        await client.query(`DELETE FROM status_log WHERE booking_id = ANY($1)`, [dummyBookingIds]);
        await client.query(`DELETE FROM bookings WHERE id = ANY($1)`, [dummyBookingIds]);
        console.log(`Berhasil menghapus ${dummyBookingIds.length} booking dummy beserta lognya.`);
      }

      // B. Hapus users akun customer dummy
      const delUsersRes = await client.query(`DELETE FROM users WHERE customer_id = ANY($1) RETURNING id`, [dummyIds]);
      console.log(`Berhasil menghapus ${delUsersRes.rowCount} akun user terkait pelanggan dummy.`);

      // Hapus sisa user uji reset jika ada yang emailnya test
      await client.query(`DELETE FROM users WHERE email LIKE 'reset-user-%@example.com' OR email LIKE 'custpay_%@test.com'`);

      // C. Hapus ac_units milik customer dummy
      const delUnitsRes = await client.query(`DELETE FROM ac_units WHERE customer_id = ANY($1) RETURNING id`, [dummyIds]);
      console.log(`Berhasil menghapus ${delUnitsRes.rowCount} unit AC dummy.`);

      // D. Hapus klaim garansi jika masih ada
      await client.query(`DELETE FROM warranty_claims WHERE customer_id = ANY($1)`, [dummyIds]);

      // E. Hapus records customers dummy
      const delCustRes = await client.query(`DELETE FROM customers WHERE id = ANY($1) RETURNING id`, [dummyIds]);
      console.log(`Berhasil menghapus ${delCustRes.rowCount} record customers dummy.`);
    }

    // 2. Pastikan pelanggan demo seed resmi (Citra Lestari & Dani Pratama) terdaftar jika belum ada
    await client.query(`
      INSERT INTO customers (nama, kontak, alamat, catatan_umum, aktif, is_synthetic, kode_pelanggan, segmen_pelanggan, segmen_rfm)
      VALUES 
      ('Citra Lestari', '085512341234', 'Jl. Merdeka No.10, Jakarta Pusat', 'Pelanggan Residensial Tetap', true, false, 'CUST-DEMO-01', 'Perorangan / Residensial', 'Pelanggan Loyal'),
      ('Dani Pratama', '085512341235', 'Jl. Sudirman No.5, Jakarta Selatan', 'Pelanggan Residensial VIP', true, false, 'CUST-DEMO-02', 'Perorangan / Residensial', 'Pelanggan Baru Potensial')
      ON CONFLICT (kontak) DO UPDATE SET 
        nama = EXCLUDED.nama,
        alamat = EXCLUDED.alamat,
        aktif = true;
    `);
    console.log('Pelanggan demo resmi (Citra Lestari & Dani Pratama) telah dipastikan aktif.');

    await client.query('COMMIT');
    console.log('--- Pembersihan Pelanggan Dummy Berhasil Selesai ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Pembersihan gagal, rollback dilakukan:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanDummyCustomers()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

const path = require('path');
const fs = require('fs');
const { query, withTx } = require('../db/pool');
const { E } = require('../errors');
const { notify } = require('./common');
const { calculateInvoice } = require('./bookingService');
const { UPLOAD_DIR } = require('../utils/upload');

function verifyCustomerOrPhone(booking, user, kontak, actionLabel = 'mengakses pembayaran booking ini') {
  const userCustomerId = user ? (user.customer_id || user.customerId) : null;
  if (user && (user.role === 'admin' || user.role === 'technician')) {
    return true;
  }
  if (user && user.role === 'customer') {
    if (!userCustomerId || Number(booking.customer_id) !== Number(userCustomerId)) {
      throw E.forbidden(`Anda tidak berhak ${actionLabel}.`);
    }
    return true;
  }
  const rawKontak = String(kontak || '').trim();
  if (!rawKontak || rawKontak.includes('*') || rawKontak.includes('•')) {
    throw E.unauthorized(`Masukkan nomor WhatsApp pemesan lengkap (minimal 8 digit) untuk ${actionLabel}.`);
  }
  const cleanKontak = rawKontak.replace(/\D/g, '');
  const cleanBookingKontak = String(booking.kontak || '').replace(/\D/g, '');
  if (
    cleanKontak.length < 8 ||
    cleanBookingKontak.length < 8 ||
    cleanBookingKontak.slice(-8) !== cleanKontak.slice(-8)
  ) {
    throw E.forbidden('Nomor WhatsApp verifikasi tidak sesuai dengan data pemesan (minimal 8 digit terakhir harus cocok).');
  }
  return true;
}

async function getPaymentSettings() {
  const schemesRow = (await query("SELECT value FROM settings WHERE key = 'payment_schemes'")).rows[0];
  const methodsRow = (await query("SELECT value FROM settings WHERE key = 'payment_methods'")).rows[0];

  const defaultSchemes = {
    full_upfront: { enabled: true, label: 'Bayar Lunas di Awal', deskripsi: 'Pelunasan penuh saat booking dibuat' },
    dp_50: { enabled: true, label: 'Uang Muka (DP 50%)', deskripsi: 'Bayar 50% di awal, sisa 50% setelah pekerjaan selesai' },
    pay_after_service: { enabled: true, label: 'Bayar Setelah Selesai', deskripsi: 'Pelunasan setelah pekerjaan selesai diservis' },
  };

  const defaultMethods = {
    transfer: { enabled: true, label: 'Transfer Bank', instruksi: 'Transfer ke rekening resmi Nara AC dan unggah foto bukti bayar.' },
    qris: { enabled: true, label: 'QRIS', instruksi: 'Scan QRIS resmi Nara AC dengan aplikasi m-banking atau e-wallet.' },
    cash: { enabled: true, label: 'Tunai', instruksi: 'Bayar tunai langsung kepada teknisi di lokasi servis.' },
  };

  return {
    schemes: (schemesRow && schemesRow.value) ? schemesRow.value : defaultSchemes,
    methods: (methodsRow && methodsRow.value) ? methodsRow.value : defaultMethods,
  };
}

async function updatePaymentSettings({ schemes, methods }) {
  if (schemes) {
    await query(`
      INSERT INTO settings (key, value)
      VALUES ('payment_schemes', $1::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [JSON.stringify(schemes)]);
  }

  if (methods) {
    await query(`
      INSERT INTO settings (key, value)
      VALUES ('payment_methods', $1::jsonb)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `, [JSON.stringify(methods)]);
  }

  return getPaymentSettings();
}

async function selectPaymentScheme(bookingId, { skema_pembayaran, metode_pembayaran }, user = null, kontak = null) {
  const settings = await getPaymentSettings();

  if (skema_pembayaran) {
    const schemeConfig = settings.schemes[skema_pembayaran];
    if (!schemeConfig || !schemeConfig.enabled) {
      throw E.badRequest(`Skema pembayaran "${skema_pembayaran}" sedang tidak tersedia (BR-34).`);
    }
  }

  if (metode_pembayaran) {
    const methodConfig = settings.methods[metode_pembayaran];
    if (!methodConfig || !methodConfig.enabled) {
      throw E.badRequest(`Metode pembayaran "${metode_pembayaran}" sedang tidak tersedia (BR-36).`);
    }
  }

  return withTx(async (client) => {
    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
    const booking = bRes.rows[0];
    if (!booking) throw E.notFound('Booking tidak ditemukan.');

    verifyCustomerOrPhone(booking, user, kontak, 'memilih skema pembayaran');

    const updated = (await client.query(`
      UPDATE bookings
      SET skema_pembayaran = COALESCE($1, skema_pembayaran),
          metode_pembayaran = COALESCE($2, metode_pembayaran),
          updated_at = now()
      WHERE id = $3
      RETURNING *
    `, [skema_pembayaran || null, metode_pembayaran || null, bookingId])).rows[0];

    return {
      success: true,
      booking: updated,
      message: 'Skema dan metode pembayaran berhasil diperbarui. Booking tetap aktif (BR-38).',
    };
  });
}

async function uploadTransferProof(bookingId, { bukti_url, nominal, catatan, file }, user = null, kontak = null) {
  const resolvedUrl = file && file.storedName
    ? `/api/v1/files/${file.storedName}`
    : (bukti_url ? String(bukti_url).trim() : '');

  if (!resolvedUrl) {
    throw E.badRequest('Bukti pembayaran berupa foto/gambar atau tautan bukti wajib dilampirkan (BR-37).');
  }

  const nominalNum = Number(nominal);
  if (!nominalNum || nominalNum <= 0) {
    throw E.badRequest('Nominal pembayaran harus berupa angka positif.');
  }

  return withTx(async (client) => {
    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
    const booking = bRes.rows[0];
    if (!booking) throw E.notFound('Booking tidak ditemukan.');

    verifyCustomerOrPhone(booking, user, kontak, 'mengunggah bukti pembayaran');

    const updated = (await client.query(`
      UPDATE bookings
      SET bukti_pembayaran_url = $1,
          status_verifikasi_pembayaran = 'menunggu_verifikasi',
          catatan_verifikasi = $2,
          updated_at = now()
      WHERE id = $3
      RETURNING *
    `, [resolvedUrl, catatan ? String(catatan).trim() : null, bookingId])).rows[0];

    try {
      await notify({ query: (t, p) => client.query(t, p) }, {
        role: 'admin',
        id: null,
        title: 'Bukti Pembayaran Baru Diunggah',
        message: `Customer telah mengunggah bukti pembayaran untuk booking ${booking.kode_booking} sebesar Rp ${nominalNum.toLocaleString('id-ID')}. Mohon verifikasi manual (BR-37).`,
        type: 'booking',
        bookingId: booking.id,
        tautan: `/admin/invoices?verify=${booking.kode_booking || booking.id}`,
        dedup: `proof_uploaded_${booking.id}_${Date.now()}`,
      });
    } catch (_) {}

    return {
      success: true,
      message: 'Bukti pembayaran berhasil diunggah dan sedang menunggu verifikasi manual admin (BR-37).',
      bukti_pembayaran_url: resolvedUrl,
      booking: updated,
    };
  });
}

async function getPaymentProofFile(bookingId, fileName, user = null, kontak = null) {
  const safeName = path.basename(String(fileName || ''));
  if (!safeName || safeName !== fileName) {
    throw E.badRequest('Nama file bukti pembayaran tidak valid.');
  }
  const bRes = await query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
  const booking = bRes.rows[0];
  if (!booking) throw E.notFound('Booking tidak ditemukan.');

  try {
    verifyCustomerOrPhone(booking, user, kontak, 'melihat bukti pembayaran ini');
  } catch (err) {
    if (!booking.bukti_pembayaran_url || !booking.bukti_pembayaran_url.includes(safeName)) {
      throw err;
    }
  }

  const fullPath = path.join(UPLOAD_DIR, safeName);
  if (!fs.existsSync(fullPath)) {
    throw E.notFound('File bukti pembayaran tidak ditemukan di penyimpanan.');
  }
  const ext = path.extname(safeName).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return { fullPath, mime, safeName };
}

async function verifyPaymentProof(bookingId, { disetujui, catatan, nominal_disetujui }, adminUser) {
  if (typeof disetujui !== 'boolean') {
    throw E.badRequest('Status verifikasi disetujui (true/false) wajib ditentukan (BR-37).');
  }

  return withTx(async (client) => {
    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
    const booking = bRes.rows[0];
    if (!booking) throw E.notFound('Booking tidak ditemukan.');

    if (booking.status_verifikasi_pembayaran !== 'menunggu_verifikasi' && !booking.bukti_pembayaran_url) {
      throw E.badRequest('Booking ini belum memiliki bukti pembayaran yang menunggu verifikasi.');
    }

    let updated;
    if (disetujui) {
      const itemsRes = await client.query(`
        SELECT bi.*, sc.nama_layanan
        FROM booking_items bi
        LEFT JOIN service_catalog sc ON sc.id = bi.layanan_id
        WHERE bi.booking_id = $1
      `, [bookingId]);
      const invUsageRes = await client.query(`
        SELECT u.id, u.item_id, i.nama, i.satuan, u.jumlah, u.catatan
        FROM inventory_usage u
        JOIN inventory i ON i.id = u.item_id
        WHERE u.booking_id = $1
      `, [bookingId]);
      const memberRes = await client.query(
        `SELECT id FROM users WHERE customer_id = $1 AND role = 'customer' LIMIT 1`,
        [booking.customer_id]
      );
      booking.items = itemsRes.rows;
      booking.pemakaian_inventory = invUsageRes.rows;
      booking.is_member = Boolean(memberRes.rows[0]);

      const preInvoice = calculateInvoice(booking);
      const nominal = nominal_disetujui !== undefined && nominal_disetujui !== null && Number(nominal_disetujui) > 0
        ? Number(nominal_disetujui)
        : (preInvoice.balance_due > 0 ? preInvoice.balance_due : preInvoice.total);

      if (!nominal || nominal <= 0) {
        throw E.badRequest('Nominal yang disetujui harus lebih dari 0.');
      }

      const totalDibayarBaru = (Number(booking.total_dibayar) || 0) + nominal;
      booking.total_dibayar = totalDibayarBaru;

      const invoice = calculateInvoice(booking);
      const isLunas = invoice.balance_due === 0;

      updated = (await client.query(`
        UPDATE bookings
        SET status_verifikasi_pembayaran = 'diverifikasi',
            total_dibayar = $1,
            status_pembayaran = $2,
            verified_by = $3,
            verified_at = now(),
            catatan_verifikasi = $4,
            updated_at = now()
        WHERE id = $5
        RETURNING *
      `, [totalDibayarBaru, isLunas ? 'paid' : 'pending', adminUser.id, catatan || 'Pembayaran telah diverifikasi admin.', bookingId])).rows[0];

      await queueAndDispatchWhatsAppInvoice(bookingId, {
        tipe_invoice: booking.status === 'done' ? 'final' : 'initial',
        force: true,
      }, client);
    } else {
      if (!catatan || catatan.trim().length < 5) {
        throw E.badRequest('Alasan penolakan bukti pembayaran wajib dijelaskan minimal 5 karakter.');
      }

      updated = (await client.query(`
        UPDATE bookings
        SET status_verifikasi_pembayaran = 'ditolak',
            verified_by = $1,
            verified_at = now(),
            catatan_verifikasi = $2,
            updated_at = now()
        WHERE id = $3
        RETURNING *
      `, [adminUser.id, catatan.trim(), bookingId])).rows[0];
    }

    return {
      success: true,
      message: disetujui ? 'Pembayaran berhasil diverifikasi.' : 'Bukti pembayaran ditolak.',
      booking: updated,
    };
  });
}

async function processRefund(bookingId, { nominal_refund, catatan }, adminUser) {
  const nominal = Number(nominal_refund);
  if (!nominal || nominal <= 0) {
    throw E.badRequest('Nominal refund harus lebih dari 0 (BR-41).');
  }

  return withTx(async (client) => {
    const bRes = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [bookingId]);
    const booking = bRes.rows[0];
    if (!booking) throw E.notFound('Booking tidak ditemukan.');

    const updated = (await client.query(`
      UPDATE bookings
      SET refund_nominal = $1,
          refund_status = 'processed',
          refund_catatan = $2,
          updated_at = now()
      WHERE id = $3
      RETURNING *
    `, [nominal, catatan ? catatan.trim() : 'Kelebihan pembayaran telah dikembalikan kepada customer.', bookingId])).rows[0];

    return {
      success: true,
      message: `Pengembalian kelebihan pembayaran sebesar Rp ${nominal.toLocaleString('id-ID')} berhasil diproses (BR-41).`,
      booking: updated,
    };
  });
}

async function queueAndDispatchWhatsAppInvoice(bookingId, { tipe_invoice = 'auto', simulatedFailure = false, kontak = null, force = false } = {}, userOrDbClient = null) {
  const isDbClient = userOrDbClient && typeof userOrDbClient.query === 'function';
  const db = isDbClient ? userOrDbClient : { query };
  const callerUser = !isDbClient ? userOrDbClient : null;

  const bRes = await db.query(`
    SELECT b.*, c.nama AS customer_nama, c.kontak AS customer_kontak,
           s.nama_layanan
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    LEFT JOIN service_catalog s ON s.id = b.layanan_id
    WHERE b.id = $1
  `, [bookingId]);

  const booking = bRes.rows[0];
  if (!booking) throw E.notFound('Booking tidak ditemukan.');

  if (!isDbClient) {
    if (callerUser && callerUser.role === 'customer') {
      const callerCustId = callerUser.customer_id || callerUser.customerId;
      if (callerCustId && Number(callerCustId) !== Number(booking.customer_id)) {
        throw E.forbidden('Anda tidak berhak mengirim invoice untuk booking milik pelanggan lain.');
      }
    } else if (!callerUser) {
      verifyCustomerOrPhone(booking, null, kontak, 'mengirim invoice ke WhatsApp');
    }
  }

  const determinedType = tipe_invoice === 'auto'
    ? (booking.status === 'done' ? 'final' : 'initial')
    : tipe_invoice;

  if (!force && !simulatedFailure) {
    try {
      const recentRes = await db.query(`
        SELECT * FROM whatsapp_invoice_logs
        WHERE booking_id = $1 AND tipe_invoice = $2 AND status = 'sent'
          AND waktu_kirim >= NOW() - INTERVAL '60 seconds'
        ORDER BY id DESC LIMIT 1
      `, [bookingId, determinedType]);
      if (recentRes.rows[0]) {
        return {
          success: true,
          status: 'sent',
          deduplicated: true,
          log: recentRes.rows[0],
          message: 'Invoice sudah dikirim ke nomor WhatsApp Anda baru saja (mencegah pengiriman pesan ganda).',
        };
      }
    } catch (_) {}
  }

  const itemsRes = await db.query(`
    SELECT bi.*, sc.nama_layanan
    FROM booking_items bi
    LEFT JOIN service_catalog sc ON sc.id = bi.layanan_id
    WHERE bi.booking_id = $1
  `, [bookingId]);
  const invUsageRes = await db.query(`
    SELECT u.id, u.item_id, i.nama, i.satuan, u.jumlah, u.catatan
    FROM inventory_usage u
    JOIN inventory i ON i.id = u.item_id
    WHERE u.booking_id = $1
  `, [bookingId]);
  const memberRes = await db.query(
    `SELECT id FROM users WHERE customer_id = $1 AND role = 'customer' LIMIT 1`,
    [booking.customer_id]
  );
  booking.items = itemsRes.rows;
  booking.pemakaian_inventory = invUsageRes.rows;
  booking.is_member = Boolean(memberRes.rows[0]);

  const invoice = calculateInvoice(booking);
  const phone = (booking.kontak || booking.customer_kontak || '').trim();
  const invoiceLink = `https://www.narateknindotama.com/status/${booking.kode_booking}`;

  const pesan = [
    `*NARA AC SERVICE - ${determinedType === 'final' ? 'INVOICE FINAL' : 'INVOICE AWAL'}*`,
    `Halo *${booking.customer_nama}*,`,
    `Berikut rincian tagihan servis AC Anda (No: ${booking.kode_booking}):`,
    `----------------------------------------`,
    `Layanan: ${booking.nama_layanan || 'Servis AC'} (${invoice.units} unit)`,
    `Subtotal Jasa: Rp ${invoice.subtotal_jasa.toLocaleString('id-ID')}`,
    invoice.subtotal_sparepart > 0 ? `Subtotal Spare Part: Rp ${invoice.subtotal_sparepart.toLocaleString('id-ID')}` : null,
    invoice.discount > 0 ? `Diskon: -Rp ${invoice.discount.toLocaleString('id-ID')} (${invoice.discount_reason})` : null,
    `*TOTAL: Rp ${invoice.total.toLocaleString('id-ID')}*`,
    `Total Dibayar: Rp ${invoice.total_dibayar.toLocaleString('id-ID')}`,
    invoice.balance_due > 0 ? `*SISA KURANG BAYAR: Rp ${invoice.balance_due.toLocaleString('id-ID')}*` : null,
    invoice.refund_amount > 0 ? `*KELEBIHAN BAYAR (REFUND): Rp ${invoice.refund_amount.toLocaleString('id-ID')}*` : null,
    `----------------------------------------`,
    `Lihat / Cetak Invoice Resmi:`,
    invoiceLink,
    `\nTerima kasih telah mempercayakan perawatan AC Anda kepada CV. Nara Teknindotama.`,
  ].filter(Boolean).join('\n');

  const logInsert = await db.query(`
    INSERT INTO whatsapp_invoice_logs (
      booking_id, tipe_invoice, nomor_whatsapp, pesan, tautan_invoice, status, percobaan, waktu_kirim
    ) VALUES ($1, $2, $3, $4, $5, 'pending', 0, NULL)
    RETURNING *
  `, [bookingId, determinedType, phone, pesan, invoiceLink]);

  const logId = logInsert.rows[0].id;

  try {
    if (simulatedFailure) {
      throw new Error('Simulated WhatsApp Gateway Network Timeout (BR-43)');
    }

    const updatedLog = (await db.query(`
      UPDATE whatsapp_invoice_logs
      SET status = 'sent',
          percobaan = percobaan + 1,
          waktu_kirim = now(),
          updated_at = now()
      WHERE id = $1
      RETURNING *
    `, [logId])).rows[0];

    return {
      success: true,
      status: 'sent',
      log: updatedLog,
      message: 'Invoice berhasil dikirim ke nomor WhatsApp pelanggan (BR-42).',
    };
  } catch (err) {
    const updatedLog = (await db.query(`
      UPDATE whatsapp_invoice_logs
      SET status = 'failed',
          percobaan = percobaan + 1,
          error_terakhir = $1,
          updated_at = now()
      WHERE id = $2
      RETURNING *
    `, [err.message, logId])).rows[0];

    return {
      success: false,
      status: 'failed',
      log: updatedLog,
      error: err.message,
      message: 'Pengiriman WhatsApp gagal, dijadwalkan untuk pengiriman ulang otomatis (BR-42).',
    };
  }
}

async function retryFailedWhatsAppInvoices(maxLimit = 20) {
  const failedLogs = (await query(`
    SELECT * FROM whatsapp_invoice_logs
    WHERE status = 'failed' AND percobaan < max_percobaan
    ORDER BY created_at ASC
    LIMIT $1
  `, [maxLimit])).rows;

  const results = [];

  for (const log of failedLogs) {
    try {
      const updated = (await query(`
        UPDATE whatsapp_invoice_logs
        SET status = 'sent',
            percobaan = percobaan + 1,
            waktu_kirim = now(),
            error_terakhir = NULL,
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `, [log.id])).rows[0];

      results.push({ id: log.id, status: 'sent', success: true, booking_id: updated.booking_id });
    } catch (err) {
      const updated = (await query(`
        UPDATE whatsapp_invoice_logs
        SET percobaan = percobaan + 1,
            error_terakhir = $1,
            updated_at = now()
        WHERE id = $2
        RETURNING *
      `, [err.message, log.id])).rows[0];

      results.push({ id: log.id, status: updated.status, success: false, error: err.message });
    }
  }

  return {
    total_retried: failedLogs.length,
    results,
  };
}

module.exports = {
  getPaymentSettings,
  updatePaymentSettings,
  selectPaymentScheme,
  uploadTransferProof,
  getPaymentProofFile,
  verifyPaymentProof,
  processRefund,
  queueAndDispatchWhatsAppInvoice,
  retryFailedWhatsAppInvoices,
};

const express = require('express');
const crypto = require('crypto');
const { query } = require('../db/pool');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const { normalizePhone } = require('../utils/ids');
const { E } = require('../errors');
const acUnitService = require('../services/acUnitService');
const bookingService = require('../services/bookingService');

const router = express.Router();
router.use(requireAuth(['customer']));

const idParam = Joi.object({ id: Joi.number().integer().positive().required() });
const getCustomerId = async (req) => {
  if (req.user?.customer_id) return req.user.customer_id;
  if (req.user?.customerId) return req.user.customerId;
  if (req.user?.id) {
    const u = (await query('SELECT customer_id FROM users WHERE id = $1', [req.user.id])).rows[0];
    if (u?.customer_id) {
      req.user.customer_id = u.customer_id;
      req.user.customerId = u.customer_id;
      return u.customer_id;
    }
  }
  return null;
};

const acUnitSchema = Joi.object({
  brand: Joi.string().trim().max(50).required().label('Merk'),
  model: Joi.string().trim().max(100).allow('', null).label('Model'),
  tipe: Joi.string().trim().max(50).allow('', null).label('Tipe'),
  kapasitas_pk: Joi.number().positive().allow(null).label('Kapasitas PK'),
  lokasi: Joi.string().trim().max(100).required().label('Lokasi'),
  tanggal_pasang: Joi.date().iso().allow(null).label('Tanggal Pasang'),
  nomor_seri: Joi.string().trim().max(100).allow('', null).label('Nomor Seri'),
  catatan: Joi.string().trim().max(500).allow('', null).label('Catatan'),
});

router.get('/ac-units', validate(Joi.object({
  aktif: Joi.boolean().default(true),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
}), 'query'), wrap(async (req, res) => {
  const { aktif, page, limit } = req.valid.query;
  const customerId = await getCustomerId(req);
  if (!customerId) return res.json({ data: [], meta: { total: 0, page, limit } });
  const offset = (page - 1) * limit;
  const result = await query(
    'SELECT * FROM ac_units WHERE customer_id = $1 AND aktif = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4',
    [customerId, aktif, limit, offset]
  );
  const total = (await query('SELECT COUNT(*)::int FROM ac_units WHERE customer_id = $1 AND aktif = $2', [customerId, aktif])).rows[0].count;

  const enriched = await Promise.all(result.rows.map(async (u) => {
    const maint = await acUnitService.getUnitMaintenanceInfo(u.id);
    return {
      ...u,
      total_servis_selesai: maint?.total_servis_selesai || 0,
      servis_terakhir: maint?.servis_terakhir || null,
      jadwal_perawatan_berikutnya: maint?.jadwal_perawatan_berikutnya || null,
      hari_menuju_perawatan: maint?.hari_menuju_perawatan ?? null,
      status_perawatan: maint?.status_perawatan || 'optimal',
      booking_mendatang: maint?.booking_mendatang || null,
      riwayat_servis: maint?.riwayat_servis || [],
    };
  }));

  res.json({ data: enriched, meta: { total: Number(total), page, limit } });
}));

router.get('/ac-units/:id', validate(idParam, 'params'), wrap(async (req, res) => {
  const customerId = await getCustomerId(req);
  if (!customerId) throw E.notFound('Unit AC tidak ditemukan');
  const unit = await query('SELECT id FROM ac_units WHERE id=$1 AND customer_id=$2', [req.params.id, customerId]);
  if (!unit.rows.length) throw E.notFound('Unit AC tidak ditemukan');
  const maint = await acUnitService.getUnitMaintenanceInfo(req.params.id);
  res.json({ data: maint });
}));

router.post('/ac-units', validate(acUnitSchema), wrap(async (req, res) => {
  const b = req.body;
  const customerId = await getCustomerId(req);
  if (!customerId) throw E.business('Profil customer belum lengkap. Silakan lengkapi profil.');
  const result = await query(`
    INSERT INTO ac_units (customer_id, brand, model, tipe, kapasitas_pk, lokasi, tanggal_pasang, nomor_seri, catatan)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `, [customerId, b.brand, b.model, b.tipe, b.kapasitas_pk, b.lokasi, b.tanggal_pasang, b.nomor_seri, b.catatan]);
  res.status(201).json({ data: result.rows[0] });
}));

router.patch('/ac-units/:id', validate(idParam, 'params'), validate(acUnitSchema), wrap(async (req, res) => {
  const b = req.body;
  const customerId = await getCustomerId(req);
  if (!customerId) throw E.notFound('Unit AC tidak ditemukan');
  const unit = await query('SELECT id FROM ac_units WHERE id=$1 AND customer_id=$2', [req.params.id, customerId]);
  if (!unit.rows.length) throw E.notFound('Unit AC tidak ditemukan');

  const result = await query(`
    UPDATE ac_units SET brand=$1, model=$2, tipe=$3, kapasitas_pk=$4, lokasi=$5, tanggal_pasang=$6, nomor_seri=$7, catatan=$8, updated_at=now()
    WHERE id=$9 RETURNING *
  `, [b.brand, b.model, b.tipe, b.kapasitas_pk, b.lokasi, b.tanggal_pasang, b.nomor_seri, b.catatan, req.params.id]);
  res.json({ data: result.rows[0] });
}));

router.delete('/ac-units/:id', validate(idParam, 'params'), validate(Joi.object({}), 'body'), wrap(async (req, res) => {
  const customerId = await getCustomerId(req);
  if (!customerId) throw E.notFound('Unit AC tidak ditemukan');
  const unit = await query('SELECT id FROM ac_units WHERE id=$1 AND customer_id=$2', [req.params.id, customerId]);
  if (!unit.rows.length) throw E.notFound('Unit AC tidak ditemukan');
  await query('UPDATE ac_units SET aktif=false, updated_at=now() WHERE id=$1', [req.params.id]);
  res.json({ success: true });
}));

router.get('/history', validate(Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}), 'query'), wrap(async (req, res) => {
  const { page, limit } = req.valid.query;
  const customerId = await getCustomerId(req);
  if (!customerId) return res.json({ data: [], meta: { total: 0, page, limit } });
  const offset = (page - 1) * limit;
  const q = `
    SELECT b.*, s.nama_layanan, COALESCE(s.garansi_hari, 14) AS garansi_hari,
           t.nama AS teknisi_nama, au.brand, au.lokasi,
           f.rating, f.komentar, (f.id IS NOT NULL) AS sudah_feedback
    FROM bookings b
    JOIN service_catalog s ON b.layanan_id = s.id
    LEFT JOIN technicians t ON b.teknisi_id = t.id
    LEFT JOIN ac_units au ON b.ac_unit_id = au.id
    LEFT JOIN feedback f ON f.booking_id = b.id
    WHERE b.customer_id = $1
    ORDER BY b.jadwal_mulai DESC LIMIT $2 OFFSET $3
  `;
  const result = await query(q, [customerId, limit, offset]);
  const total = (await query('SELECT COUNT(*)::int FROM bookings WHERE customer_id = $1', [customerId])).rows[0].count;
  res.json({ data: result.rows, meta: { total: Number(total), page, limit } });
}));

router.get('/notifications', validate(Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(50),
  page: Joi.number().integer().min(1).default(1),
  unread: Joi.boolean(),
}), 'query'), wrap(async (req, res) => {
  const { limit, page, unread } = req.valid.query;
  const customerId = await getCustomerId(req);
  if (!customerId) return res.json({ data: [], meta: { total: 0, page, limit } });
  const offset = (page - 1) * limit;
  const params = ['customer', customerId];
  let where = 'target_role = $1 AND target_id = $2';
  if (unread !== undefined) {
    params.push(unread ? false : true);
    where += ` AND is_read = $${params.length}`;
  }
  const result = await query(
    `SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const total = (await query(`SELECT COUNT(*)::int FROM notifications WHERE ${where}`, params)).rows[0].count;
  res.json({ data: result.rows, meta: { total: Number(total), page, limit } });
}));

const markCustomerNotificationRead = wrap(async (req, res) => {
  const customerId = await getCustomerId(req);
  if (!customerId) return res.json({ success: true, ok: true });
  await query('UPDATE notifications SET is_read = true WHERE id = $1 AND target_role = $2 AND target_id = $3', [req.params.id, 'customer', customerId]);
  res.json({ success: true, ok: true });
});

const markAllCustomerNotificationsRead = wrap(async (req, res) => {
  const customerId = await getCustomerId(req);
  if (!customerId) return res.json({ success: true, ok: true });
  await query('UPDATE notifications SET is_read = true WHERE target_role = $1 AND target_id = $2', ['customer', customerId]);
  res.json({ success: true, ok: true });
});

router.patch('/notifications/:id/read', validate(idParam, 'params'), markCustomerNotificationRead);
router.post('/notifications/:id/read', validate(idParam, 'params'), markCustomerNotificationRead);

router.post('/notifications/read-all', markAllCustomerNotificationsRead);
router.patch('/notifications/read-all', markAllCustomerNotificationsRead);

router.post('/profile/request-phone-change', validate(Joi.object({
  kontak_baru: Joi.string().trim().max(30).required().label('Nomor WhatsApp Baru'),
})), wrap(async (req, res) => {
  const phone = normalizePhone(req.body.kontak_baru);
  if (!phone) {
    throw E.validation('Nomor WhatsApp tidak valid.', { kontak_baru: 'Gunakan nomor WhatsApp Indonesia yang aktif, contoh: 081234567890.' });
  }
  const taken = (await query(
    `SELECT id FROM users WHERE kontak = $1 AND id <> $2`,
    [phone, req.user.id]
  )).rows[0];
  if (taken) {
    throw E.conflict('Nomor WhatsApp tersebut sudah digunakan oleh akun lain.');
  }

  const rawOtp = crypto.randomInt(100000, 999999).toString();
  const otpHash = crypto.createHash('sha256').update(rawOtp).digest('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await query(
    'INSERT INTO whatsapp_otps (kontak, otp_hash, expires_at) VALUES ($1, $2, $3)',
    [phone, otpHash, expiresAt],
  );

  res.json({
    success: true,
    kontak_baru: phone,
    message: `Kode OTP verifikasi perubahan nomor telah dikirim ke ${phone}.`,
    ...(process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEV_OTP === 'true' ? { _dev_otp: rawOtp } : {}),
  });
}));

const customerProfileSchema = Joi.object({
  nama: Joi.string().trim().min(2).max(80).required().label('Nama Lengkap'),
  email: Joi.string().email({ tlds: { allow: false } }).max(120).required().label('Email'),
  kontak: Joi.string().trim().allow('', null).max(30).optional().label('Nomor WhatsApp / HP'),
  alamat: Joi.string().trim().allow('', null).max(500).optional().label('Alamat Utama'),
  otp: Joi.string().trim().length(6).optional().allow('', null).label('Kode OTP Verifikasi Nomor Baru'),
});

router.get('/profile', wrap(async (req, res) => {
  const u = (await query('SELECT id, nama, email, kontak, role, customer_id, created_at FROM users WHERE id = $1', [req.user.id])).rows[0];
  let cust = null;
  if (u && u.customer_id) {
    cust = (await query('SELECT id, nama, kontak, alamat, catatan_umum, created_at FROM customers WHERE id = $1', [u.customer_id])).rows[0];
  }
  res.json({
    data: {
      user: u,
      customer: cust,
    },
  });
}));

router.patch('/profile', validate(customerProfileSchema), wrap(async (req, res) => {
  const { nama, email, kontak, alamat, otp } = req.body;
  const existing = (await query('SELECT id FROM users WHERE lower(email)=lower($1) AND id<>$2', [email, req.user.id])).rows[0];
  if (existing) throw E.conflict('Email sudah digunakan oleh akun lain.');

  const prevUser = (await query('SELECT id, nama, email, kontak, customer_id FROM users WHERE id = $1', [req.user.id])).rows[0];
  let prevCust = null;
  if (prevUser?.customer_id) {
    prevCust = (await query('SELECT id, kontak, alamat FROM customers WHERE id = $1', [prevUser.customer_id])).rows[0];
  }

  const currentPhone = normalizePhone(prevUser?.kontak || prevCust?.kontak || '');
  const requestedPhone = kontak ? normalizePhone(kontak) : currentPhone;

  if (kontak && !requestedPhone) {
    throw E.validation('Nomor WhatsApp tidak valid.', { kontak: 'Gunakan nomor HP Indonesia yang valid.' });
  }

  if (currentPhone && requestedPhone && requestedPhone !== currentPhone) {
    if (!otp || String(otp).trim().length !== 6) {
      throw E.forbidden('Nomor telepon terverifikasi tidak dapat diubah secara langsung tanpa verifikasi kode OTP. Gunakan alur Ubah Nomor.');
    }
    const tokenHash = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
    const otpRow = (await query(
      `SELECT id, otp_hash FROM whatsapp_otps
       WHERE kontak = $1 AND is_used = false AND expires_at > now()
       ORDER BY id DESC LIMIT 1`,
      [requestedPhone]
    )).rows[0];
    if (!otpRow || otpRow.otp_hash !== tokenHash) {
      throw E.forbidden('Kode OTP verifikasi nomor WhatsApp baru tidak valid atau sudah kedaluwarsa.');
    }
    await query('UPDATE whatsapp_otps SET is_used = true WHERE id = $1', [otpRow.id]);
  }

  const finalPhone = requestedPhone || currentPhone || null;

  const u = (await query(
    'UPDATE users SET nama=$1, email=$2, kontak=$3 WHERE id=$4 RETURNING id, nama, email, role, kontak, customer_id, created_at',
    [nama, email, finalPhone, req.user.id]
  )).rows[0];

  let cust = null;
  if (u.customer_id) {
    cust = (await query(
      'UPDATE customers SET nama=$1, kontak=$2, alamat=$3 WHERE id=$4 RETURNING *',
      [nama, finalPhone || '', alamat !== undefined ? (alamat || null) : (prevCust?.alamat || null), u.customer_id]
    )).rows[0];
  }

  res.json({
    success: true,
    message: 'Profil Anda berhasil diperbarui.',
    data: {
      user: u,
      customer: cust,
    },
  });
}));

router.get('/dashboard', validate(Joi.object({}), 'query'), wrap(async (req, res) => {
  const customerId = await getCustomerId(req);
  if (!customerId) {
    return res.json({
      data: {
        active_bookings: [],
        ac_units_count: 0,
        history_count: 0,
        unread_notifications: 0,
      },
    });
  }
  const activeBookings = await query(`
    SELECT b.*, s.nama_layanan, t.nama as teknisi_nama 
    FROM bookings b
    JOIN service_catalog s ON b.layanan_id = s.id
    LEFT JOIN technicians t ON b.teknisi_id = t.id
    WHERE b.customer_id = $1 AND b.status IN ('scheduled', 'on process', 'rescheduled', 'delayed')
    ORDER BY b.jadwal_mulai ASC LIMIT 5
  `, [customerId]);

  const acUnitsCount = await query('SELECT count(*) FROM ac_units WHERE customer_id = $1 AND aktif = true', [customerId]);
  const historyCount = await query('SELECT count(*) FROM bookings WHERE customer_id = $1 AND status = $2', [customerId, 'done']);
  const unreadNotifs = await query('SELECT count(*) FROM notifications WHERE target_role = $1 AND target_id = $2 AND is_read = false', ['customer', customerId]);

  res.json({
    data: {
      active_bookings: activeBookings.rows,
      ac_units_count: parseInt(acUnitsCount.rows[0].count, 10),
      history_count: parseInt(historyCount.rows[0].count, 10),
      unread_notifications: parseInt(unreadNotifs.rows[0].count, 10),
    },
  });
}));

router.patch('/bookings/:id/reschedule', validate(idParam, 'params'), validate(Joi.object({
  jadwal_mulai: Joi.string().trim().required().label('Jadwal Baru'),
}), 'body'), wrap(async (req, res) => {
  const customerId = await getCustomerId(req);
  if (!customerId) throw E.notFound('Pekerjaan tidak ditemukan atau bukan milik akun Anda.');
  const bookingId = Number(req.params.id);
  const b = (await query('SELECT * FROM bookings WHERE id = $1 AND customer_id = $2', [bookingId, customerId])).rows[0];
  if (!b) throw E.notFound('Pekerjaan tidak ditemukan atau bukan milik akun Anda.');

  const updated = await bookingService.reschedule(bookingId, req.body.jadwal_mulai, { label: `customer:${req.user.nama || 'Pelanggan'}` });
  res.json({
    success: true,
    message: 'Jadwal kunjungan servis berhasil diubah.',
    data: updated,
  });
}));

router.post('/bookings/:id/confirm-done', validate(idParam, 'params'), validate(Joi.object({
  catatan: Joi.string().trim().max(300).allow('').optional(),
}), 'body'), wrap(async (req, res) => {
  const customerId = await getCustomerId(req);
  if (!customerId) throw E.notFound('Pekerjaan tidak ditemukan atau bukan milik akun Anda.');
  const bookingId = Number(req.params.id);

  const b = (await query('SELECT * FROM bookings WHERE id = $1 AND customer_id = $2', [bookingId, customerId])).rows[0];
  if (!b) throw E.notFound('Pekerjaan tidak ditemukan atau bukan milik akun Anda.');
  if (b.status !== 'done') throw E.business('Hanya pekerjaan yang telah diselesaikan oleh teknisi yang dapat dikonfirmasi.');

  await query(
    `UPDATE bookings
     SET konfirmasi_pelanggan = TRUE,
         waktu_konfirmasi_pelanggan = COALESCE(waktu_konfirmasi_pelanggan, NOW()),
         updated_at = NOW()
     WHERE id = $1`,
    [bookingId]
  );
  await query(
    `INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan)
     VALUES ($1, 'done', 'done', $2, $3)`,
    [bookingId, `customer:${req.user.nama || 'Pelanggan'}`, req.body.catatan || 'Pelanggan telah memverifikasi dan mengonfirmasi pekerjaan selesai']
  );

  res.json({
    success: true,
    message: 'Terima kasih, konfirmasi pekerjaan selesai telah berhasil dicatat.',
    booking_id: bookingId,
    status: 'done',
  });
}));

router.post('/bookings/:id/review', validate(idParam, 'params'), validate(Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().label('Rating'),
  komentar: Joi.string().trim().min(3).max(500).required().label('Komentar Review'),
})), wrap(async (req, res) => {
  const customerId = await getCustomerId(req);
  if (!customerId) throw E.notFound('Pekerjaan tidak ditemukan atau bukan milik akun Anda.');
  const bookingId = Number(req.params.id);
  const b = (await query('SELECT * FROM bookings WHERE id = $1 AND customer_id = $2', [bookingId, customerId])).rows[0];
  if (!b) throw E.notFound('Pekerjaan tidak ditemukan atau bukan milik akun Anda.');
  if (b.status !== 'done') throw E.business('Review hanya dapat diberikan untuk pekerjaan yang telah selesai.');
  if (!b.konfirmasi_pelanggan) {
    throw E.business('Silakan konfirmasi penyelesaian pekerjaan terlebih dahulu sebelum memberikan review.');
  }
  const out = await bookingService.submitFeedback(bookingId, {
    kode_booking: b.kode_booking,
    rating: req.body.rating,
    komentar: req.body.komentar,
  }, null, req.user);
  res.status(201).json({
    success: true,
    message: 'Review Anda berhasil disimpan.',
    data: out,
  });
}));

module.exports = router;

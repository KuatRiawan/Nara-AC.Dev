const express = require('express');
const rateLimit = require('express-rate-limit');
const { query } = require('../db/pool');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const svc = require('../services/bookingService');
const { E } = require('../errors');

const router = express.Router();

const publicLimiter = rateLimit({
  windowMs: 60000, limit: Number(process.env.PUBLIC_RATE_LIMIT || 40), standardHeaders: true, legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMIT,
  handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' } }),
});

const bookingItemSchema = Joi.object({
  layanan_id: Joi.number().integer().positive().required().label('Layanan ID'),
  jumlah_unit: Joi.number().integer().min(1).max(20).default(1).label('Jumlah Unit'),
  catatan: Joi.string().trim().allow('').max(200).optional().label('Catatan'),
});

const bookingSchema = Joi.object({
  nama: Joi.string().trim().min(2).max(80).required().label('Nama'),
  kontak: Joi.string().trim().max(20).required().label('Kontak'),
  layanan_id: Joi.number().integer().positive().optional().label('Layanan'),
  items: Joi.array().items(bookingItemSchema).min(1).optional().label('Items Layanan'),
  jadwal_mulai: Joi.string().trim().required().label('Jadwal'),
  alamat: Joi.string().trim().max(500).required().label('Alamat'),
  keluhan: Joi.string().trim().allow('').max(500).label('Keluhan'),
  jumlah_unit: Joi.number().integer().min(1).max(20).default(1).label('Jumlah Unit'),
  ac_unit_id: Joi.number().integer().positive().allow(null),
  teknisi_id: Joi.number().integer().positive().allow(null),
  idempotency_key: Joi.string().trim().max(100).allow('', null).optional().label('Idempotency Key'),
  skema_pembayaran: Joi.string().valid('full_upfront', 'dp_50', 'pay_after_service').default('pay_after_service').optional().label('Skema Pembayaran'),
  metode_pembayaran: Joi.string().valid('transfer', 'qris', 'cash').default('transfer').optional().label('Metode Pembayaran'),
}).or('layanan_id', 'items');

const listSchema = Joi.object({
  q: Joi.string().trim().max(80).allow(''),
  status: Joi.string().valid('scheduled', 'on process', 'done', 'cancelled', 'rescheduled', 'delayed'),
  teknisi_id: Joi.number().integer().positive(),
  belum_ditugaskan: Joi.boolean(),
  dari: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  sampai: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  urut: Joi.string().valid('terdekat', 'terbaru'),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(1000),
});

const idParam = Joi.object({ id: Joi.number().integer().positive().required().label('ID') });
const KODE_REGEX = /^(NARA-AC[A-Za-z0-9-]+|AC-[A-Za-z0-9-]+|BK-[A-Za-z0-9-]+)$/i;

router.get('/services', validate(Joi.object({
  aktif: Joi.boolean().default(true),
}), 'query'), wrap(async (req, res) => {
  const { aktif } = req.valid.query;
  const rows = (await query(
    'SELECT id, kode, nama_layanan, kategori, deskripsi, harga, durasi_menit, COALESCE(garansi_hari, 14) AS garansi_hari, COALESCE(interval_maintenance_hari, 90) AS interval_maintenance_hari, is_synthetic FROM service_catalog WHERE aktif=$1 ORDER BY id', [aktif])).rows;
  const ops = await svc.getOps();
  res.json({ data: rows, jam_operasional: { buka: ops.open, tutup: ops.close, hari: ops.days, slot_menit: ops.slot_minutes } });
}));

router.get('/availability', publicLimiter, validate(Joi.object({
  tanggal: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().label('Tanggal'),
  layanan_id: Joi.number().integer().positive().required().label('Layanan'),
  jumlah_unit: Joi.number().integer().min(1).max(20).default(1).label('Jumlah Unit'),
  durasi_menit: Joi.number().integer().min(15).max(720).optional().label('Total Durasi Menit'),
}), 'query'), wrap(async (req, res) => {
  const q = req.valid.query;
  if (Number.isNaN(Date.parse(q.tanggal))) throw E.validation('Tanggal tidak valid.', { tanggal: 'Tanggal tidak valid.' });
  res.json(await svc.getAvailability(q.tanggal, q.layanan_id, q.jumlah_unit || 1, new Date(), q.durasi_menit || null));
}));

router.get('/public/bookings/:kode', publicLimiter, validate(Joi.object({
  kode: Joi.string().pattern(KODE_REGEX).required().label('Kode Booking'),
}), 'params'), wrap(async (req, res) => {
  res.json(await svc.publicStatusByCode(req.params.kode));
}));

router.post('/public/bookings/:kode/verify-phone', publicLimiter, validate(Joi.object({
  kontak: Joi.string().trim().min(8).max(25).required().label('Nomor WhatsApp Pemesan'),
})), wrap(async (req, res) => {
  if (!KODE_REGEX.test(req.params.kode)) throw E.notFound('Kode booking tidak ditemukan.');
  const booking = await svc.verifyPublicBookingOwnership(req.params.kode, req.body.kontak, { allowCancelled: true, minDigits: 8 });
  res.json({
    success: true,
    verified: true,
    kode_booking: booking.kode_booking,
    kontak_terverifikasi: booking.kontak,
    customer_nama: booking.customer_nama,
    alamat: booking.alamat,
  });
}));

router.patch('/public/bookings/:kode/reschedule', publicLimiter, validate(Joi.object({
  jadwal_mulai: Joi.string().trim().required().label('Jadwal Baru'),
  kontak: Joi.string().pattern(/^\d{6,20}$/).required().label('6-20 digit kontak'),
})), wrap(async (req, res) => {
  if (!KODE_REGEX.test(req.params.kode)) throw E.notFound('Kode booking tidak ditemukan.');
  const booking = await svc.verifyPublicBooking(req.params.kode, req.body.kontak);
  res.json(await svc.reschedule(booking.id, req.body.jadwal_mulai, { label: 'customer' }));
}));

router.patch('/public/bookings/:kode/cancel', publicLimiter, validate(Joi.object({
  kontak: Joi.string().pattern(/^\d{6,20}$/).required().label('6-20 digit kontak'),
  alasan: Joi.string().trim().max(300).allow(''),
})), wrap(async (req, res) => {
  if (!KODE_REGEX.test(req.params.kode)) throw E.notFound('Kode booking tidak ditemukan.');
  const booking = await svc.verifyPublicBooking(req.params.kode, req.body.kontak);
  res.json(await svc.cancelBooking(booking.id, { label: 'customer' }, req.body.alasan || 'Dibatalkan oleh pelanggan'));
}));

router.post('/public/bookings/:kode/confirm-done', publicLimiter, validate(Joi.object({
  kontak: Joi.string().pattern(/^\d{6,20}$/).required().label('6-20 digit kontak'),
  catatan: Joi.string().trim().max(300).allow('').optional(),
})), wrap(async (req, res) => {
  if (!KODE_REGEX.test(req.params.kode)) throw E.notFound('Kode booking tidak ditemukan.');
  const booking = await svc.verifyPublicBooking(req.params.kode, req.body.kontak);
  if (booking.status !== 'done') throw E.business('Hanya pekerjaan yang telah berstatus selesai yang dapat dikonfirmasi.');

  await query(
    `UPDATE bookings
     SET konfirmasi_pelanggan = TRUE,
         waktu_konfirmasi_pelanggan = COALESCE(waktu_konfirmasi_pelanggan, NOW()),
         updated_at = NOW()
     WHERE id = $1`,
    [booking.id]
  );
  await query(
    `INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan)
     VALUES ($1, 'done', 'done', 'customer', $2)`,
    [booking.id, req.body.catatan || 'Pelanggan telah memverifikasi dan mengonfirmasi pekerjaan selesai']
  );

  res.json({
    success: true,
    message: 'Konfirmasi pekerjaan selesai berhasil dicatat. Terima kasih!',
    kode_booking: booking.kode_booking,
    status: 'done',
    konfirmasi_pelanggan: true,
  });
}));

router.get('/public/bookings/:kode/invoice', publicLimiter, optionalAuth, validate(Joi.object({
  kode: Joi.string().pattern(KODE_REGEX).required().label('Kode Booking'),
}), 'params'), wrap(async (req, res) => {
  const booking = await svc.publicStatusByCode(req.params.kode);
  const invoice = svc.calculateInvoice(booking);

  let isVerified = false;
  let verifiedCustomer = null;
  if (req.user && (req.user.role === 'admin' || req.user.role === 'technician')) {
    isVerified = true;
  } else if (req.user && req.user.role === 'customer' && (req.user.customerId === booking.customer_id || req.user.customer_id === booking.customer_id)) {
    isVerified = true;
  } else if (req.query?.kontak) {
    try {
      verifiedCustomer = await svc.verifyPublicBookingOwnership(req.params.kode, req.query.kontak, { allowCancelled: true, minDigits: 8 });
      isVerified = true;
    } catch {
      isVerified = false;
    }
  }

  if (isVerified && !verifiedCustomer) {
    const raw = (await query(
      `SELECT b.kontak, b.alamat, c.nama AS customer_nama FROM bookings b JOIN customers c ON c.id = b.customer_id WHERE b.id = $1`,
      [booking.id]
    )).rows[0];
    verifiedCustomer = raw || null;
  }

  invoice.is_verified_ownership = isVerified;
  if (isVerified && verifiedCustomer) {
    invoice.customer_nama_unmasked = verifiedCustomer.customer_nama;
    invoice.kontak_terdaftar_unmasked = verifiedCustomer.kontak;
    invoice.alamat_unmasked = verifiedCustomer.alamat;
  }
  res.json(invoice);
}));

router.post('/bookings/:id/feedback', publicLimiter, optionalAuth, validate(idParam, 'params'), validate(Joi.object({
  kode_booking: Joi.string().trim().required().label('Kode booking'),
  kontak: Joi.string().trim().allow('').max(30).label('Kontak'),
  feedback_token: Joi.string().trim().allow('').max(100).label('Token feedback'),
  rating: Joi.number().integer().min(1).max(5).required().label('Rating'),
  komentar: Joi.string().trim().allow('').max(500).label('Komentar'),
})), wrap(async (req, res) => {
  const out = await svc.submitFeedback(Number(req.params.id), req.body, null, req.user);
  res.status(201).json(out);
}));

router.post('/bookings', publicLimiter, optionalAuth, validate(bookingSchema), wrap(async (req, res) => {
  if (req.user && req.user.role === 'technician') throw E.forbidden('Teknisi tidak dapat membuat booking.');
  const actor = {
    label: req.user
      ? (req.user.role === 'admin' ? `admin:${req.user.nama}` : 'customer')
      : 'customer',
    role: req.user?.role || 'customer',
    userId: req.user?.id || null,
    customerId: req.user?.customer_id || req.user?.customerId || null,
  };
  const b = await svc.createBooking(req.body, actor);
  if (req.body.teknisi_id && req.user && req.user.role === 'admin') {
    try {
      await svc.assignTechnician(b.id, req.body.teknisi_id, actor);
    } catch (e) {
      console.warn('Auto assign technician failed:', e.message);
    }
  }
  res.status(201).json(b);
}));

router.get('/bookings', requireAuth(['admin', 'technician']), validate(listSchema, 'query'), wrap(async (req, res) => {
  res.json(await svc.listBookings(req.valid.query, req.user));
}));

router.get('/bookings/:id', requireAuth(['admin', 'technician']), validate(idParam, 'params'), wrap(async (req, res) => {
  res.json(await svc.getBookingDetail(Number(req.params.id), req.user));
}));

router.patch('/bookings/:id/schedule', requireAuth(['admin']), validate(idParam, 'params'),
  validate(Joi.object({ jadwal_mulai: Joi.string().trim().required().label('Jadwal') })), wrap(async (req, res) => {
    res.json(await svc.reschedule(Number(req.params.id), req.body.jadwal_mulai, { label: `admin:${req.user.nama}` }));
  }));

router.patch('/bookings/:id/assign', requireAuth(['admin']), validate(idParam, 'params'),
  validate(Joi.object({ teknisi_id: Joi.number().integer().positive().required().label('Teknisi') })), wrap(async (req, res) => {
    res.json(await svc.assignTechnician(Number(req.params.id), req.body.teknisi_id, { label: `admin:${req.user.nama}` }));
  }));

router.patch('/bookings/:id/status', requireAuth(['admin', 'technician']), validate(idParam, 'params'),
  validate(Joi.object({
    status: Joi.string().valid('scheduled', 'on process', 'done').required().label('Status'),
    catatan: Joi.string().trim().allow('').max(500).label('Catatan'),
  })), wrap(async (req, res) => {
    res.json(await svc.changeStatus(Number(req.params.id), req.body.status, req.body.catatan, req.user));
  }));

router.post('/bookings/:id/inventory-usage', requireAuth(['admin', 'technician']), validate(idParam, 'params'),
  validate(Joi.object({
    item_id: Joi.number().integer().positive().required().label('Item'),
    jumlah: Joi.number().positive().max(10000).required().label('Jumlah'),
    catatan: Joi.string().trim().allow('').max(300).label('Catatan'),
  })), wrap(async (req, res) => {
    res.status(201).json(await svc.addInventoryUsage(Number(req.params.id), req.body, req.user));
  }));

router.get('/feedback', requireAuth(['admin']), validate(Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(200),
  page: Joi.number().integer().min(1).default(1),
}), 'query'), wrap(async (req, res) => {
  const { limit, page } = req.valid.query;
  const offset = (page - 1) * limit;
  const rows = (await query(
    `SELECT f.id, f.rating, f.komentar, f.sentimen, f.waktu, b.id AS booking_id, b.kode_booking,
            c.nama AS customer, c.nama AS nama_pelanggan, c.nama AS customer_nama,
            s.nama_layanan,
            t.nama AS teknisi, t.nama AS nama_teknisi, t.nama AS teknisi_nama
     FROM feedback f
     JOIN bookings b ON b.id=f.booking_id
     JOIN customers c ON c.id=b.customer_id
     JOIN service_catalog s ON s.id=b.layanan_id
     LEFT JOIN technicians t ON t.id=b.teknisi_id
     ORDER BY f.waktu DESC LIMIT $1 OFFSET $2`, [limit, offset])).rows;
  const total = (await query('SELECT COUNT(*)::int FROM feedback')).rows[0].count;
  res.json({ data: rows, meta: { total: Number(total), page, limit } });
}));

router.patch('/bookings/:id/payment-status', requireAuth(['admin']), validate(idParam, 'params'),
  validate(Joi.object({
    status_pembayaran: Joi.string().valid('pending', 'paid').required().label('Status Pembayaran'),
  })), wrap(async (req, res) => {
    const bookingId = Number(req.params.id);
    const { status_pembayaran } = req.body;

    const existing = (await query('SELECT id, status_pembayaran FROM bookings WHERE id=$1', [bookingId])).rows[0];
    if (!existing) throw E.notFound('Booking tidak ditemukan.');

    await query(
      `UPDATE bookings
       SET status_pembayaran = $1,
           status_verifikasi_pembayaran = CASE WHEN $1 = 'paid' THEN 'diverifikasi' ELSE status_verifikasi_pembayaran END,
           verified_by = CASE WHEN $1 = 'paid' THEN $3 ELSE verified_by END,
           verified_at = CASE WHEN $1 = 'paid' THEN COALESCE(verified_at, NOW()) ELSE verified_at END,
           updated_at = NOW()
       WHERE id = $2`,
      [status_pembayaran, bookingId, req.user ? req.user.id : null]
    );

    res.json({
      id: bookingId,
      status_pembayaran,
      message: `Status pembayaran berhasil diperbarui menjadi ${status_pembayaran === 'paid' ? 'Lunas' : 'Pending'}.`
    });
  }));

router.post('/bookings/:id/service-fee-proposal', requireAuth(['admin', 'technician']), validate(idParam, 'params'),
  validate(Joi.object({
    biaya_tambahan_jasa: Joi.number().min(0).max(50000000).required().label('Biaya Tambahan Jasa'),
    catatan: Joi.string().trim().min(3).max(500).required().label('Alasan Perubahan Biaya Jasa'),
  })), wrap(async (req, res) => {
    const result = await svc.proposeServiceFeeChange(Number(req.params.id), req.body, req.user);
    res.json(result);
  }));

router.patch('/bookings/:id/service-fee-approval', optionalAuth, validate(idParam, 'params'),
  validate(Joi.object({
    disetujui: Joi.boolean().required().label('Status Persetujuan'),
    kontak: Joi.string().trim().optional().label('Kontak Verifikasi'),
    catatan: Joi.string().trim().max(300).allow('').optional(),
  })), wrap(async (req, res) => {
    const result = await svc.approveServiceFeeChange(Number(req.params.id), req.body, req.user);
    res.json(result);
  }));

module.exports = router;

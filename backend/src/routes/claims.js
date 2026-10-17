const express = require('express');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const { receiveOptionalPhoto } = require('../utils/upload');
const warrantyService = require('../services/warrantyService');

const idParam = Joi.object({ id: Joi.number().integer().positive().required().label('ID') });
const router = express.Router();

router.get('/warranty-info/:bookingId', optionalAuth, validate(Joi.object({
  bookingId: Joi.number().integer().positive().required(),
}), 'params'), wrap(async (req, res) => {
  const info = await warrantyService.getWarrantyInfo(Number(req.params.bookingId), {
    user: req.user,
    kontak: req.query?.kontak,
    kode_booking: req.query?.kode_booking,
  });
  res.json({ success: true, data: info });
}));

router.post(
  '/',
  optionalAuth,
  receiveOptionalPhoto(['foto', 'bukti_file', 'file']),
  validate(Joi.object({
    booking_id: Joi.number().integer().positive().required().label('ID Booking'),
    keluhan: Joi.string().trim().min(5).max(500).required().label('Keluhan'),
    rating: Joi.number().integer().min(1).max(5).optional().allow(null, '').label('Rating Review'),
    review_komentar: Joi.string().trim().min(3).max(500).optional().allow(null, '').label('Komentar Review'),
    kontak: Joi.string().trim().optional().allow(null, '').label('Nomor WhatsApp Pemesan'),
    foto_bukti_url: Joi.string().trim().optional().allow(null, '').label('URL Foto Bukti'),
  })),
  wrap(async (req, res) => {
    const result = await warrantyService.submitClaim({
      booking_id: Number(req.body.booking_id),
      keluhan: req.body.keluhan,
      rating: req.body.rating !== '' && req.body.rating !== null && req.body.rating !== undefined ? Number(req.body.rating) : undefined,
      review_komentar: req.body.review_komentar || undefined,
      user: req.user,
      kontak: req.body.kontak,
      file: req.uploadedFile || req.savedFile || null,
      foto_bukti_url: req.body.foto_bukti_url || null,
    });
    const claimData = result?.claim || result;
    const kodeKlaim = claimData?.kode_klaim || result?.kode_klaim || result?.kodeKlaim || '';
    res.status(201).json({
      success: true,
      message: `Klaim garansi ${kodeKlaim} berhasil diajukan dan sedang menunggu jadwal pemeriksaan dari admin.`,
      data: claimData,
    });
  })
);

router.get('/my-claims', requireAuth(['customer']), validate(Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  status: Joi.string().valid('diajukan', 'dijadwalkan', 'diperiksa', 'disetujui', 'ditolak', 'selesai').optional(),
}), 'query'), wrap(async (req, res) => {
  const result = await warrantyService.listClaims({
    customer_id: req.user.customer_id || req.user.customerId,
    status: req.valid.query.status,
    page: req.valid.query.page,
    limit: req.valid.query.limit,
  });
  res.json(result);
}));

router.get('/admin', requireAuth(['admin']), validate(Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('diajukan', 'dijadwalkan', 'diperiksa', 'disetujui', 'ditolak', 'selesai').optional(),
  customer_id: Joi.number().integer().positive().optional(),
}), 'query'), wrap(async (req, res) => {
  const result = await warrantyService.listClaims(req.valid.query);
  res.json(result);
}));

router.patch('/:id/schedule', requireAuth(['admin']), validate(idParam, 'params'), validate(Joi.object({
  jadwal_pemeriksaan: Joi.string().trim().required().label('Jadwal Pemeriksaan'),
  teknisi_pemeriksa_id: Joi.number().integer().positive().required().label('Teknisi Pemeriksa'),
})), wrap(async (req, res) => {
  const updated = await warrantyService.scheduleInspection(Number(req.params.id), req.body, req.user);
  res.json({
    success: true,
    message: 'Jadwal pemeriksaan klaim dan teknisi pemeriksa berhasil ditentukan.',
    data: updated,
  });
}));

router.post('/:id/inspect', requireAuth(['technician', 'admin']), validate(idParam, 'params'), validate(Joi.object({
  catatan_pemeriksaan: Joi.string().trim().min(5).max(1000).required().label('Catatan Hasil Pemeriksaan'),
})), wrap(async (req, res) => {
  const updated = await warrantyService.reportInspection(Number(req.params.id), req.body, req.user);
  res.json({
    success: true,
    message: 'Laporan pemeriksaan klaim berhasil disimpan.',
    data: updated,
  });
}));

router.patch('/:id/decide', requireAuth(['admin']), validate(idParam, 'params'), validate(Joi.object({
  keputusan: Joi.string().valid('disetujui', 'ditolak').required().label('Keputusan Klaim'),
  alasan_penolakan: Joi.string().trim().min(5).max(500).optional().allow('').label('Alasan Penolakan'),
  biaya_tambahan: Joi.number().min(0).default(0).label('Biaya Tambahan'),
})), wrap(async (req, res) => {
  const updated = await warrantyService.decideClaim(Number(req.params.id), req.body, req.user);
  res.json({
    success: true,
    message: `Klaim garansi berhasil ${updated.status}.`,
    data: updated,
  });
}));

router.post('/:id/convert-to-paid', requireAuth(['customer', 'admin']), validate(idParam, 'params'), validate(Joi.object({
  layanan_id: Joi.number().integer().positive().optional().label('ID Layanan'),
  jadwal_mulai: Joi.string().trim().optional().label('Jadwal Mulai'),
})), wrap(async (req, res) => {
  const result = await warrantyService.convertToPaidBooking(Number(req.params.id), req.body, req.user);
  res.status(201).json(result);
}));

module.exports = router;

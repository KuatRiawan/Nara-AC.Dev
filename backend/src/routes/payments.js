const express = require('express');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const { receiveOptionalPhoto } = require('../utils/upload');
const paymentService = require('../services/paymentService');

const idParam = Joi.object({ id: Joi.number().integer().positive().required().label('ID') });
const router = express.Router();

router.get('/settings', wrap(async (_req, res) => {
  const settings = await paymentService.getPaymentSettings();
  res.json({ success: true, data: settings });
}));

router.put('/settings', requireAuth(['admin']), validate(Joi.object({
  schemes: Joi.object().optional().label('Skema Pembayaran'),
  methods: Joi.object().optional().label('Metode Pembayaran'),
})), wrap(async (req, res) => {
  const updated = await paymentService.updatePaymentSettings(req.body);
  res.json({
    success: true,
    message: 'Pengaturan skema pembayaran berhasil diperbarui (BR-34).',
    data: updated,
  });
}));

router.post('/bookings/:id/scheme', optionalAuth, validate(idParam, 'params'), validate(Joi.object({
  skema_pembayaran: Joi.string().valid('full_upfront', 'dp_50', 'pay_after_service').required().label('Skema Pembayaran'),
  metode_pembayaran: Joi.string().valid('transfer', 'qris', 'cash').optional().label('Metode Pembayaran'),
  kontak: Joi.string().trim().optional().label('Nomor Kontak'),
})), wrap(async (req, res) => {
  const result = await paymentService.selectPaymentScheme(
    Number(req.params.id),
    req.body,
    req.user,
    req.body.kontak
  );
  res.json(result);
}));

router.post(
  '/bookings/:id/proof',
  optionalAuth,
  validate(idParam, 'params'),
  receiveOptionalPhoto(['foto', 'bukti_file', 'file']),
  validate(Joi.object({
    bukti_url: Joi.string().trim().allow('').optional().label('URL Bukti Pembayaran'),
    nominal: Joi.number().positive().required().label('Nominal Pembayaran'),
    catatan: Joi.string().trim().allow('').max(500).optional().label('Catatan'),
    kontak: Joi.string().trim().allow('').optional().label('Nomor Kontak'),
  })),
  wrap(async (req, res) => {
    const result = await paymentService.uploadTransferProof(
      Number(req.params.id),
      { ...req.body, file: req.uploadedFile || null },
      req.user,
      req.body.kontak
    );
    res.json(result);
  })
);

router.get('/bookings/:id/proof-file/:name', optionalAuth, validate(Joi.object({
  id: Joi.number().integer().positive().required(),
  name: Joi.string().trim().required(),
}), 'params'), wrap(async (req, res) => {
  const fileInfo = await paymentService.getPaymentProofFile(
    Number(req.params.id),
    req.params.name,
    req.user,
    req.query?.kontak
  );
  res.setHeader('Content-Type', fileInfo.mime);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.sendFile(fileInfo.fullPath);
}));

router.patch('/bookings/:id/verify', requireAuth(['admin']), validate(idParam, 'params'), validate(Joi.object({
  disetujui: Joi.boolean().required().label('Status Persetujuan'),
  nominal_disetujui: Joi.number().min(0).optional().label('Nominal yang Disetujui'),
  catatan: Joi.string().trim().max(500).optional().allow('').label('Catatan Verifikasi'),
})), wrap(async (req, res) => {
  const result = await paymentService.verifyPaymentProof(
    Number(req.params.id),
    req.body,
    req.user
  );
  res.json(result);
}));

router.post('/bookings/:id/refund', requireAuth(['admin']), validate(idParam, 'params'), validate(Joi.object({
  nominal_refund: Joi.number().positive().required().label('Nominal Refund'),
  catatan: Joi.string().trim().max(500).optional().allow('').label('Catatan Refund'),
})), wrap(async (req, res) => {
  const result = await paymentService.processRefund(
    Number(req.params.id),
    req.body,
    req.user
  );
  res.json(result);
}));

router.post('/bookings/:id/send-whatsapp', optionalAuth, validate(idParam, 'params'), validate(Joi.object({
  tipe_invoice: Joi.string().valid('initial', 'final', 'auto').default('auto').label('Tipe Invoice'),
  simulatedFailure: Joi.boolean().default(false).optional().label('Simulasi Gagal'),
  kontak: Joi.string().trim().optional().allow('').label('Nomor Kontak Verifikasi'),
  force: Joi.boolean().default(false).optional(),
})), wrap(async (req, res) => {
  const result = await paymentService.queueAndDispatchWhatsAppInvoice(
    Number(req.params.id),
    req.body,
    req.user
  );
  res.json(result);
}));

router.post('/retry-whatsapp', requireAuth(['admin']), validate(Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
})), wrap(async (req, res) => {
  const result = await paymentService.retryFailedWhatsAppInvoices(req.body.limit);
  res.json({
    success: true,
    message: `${result.total_retried} pengiriman WhatsApp berhasil diproses ulang (BR-43).`,
    data: result,
  });
}));

module.exports = router;

const express = require('express');
const rateLimit = require('express-rate-limit');
const { query } = require('../db/pool');
const config = require('../config');
const { Joi, validate } = require('../middleware/validate');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { wrap } = require('../middleware/errorHandler');
const reminders = require('../services/reminderService');
const chat = require('../services/chatService');
const analytics = require('../services/analyticsService');
const aiClient = require('../services/aiClient');
const { E } = require('../errors');

const router = express.Router();
const idParam = Joi.object({ id: Joi.number().integer().positive().required().label('ID') });

router.get('/reminders', requireAuth(['admin', 'technician']), validate(Joi.object({
  tanggal: Joi.alternatives().try(Joi.string().valid('H-1'), Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/)).label('Tanggal'),
  status: Joi.string().valid('pending', 'sent', 'failed'),
  target: Joi.string().valid('pelanggan', 'teknisi'),
  booking_id: Joi.number().integer().positive(),
  limit: Joi.number().integer().min(1).max(500),
}), 'query'), wrap(async (req, res) => {
  const data = await reminders.listReminders(req.valid.query, req.user);
  res.json({ data });
}));

router.post('/reminders/run', requireAuth(['admin']), validate(Joi.object({}), 'body'), wrap(async (_req, res) => {
  res.json(await reminders.runReminders({ force: true }));
}));

router.post('/reminders/:id/retry', requireAuth(['admin']), validate(idParam, 'params'), wrap(async (req, res) => {
  res.json(await reminders.retryReminder(Number(req.params.id)));
}));

router.get('/tickets', requireAuth(['admin']), wrap(async (_req, res) => {
  const rows = (await query(
    `SELECT k.id, k.pesan, k.status, k.sumber, k.created_at, k.closed_at, b.kode_booking
     FROM complaint_tickets k LEFT JOIN bookings b ON b.id=k.booking_id ORDER BY (k.status='open') DESC, k.created_at DESC LIMIT 100`)).rows;
  res.json({ data: rows });
}));
router.patch('/tickets/:id', requireAuth(['admin']), validate(idParam, 'params'),
  validate(Joi.object({ status: Joi.string().valid('open', 'closed').required().label('Status') })), wrap(async (req, res) => {
    const r = await query(
      `UPDATE complaint_tickets SET status=$2, closed_at = CASE WHEN $2='closed' THEN now() ELSE NULL END WHERE id=$1 RETURNING *`,
      [req.params.id, req.body.status]);
    if (!r.rows[0]) throw E.notFound('Tiket tidak ditemukan.');
    res.json(r.rows[0]);
  }));

const aiLimiter = rateLimit({
  windowMs: 60000, limit: Number(process.env.AI_RATE_LIMIT || 30), standardHeaders: true, legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test' && !process.env.TEST_RATE_LIMIT,
  handler: (_req, res) => res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Terlalu banyak pesan. Tunggu sebentar lalu coba lagi.' } }),
});
const msgSchema = Joi.object({
  text: Joi.string().trim().min(1).max(500).label('Pesan'),
  message: Joi.string().trim().min(1).max(500).label('Pesan'),
  conversationId: Joi.string().trim().max(100).optional().allow('', null),
}).or('text', 'message');

router.post('/ai/predict-intent', optionalAuth, aiLimiter, validate(msgSchema), wrap(async (req, res) => {
  const out = await chat.predictIntent(req.body.text || req.body.message);
  res.json({
    intent: out.intent,
    confidence: out.confidence,
    low_confidence: Boolean(out.low_confidence ?? out.fallback),
    fallback: Boolean(out.fallback),
    model_version: out.model_version,
  });
}));

router.post('/ai/answer', optionalAuth, aiLimiter, validate(msgSchema), wrap(async (req, res) => {
  const userId = req.user ? req.user.id : (req.body.conversationId || null);
  const userRole = req.user ? req.user.role : null;
  res.json(await chat.handleChat(req.body.text || req.body.message, userId, userRole));
}));

router.get('/ai/status', requireAuth(['admin']), validate(Joi.object({}), 'query'), wrap(async (_req, res) => {
  try {
    const h = await aiClient.health();
    res.json({ tersedia: true, ...h, ambang_confidence: config.aiConfidenceThreshold });
  } catch (e) {
    res.json({ tersedia: false, alasan: e.detail ? e.detail.reason : e.message, catatan: 'Alur booking/status tetap berjalan tanpa layanan AI.' });
  }
}));

router.get('/inference-logs', requireAuth(['admin']), validate(Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(100),
}), 'query'), wrap(async (req, res) => {
  const { limit } = req.valid.query;
  const rows = (await query(
    `SELECT id, intent, confidence::float, endpoint, rute, fallback, error, latency_ms, model_version, waktu, panjang_teks
     FROM inference_log ORDER BY id DESC LIMIT $1`, [limit])).rows;
  res.json({ data: rows });
}));

router.get('/analytics/summary', requireAuth(['admin']), validate(Joi.object({
  dari: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).label('Dari tanggal'),
  sampai: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).label('Sampai tanggal'),
}), 'query'), wrap(async (req, res) => {
  const out = await analytics.summary(req.valid.query);
  out.dasbor_ds_url = config.dataScienceDashboardUrl || null;
  res.json(out);
}));

router.get('/analytics/trends', requireAuth(['admin']), validate(Joi.object({
  period: Joi.string().valid('7d', '30d', '90d', '1y').default('7d'),
}), 'query'), wrap(async (req, res) => {
  const { period } = req.valid.query;
  const data = await analytics.trends(period);
  res.json({ period, data });
}));

router.get('/analytics/dashboard-views', requireAuth(['admin']), wrap(async (req, res) => {
  const period = req.query.period || '7d';
  const data = await analytics.dashboardAnalyticsCharts(period);
  res.json({ period, data });
}));

const handlePredictions = wrap(async (_req, res) => {
  const p = await analytics.latestPredictions();
  if (!p) {
    return res.json({
      target: 'jumlah_order_reguler_harian',
      model_version: 'nara-ds-v2.1-ridge-ts',
      keterangan: 'Prediksi Data Science sedang diproses atau belum tersedia.',
      is_synthetic: false,
      prediksi: []
    });
  }
  res.json(p);
});

router.get('/analytics/b2b-projects', requireAuth(['admin']), validate(Joi.object({
  limit: Joi.number().integer().min(1).max(200).default(100),
}), 'query'), wrap(async (req, res) => {
  const { limit } = req.valid.query;
  const rows = (await query(`
    SELECT id, kode_proyek, nama_proyek, kategori_proyek, periode_bulan, tanggal_proyek,
           nilai_proyek::float, biaya_proyek::float, fee_marketing::float, profit_bersih::float, margin_persen::float,
           no_po, keterangan
    FROM b2b_projects
    ORDER BY tanggal_proyek DESC
    LIMIT $1
  `, [limit])).rows;
  res.json({ data: rows });
}));

router.get('/predictions/latest', requireAuth(['admin']), validate(Joi.object({}), 'query'), handlePredictions);
router.get('/analytics/predictions', requireAuth(['admin']), validate(Joi.object({}), 'query'), handlePredictions);

// =========================================================================
// DATA SCIENCE INTEGRATION ENDPOINTS (API_CONTRACT_DS.md)
// =========================================================================

router.post('/predict-cost', optionalAuth, validate(Joi.object({
  tipe_customer: Joi.string().allow('', null).default('Rumah Tangga'),
  tipe_ac: Joi.string().allow('', null).default('Split Standard'),
  kapasitas_pk: Joi.number().min(0.5).max(10).default(1.0),
  usia_ac_tahun: Joi.number().integer().min(0).max(30).default(3),
  keluhan_utama: Joi.string().allow('', null).default('AC Kurang Dingin'),
})), wrap(async (req, res) => {
  try {
    const resp = await aiClient.predictCost(req.valid.body);
    return res.json(resp);
  } catch (_err) {
    // Fallback cerdas sesuai data science formula
    const pk = Number(req.valid.body.kapasitas_pk) || 1.0;
    const usia = Number(req.valid.body.usia_ac_tahun) || 3;
    let base = 150000;
    if (req.valid.body.tipe_ac === 'Cassette') base += 100000;
    if (req.valid.body.tipe_ac === 'Standing Floor') base += 80000;
    if (req.valid.body.tipe_customer === 'Bisnis/Kantor') base += 30000;
    base += Math.round(pk * 45000);
    base += Math.round(usia * 15000);
    if (req.valid.body.keluhan_utama?.includes('Freon') || req.valid.body.keluhan_utama?.includes('Dingin')) base += 50000;
    const est = Math.round(base / 1000) * 1000;
    return res.json({
      status: 'success',
      data: {
        estimated_cost: est,
        lower_bound: Math.max(75000, est - 36000),
        upper_bound: est + 36000,
        currency: 'IDR',
        disclaimer: 'Estimasi awal ini dihitung berdasarkan gejala keluhan dan kapasitas unit. Biaya final ditentukan setelah pengecekan fisik di lokasi.'
      }
    });
  }
}));

router.post('/predict-maintenance', optionalAuth, validate(Joi.object({
  tipe_customer: Joi.string().allow('', null).default('Rumah Tangga'),
  tipe_ac: Joi.string().allow('', null).default('Split Standard'),
  kapasitas_pk: Joi.number().min(0.5).max(10).default(1.0),
  usia_ac_tahun: Joi.number().integer().min(0).max(30).default(3),
  jenis_layanan: Joi.string().allow('', null).default('Cuci Standar'),
  freon_ditambahkan: Joi.number().valid(0, 1).default(0),
  penggantian_sparepart: Joi.number().valid(0, 1).default(0),
  service_completion_date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow(null, '')
})), wrap(async (req, res) => {
  try {
    const resp = await aiClient.predictMaintenance(req.valid.body);
    return res.json(resp);
  } catch (_err) {
    const days = req.valid.body.tipe_customer === 'Bisnis/Kantor' ? 45 : 90;
    const baseDate = req.valid.body.service_completion_date ? new Date(req.valid.body.service_completion_date) : new Date();
    const nextDate = new Date(baseDate.getTime() + days * 86400000);
    const nextDateStr = nextDate.toISOString().slice(0, 10);
    return res.json({
      status: 'success',
      data: {
        recommended_interval_days: days,
        next_maintenance_date: nextDateStr,
        urgency_level: days < 70 ? 'Tinggi (<70 hari)' : 'Standar (70-100 hari)',
        reminder_message_template: `Halo Pelanggan CV Nara Teknindotama, berdasarkan riwayat perawatan unit AC Anda, kami merekomendasikan jadwal perawatan berkala berikutnya sekitar ${days} hari lagi pada ${nextDateStr}.`
      }
    });
  }
}));

module.exports = router;

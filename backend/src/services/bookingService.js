const { withTx, query } = require('../db/pool');
const { E } = require('../errors');
const {
  generateBookingCode, normalizePhone, maskPhone, maskCustomerName, generateFeedbackToken,
} = require('../utils/ids');
const { audit, notify } = require('./common');
const {
  wibParts, fromWib, wibDateString, startOfWibDay, parseDateTimeInput, toMinutes, DAY_MS, formatWib,
} = require('../utils/time');

const DEFAULT_OPS = {
  open: '08:00',
  close: '19:00',
  days: [1, 2, 3, 4, 5, 6],
  slot_minutes: 60,
  min_lead_minutes: 60,
  max_advance_days: 60,
  reminder_hour: 8,
};
const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const EDITABLE = ['scheduled', 'rescheduled', 'delayed'];
const TRANSITIONS = {
  scheduled: ['on process', 'delayed'],
  rescheduled: ['on process', 'delayed'],
  delayed: ['on process'],
  'on process': ['done', 'delayed'],
  done: [],
  cancelled: [],
};

async function getOps(db = { query }) {
  const r = await db.query("SELECT value FROM settings WHERE key = 'operating_hours'");
  return { ...DEFAULT_OPS, ...(r.rows[0] ? r.rows[0].value : {}) };
}

const lockSlots = (client) => client.query("SELECT pg_advisory_xact_lock(hashtext('booking-slots'))");

function computeEnd(start, durasiMenit) {
  const minutes = Math.max(15, Number(durasiMenit) || 60);
  return new Date(start.getTime() + minutes * 60000);
}

function assertSlotAllowed(start, end, ops, now = new Date(), isAdmin = false) {
  const p = wibParts(start);
  const pe = wibParts(new Date(end.getTime() - 1));
  const durasiMenit = Math.round((end.getTime() - start.getTime()) / 60000);
  const errs = [];
  let reasonCode = null;

  if (start.getTime() < now.getTime() - (isAdmin ? 30 * 60000 : 0)) {
    errs.push('Tanggal/jam sudah lewat. Pilih jadwal yang akan datang.');
    reasonCode = 'PAST_TIME';
  } else if (!isAdmin && start.getTime() < now.getTime() + ops.min_lead_minutes * 60000) {
    errs.push(`Booking minimal ${ops.min_lead_minutes} menit sebelum jadwal.`);
    reasonCode = 'MIN_LEAD_TIME';
  } else if (start.getTime() > now.getTime() + ops.max_advance_days * DAY_MS) {
    errs.push(`Booking maksimal ${ops.max_advance_days} hari ke depan.`);
    reasonCode = 'MAX_ADVANCE_DAYS';
  }

  if (!ops.days.includes(p.dow)) {
    const open = ops.days.map((d) => DAY_NAMES[d]).join(', ');
    errs.push(`Hari ${DAY_NAMES[p.dow]} tidak melayani servis. Hari operasional: ${open}.`);
    reasonCode = reasonCode || 'CLOSED_DAY';
  } else {
    const startMin = p.h * 60 + p.min;
    const endMin = pe.h * 60 + pe.min + 1;
    const openMin = toMinutes(ops.open);
    const closeMin = toMinutes(ops.close);
    const sameDay = pe.d === p.d && pe.m === p.m && pe.y === p.y;

    if (startMin < openMin || startMin >= closeMin) {
      errs.push(`Jam mulai di luar jam operasional (${ops.open}–${ops.close} WIB).`);
      reasonCode = reasonCode || 'OUTSIDE_OPERATING_HOURS';
    } else if (!sameDay || endMin > closeMin) {
      errs.push(`Durasi pengerjaan (${durasiMenit} menit) melampaui batas jam tutup operasional (${ops.close} WIB).`);
      reasonCode = reasonCode || 'DURATION_EXCEEDS_CLOSING';
    } else if ((startMin - openMin) % ops.slot_minutes !== 0) {
      errs.push(`Jam mulai harus mengikuti slot ${ops.slot_minutes} menit sejak ${ops.open}.`);
      reasonCode = reasonCode || 'INVALID_SLOT_ALIGNMENT';
    }
  }

  if (errs.length) {
    throw E.validation('Jadwal yang dipilih tidak valid.', {
      jadwal_mulai: errs[0],
      kode_alasan: reasonCode || 'INVALID_SCHEDULE',
    });
  }
}

async function countOverlap(db, start, end, excludeId) {
  const r = await db.query(
    `SELECT COUNT(*)::int AS n FROM bookings
     WHERE status <> 'cancelled' AND jadwal_mulai < $2 AND jadwal_selesai > $1 AND ($3::int IS NULL OR id <> $3)`,
    [start, end, excludeId || null],
  );
  return r.rows[0].n;
}

async function activeTechnicianCount(db, dateStr = null) {
  const r = await db.query('SELECT COUNT(*)::int AS n FROM technicians WHERE aktif');
  const totalActive = Number(r.rows[0]?.n || 0);
  if (!dateStr || totalActive === 0) return totalActive;
  try {
    const unavailRes = await db.query(
      `SELECT COUNT(*)::int AS n FROM technician_availability WHERE tanggal = $1 AND status IN ('off','busy')`,
      [dateStr]
    );
    const unavailableCount = Number(unavailRes.rows[0]?.n || 0);
    return Math.max(0, totalActive - unavailableCount);
  } catch {
    return totalActive;
  }
}

async function assertCapacity(db, start, end, excludeId) {
  const dateStr = wibDateString(start);
  const cap = await activeTechnicianCount(db, dateStr);
  if (cap === 0) throw E.conflict('Belum ada teknisi aktif yang tersedia pada tanggal tersebut. Hubungi admin.');
  const used = await countOverlap(db, start, end, excludeId);
  if (used >= cap) {
    throw E.conflict('Slot waktu tersebut sudah penuh (bentrok dengan booking lain). Pilih jam lain.', {
      jadwal_mulai: 'Slot sudah terisi penuh.',
    });
  }
}

async function assertTechnicianFree(db, teknisiId, start, end, excludeId) {
  const r = await db.query(
    `SELECT kode_booking FROM bookings
     WHERE teknisi_id = $1 AND status NOT IN ('cancelled','done') AND jadwal_mulai < $3 AND jadwal_selesai > $2 AND ($4::int IS NULL OR id <> $4) LIMIT 1`,
    [teknisiId, start, end, excludeId || null],
  );
  if (r.rows.length) {
    throw E.conflict(`Teknisi sudah memiliki pekerjaan pada jam tersebut (booking ${r.rows[0].kode_booking}).`, {
      teknisi_id: 'Teknisi bentrok jadwal.',
    });
  }
}

const BOOKING_SELECT = `
  SELECT b.id, b.kode_booking, b.status, b.status_pembayaran, b.jadwal_mulai, b.jadwal_selesai, b.alamat, b.keluhan, b.kontak,
         b.created_at, b.updated_at, b.created_by, b.is_synthetic, b.ac_unit_id, b.alasan_batal, b.alasan_tunda,
         b.mulai_aktual, b.selesai_aktual, b.jumlah_unit, b.idempotency_key,
         b.skema_pembayaran, b.metode_pembayaran, b.bukti_pembayaran_url, b.status_verifikasi_pembayaran,
         b.catatan_verifikasi, b.verified_by, b.verified_at, b.total_dibayar, b.refund_nominal, b.refund_status, b.refund_catatan,
         b.konfirmasi_pelanggan, b.waktu_konfirmasi_pelanggan,
         b.biaya_tambahan_jasa, b.catatan_biaya_tambahan_jasa, b.persetujuan_biaya_pelanggan, b.persetujuan_biaya_admin, b.status_persetujuan_biaya,
         b.customer_id, c.nama AS customer_nama,
         b.layanan_id, s.nama_layanan, s.harga, s.kategori, s.durasi_menit, COALESCE(s.garansi_hari, 14) AS garansi_hari,
         b.teknisi_id, t.nama AS teknisi_nama,
         f.rating, f.komentar, (f.id IS NOT NULL) AS sudah_feedback
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  JOIN service_catalog s ON s.id = b.layanan_id
  LEFT JOIN technicians t ON t.id = b.teknisi_id
  LEFT JOIN feedback f ON f.booking_id = b.id`;

function mapBooking(r) {
  return {
    id: r.id,
    kode_booking: r.kode_booking,
    status: r.status,
    jadwal_mulai: r.jadwal_mulai,
    jadwal_selesai: r.jadwal_selesai,
    layanan: {
      id: r.layanan_id,
      nama: r.nama_layanan,
      kategori: r.kategori,
      harga: r.harga,
      durasi_menit: r.durasi_menit || 60,
      garansi_hari: r.garansi_hari || 14,
    },
    customer: { id: r.customer_id, nama: r.customer_nama, kontak: r.kontak },
    alamat: r.alamat,
    keluhan: r.keluhan,
    teknisi_id: r.teknisi_id ? Number(r.teknisi_id) : null,
    teknisi: r.teknisi_id ? { id: Number(r.teknisi_id), nama: r.teknisi_nama } : null,
    feedback: r.sudah_feedback ? { rating: r.rating, komentar: r.komentar } : null,
    ac_unit_id: r.ac_unit_id,
    jumlah_unit: r.jumlah_unit,
    alasan_batal: r.alasan_batal,
    alasan_tunda: r.alasan_tunda,
    mulai_aktual: r.mulai_aktual,
    selesai_aktual: r.selesai_aktual,
    dibuat_oleh: r.created_by,
    is_synthetic: r.is_synthetic,
    status_pembayaran: r.status_pembayaran || 'pending',
    skema_pembayaran: r.skema_pembayaran || 'pay_after_service',
    metode_pembayaran: r.metode_pembayaran || 'transfer',
    bukti_pembayaran_url: r.bukti_pembayaran_url || null,
    status_verifikasi_pembayaran: r.status_verifikasi_pembayaran || 'belum_ada_bukti',
    catatan_verifikasi: r.catatan_verifikasi || null,
    verified_by: r.verified_by || null,
    verified_at: r.verified_at || null,
    total_dibayar: Number(r.total_dibayar || 0),
    refund_nominal: Number(r.refund_nominal || 0),
    refund_status: r.refund_status || 'none',
    refund_catatan: r.refund_catatan || null,
    konfirmasi_pelanggan: Boolean(r.konfirmasi_pelanggan || r.sudah_feedback),
    waktu_konfirmasi_pelanggan: r.waktu_konfirmasi_pelanggan || null,
    biaya_tambahan_jasa: Number(r.biaya_tambahan_jasa || 0),
    catatan_biaya_tambahan_jasa: r.catatan_biaya_tambahan_jasa || null,
    persetujuan_biaya_pelanggan: Boolean(r.persetujuan_biaya_pelanggan),
    persetujuan_biaya_admin: Boolean(r.persetujuan_biaya_admin),
    status_persetujuan_biaya: r.status_persetujuan_biaya || 'none',
    created_at: r.created_at,
    updated_at: r.updated_at,
    idempotency_key: r.idempotency_key,
  };
}

async function createBooking(input, actor = { label: 'customer' }, now = new Date()) {
  const kontak = normalizePhone(input.kontak);
  if (!kontak) throw E.validation('Kontak tidak valid.', { kontak: 'Gunakan nomor HP Indonesia, contoh 081234567890.' });
  const start = parseDateTimeInput(input.jadwal_mulai);
  if (!start) throw E.validation('Jadwal tidak valid.', { jadwal_mulai: 'Format jadwal tidak valid.' });

  return await withTx(async (client) => {
    await lockSlots(client);

    let rawItems = [];
    if (Array.isArray(input.items) && input.items.length > 0) {
      rawItems = input.items;
    } else if (input.layanan_id) {
      rawItems = [{
        layanan_id: input.layanan_id,
        jumlah_unit: input.jumlah_unit || 1,
        catatan: input.keluhan || '',
      }];
    } else {
      throw E.validation('Layanan tidak valid.', { layanan_id: 'Pilih minimal satu layanan.' });
    }

    const svcIds = [...new Set(rawItems.map((it) => Number(it.layanan_id)))];
    const svcsResult = await client.query('SELECT * FROM service_catalog WHERE id = ANY($1::int[]) AND aktif', [svcIds]);
    const svcMap = new Map(svcsResult.rows.map((s) => [Number(s.id), s]));

    let totalDurationMinutes = 0;
    let totalUnits = 0;
    const resolvedItems = [];

    for (const it of rawItems) {
      const svcRecord = svcMap.get(Number(it.layanan_id));
      if (!svcRecord) {
        throw E.validation('Layanan tidak valid.', { layanan_id: `Layanan ID ${it.layanan_id} tidak ditemukan atau tidak aktif.` });
      }
      const units = Math.max(1, Number(it.jumlah_unit) || 1);
      const itemDuration = (Number(svcRecord.durasi_menit) || 60) * units;
      totalDurationMinutes += itemDuration;
      totalUnits += units;
      const subtotal = Number(svcRecord.harga) * units;
      resolvedItems.push({
        layanan_id: svcRecord.id,
        nama_layanan: svcRecord.nama_layanan,
        kategori: svcRecord.kategori,
        harga_satuan: Number(svcRecord.harga),
        jumlah_unit: units,
        subtotal,
        catatan: it.catatan || '',
        durasi_menit: Number(svcRecord.durasi_menit) || 60,
      });
    }

    const primarySvc = svcMap.get(Number(resolvedItems[0].layanan_id));

    if (input.idempotency_key) {
      const existing = (await client.query(
        'SELECT id, kode_booking, status FROM bookings WHERE idempotency_key = $1', [input.idempotency_key]
      )).rows[0];
      if (existing) {
        if (existing.status !== 'cancelled') {
          const row = (await client.query(`${BOOKING_SELECT} WHERE b.id = $1`, [existing.id])).rows[0];
          const bMapped = mapBooking(row);
          bMapped.items = (await client.query(
            `SELECT bi.id, bi.layanan_id, s.nama_layanan, s.kategori, bi.jumlah_unit, bi.harga_satuan, bi.subtotal, bi.catatan
             FROM booking_items bi
             JOIN service_catalog s ON s.id = bi.layanan_id
             WHERE bi.booking_id = $1 ORDER BY bi.id`, [existing.id],
          )).rows;
          return bMapped;
        }
        await client.query('DELETE FROM bookings WHERE idempotency_key = $1', [input.idempotency_key]);
      }
    }

    const ops = await getOps(client);
    const end = computeEnd(start, totalDurationMinutes, ops.slot_minutes);
    const isAdmin = typeof actor?.label === 'string' && (actor.label.startsWith('admin') || actor.label === 'admin');
    assertSlotAllowed(start, end, ops, now, isAdmin);
    await assertCapacity(client, start, end, null);

    let cust = null;
    if (actor?.customerId) {
      cust = (await client.query('SELECT * FROM customers WHERE id = $1', [actor.customerId])).rows[0];
    }
    if (!cust) {
      cust = (await client.query('SELECT * FROM customers WHERE kontak = $1', [kontak])).rows[0];
    }
    if (!cust) {
      cust = (await client.query(
        'INSERT INTO customers (nama, kontak, alamat) VALUES ($1,$2,$3) RETURNING *',
        [input.nama, kontak, input.alamat],
      )).rows[0];
    }
    if (actor?.userId) {
      await client.query(
        'UPDATE users SET customer_id = $1 WHERE id = $2 AND (customer_id IS NULL OR customer_id != $1)',
        [cust.id, actor.userId]
      );
    }

    const recentDuplicate = (await client.query(
      `SELECT id, kode_booking, status FROM bookings 
       WHERE customer_id = $1 AND jadwal_mulai = $2 AND layanan_id = $3 
         AND status != 'cancelled' 
         AND created_at >= NOW() - INTERVAL '30 seconds'
       ORDER BY id DESC LIMIT 1`,
      [cust.id, start, primarySvc.id]
    )).rows[0];
    if (recentDuplicate) {
      const row = (await client.query(`${BOOKING_SELECT} WHERE b.id = $1`, [recentDuplicate.id])).rows[0];
      const bMapped = mapBooking(row);
      bMapped.items = (await client.query(
        `SELECT bi.id, bi.layanan_id, s.nama_layanan, s.kategori, bi.jumlah_unit, bi.harga_satuan, bi.subtotal, bi.catatan
         FROM booking_items bi
         JOIN service_catalog s ON s.id = bi.layanan_id
         WHERE bi.booking_id = $1 ORDER BY bi.id`, [recentDuplicate.id],
      )).rows;
      return bMapped;
    }

    let booking;
    for (let i = 0; i < 8 && !booking; i += 1) {
      const code = generateBookingCode(undefined, i);
      const feedbackToken = generateFeedbackToken();
      const ins = await client.query(
        `INSERT INTO bookings (kode_booking, customer_id, layanan_id, jadwal_mulai, jadwal_selesai, alamat, keluhan, kontak, created_by, jumlah_unit, idempotency_key, feedback_token, skema_pembayaran, metode_pembayaran)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (kode_booking) DO NOTHING RETURNING id`,
        [code, cust.id, primarySvc.id, start, end, input.alamat, input.keluhan || '', kontak, actor.label, totalUnits, input.idempotency_key || null, feedbackToken, input.skema_pembayaran || 'pay_after_service', input.metode_pembayaran || 'transfer'],
      );
      if (ins.rows.length) {
        booking = ins.rows[0];
        for (const item of resolvedItems) {
          await client.query(
            `INSERT INTO booking_items (booking_id, layanan_id, jumlah_unit, harga_satuan, subtotal, catatan)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [booking.id, item.layanan_id, item.jumlah_unit, item.harga_satuan, item.subtotal, item.catatan || null]
          );
        }
      }
    }
    if (!booking) throw E.conflict('Gagal membuat kode booking unik. Coba lagi.');
    await client.query(
      'INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan) VALUES ($1,NULL,$2,$3,$4)',
      [booking.id, 'scheduled', actor.label, 'Booking dibuat'],
    );
    if (input.ac_unit_id) {
      const unit = (await client.query('SELECT id FROM ac_units WHERE id=$1 AND customer_id=$2', [input.ac_unit_id, cust.id])).rows[0];
      if (!unit) throw E.validation('Unit AC tidak valid.', { ac_unit_id: 'Unit AC bukan milik Anda.' });
      await client.query('UPDATE bookings SET ac_unit_id=$2 WHERE id=$1', [booking.id, unit.id]);
    }
    const kodeBooking = (await client.query('SELECT kode_booking FROM bookings WHERE id=$1', [booking.id])).rows[0].kode_booking;
    const layananDeskripsi = resolvedItems.length > 1
      ? resolvedItems.map((r) => `${r.nama_layanan} (${r.jumlah_unit} unit)`).join(', ')
      : primarySvc.nama_layanan;
    await notify(client, { role: 'admin', title: 'Booking baru', message: `${kodeBooking} — ${cust.nama} (${layananDeskripsi}), ${formatWib(start)}. Belum ditugaskan.`, type: 'booking', bookingId: booking.id, tautan: `/admin/bookings?bookingId=${booking.id}` });
    await notify(client, { role: 'customer', id: cust.id, title: 'Booking diterima', message: `Booking ${kodeBooking} untuk ${layananDeskripsi} pada ${formatWib(start)} berhasil dibuat.`, type: 'booking', bookingId: booking.id, tautan: `/status/${kodeBooking}` });
    await audit(client, { nama: actor.label, role: actor.role || 'customer' }, 'booking_created', 'booking', booking.id, { metadata: { kode: kodeBooking } });
    const row = (await client.query(`${BOOKING_SELECT} WHERE b.id = $1`, [booking.id])).rows[0];
    const bMapped = mapBooking(row);
    bMapped.items = (await client.query(
      `SELECT bi.id, bi.layanan_id, s.nama_layanan, s.kategori, bi.jumlah_unit, bi.harga_satuan, bi.subtotal, bi.catatan
       FROM booking_items bi
       JOIN service_catalog s ON s.id = bi.layanan_id
       WHERE bi.booking_id = $1 ORDER BY bi.id`, [booking.id],
    )).rows;
    return bMapped;
  });
}

async function listBookings(filters, user) {
  const where = [];
  const params = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
  if (user.role === 'technician') add('b.teknisi_id = ?', user.technicianId);
  if (filters.status) add('b.status = ?', filters.status);
  if (filters.teknisi_id) add('b.teknisi_id = ?', filters.teknisi_id);
  if (filters.belum_ditugaskan) where.push('b.teknisi_id IS NULL');
  if (filters.dari) add('b.jadwal_mulai >= ?', startOfWibDay(filters.dari));
  if (filters.sampai) add('b.jadwal_mulai < ?', new Date(startOfWibDay(filters.sampai).getTime() + DAY_MS));
  if (filters.q) {
    params.push(`%${filters.q}%`);
    const i = params.length;
    where.push(`(b.kode_booking ILIKE $${i} OR c.nama ILIKE $${i} OR b.kontak ILIKE $${i} OR b.alamat ILIKE $${i})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = filters.urut === 'terdekat' ? 'b.jadwal_mulai ASC' : 'b.created_at DESC, b.id DESC';
  const total = (await query(
    `SELECT COUNT(*)::int AS n FROM bookings b JOIN customers c ON c.id = b.customer_id ${whereSql}`, params,
  )).rows[0].n;
  const { sanitizeLimitOffset } = require('../db/pool');
  const { limit: safeLimit, offset: safeOffset } = sanitizeLimitOffset(filters.limit || 20, ((filters.page || 1) - 1) * (filters.limit || 20));
  const rows = (await query(
    `${BOOKING_SELECT} ${whereSql} ORDER BY ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, safeLimit, safeOffset],
  )).rows;
  return { data: rows.map(mapBooking), meta: { total, page: filters.page || 1, limit: safeLimit } };
}

async function getBookingDetail(id, user) {
  const row = (await query(`${BOOKING_SELECT} WHERE b.id = $1`, [id])).rows[0];
  if (!row) throw E.notFound('Booking tidak ditemukan.');
  if (user.role === 'technician' && row.teknisi_id !== user.technicianId) {
    throw E.forbidden('Pekerjaan ini bukan penugasan Anda.');
  }
  const b = mapBooking(row);
  b.items = (await query(
    `SELECT bi.id, bi.layanan_id, s.nama_layanan, s.kategori, bi.jumlah_unit, bi.harga_satuan, bi.subtotal, bi.catatan
     FROM booking_items bi
     JOIN service_catalog s ON s.id = bi.layanan_id
     WHERE bi.booking_id = $1 ORDER BY bi.id`, [id],
  )).rows;
  if (!b.items.length) {
    b.items = [{
      id: null,
      layanan_id: row.layanan_id,
      nama_layanan: row.nama_layanan,
      kategori: row.kategori,
      jumlah_unit: row.jumlah_unit || 1,
      harga_satuan: row.harga,
      subtotal: (row.harga || 0) * (row.jumlah_unit || 1),
      catatan: row.keluhan,
    }];
  }
  b.riwayat_status = (await query(
    'SELECT status_lama, status_baru, diubah_oleh, catatan, waktu FROM status_log WHERE booking_id = $1 ORDER BY waktu, id', [id],
  )).rows;
  b.pemakaian_inventory = (await query(
    `SELECT u.id, i.nama, i.satuan, u.jumlah, u.catatan, u.waktu FROM inventory_usage u
     JOIN inventory i ON i.id = u.item_id WHERE u.booking_id = $1 ORDER BY u.waktu`, [id],
  )).rows;
  if (user.role === 'admin') {
    b.audit = (await query('SELECT aksi, detail, oleh, waktu FROM booking_audit WHERE booking_id = $1 ORDER BY waktu, id', [id])).rows;
  }
  return b;
}

async function lockBooking(client, id) {
  const r = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
  if (!r.rows[0]) throw E.notFound('Booking tidak ditemukan.');
  return r.rows[0];
}

async function reschedule(id, jadwalInput, actor, now = new Date()) {
  const start = parseDateTimeInput(jadwalInput);
  if (!start) throw E.validation('Jadwal tidak valid.', { jadwal_mulai: 'Format jadwal tidak valid.' });
  return await withTx(async (client) => {
    await lockSlots(client);
    const b = await lockBooking(client, id);
    if (!EDITABLE.includes(b.status)) {
      throw E.business(`Jadwal tidak dapat diubah pada status "${b.status}".`);
    }
    const items = (await client.query(
      `SELECT bi.*, s.durasi_menit FROM booking_items bi
       JOIN service_catalog s ON s.id = bi.layanan_id
       WHERE bi.booking_id = $1`, [id]
    )).rows;
    let totalDurasi = 0;
    if (items.length > 0) {
      totalDurasi = items.reduce((acc, it) => acc + (Number(it.durasi_menit) || 60) * it.jumlah_unit, 0);
    } else {
      const svc = (await client.query('SELECT * FROM service_catalog WHERE id = $1', [b.layanan_id])).rows[0];
      totalDurasi = (Number(svc?.durasi_menit) || 60) * (b.jumlah_unit || 1);
    }
    const ops = await getOps(client);
    const end = computeEnd(start, totalDurasi, ops.slot_minutes);
    const isAdmin = typeof actor?.label === 'string' && actor.label.startsWith('admin');
    assertSlotAllowed(start, end, ops, now, isAdmin);
    await assertCapacity(client, start, end, id);
    if (b.teknisi_id) await assertTechnicianFree(client, b.teknisi_id, start, end, id);
    await client.query("UPDATE bookings SET jadwal_mulai=$2, jadwal_selesai=$3, status='rescheduled', updated_at=now() WHERE id=$1", [id, start, end]);
    await client.query(
      'INSERT INTO booking_audit (booking_id, aksi, detail, oleh) VALUES ($1,$2,$3,$4)',
      [id, 'reschedule', JSON.stringify({ dari: b.jadwal_mulai, ke: start }), actor.label],
    );
    await client.query(
      'INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan) VALUES ($1,$2,$3,$4,$5)',
      [id, b.status, 'rescheduled', actor.label, 'Dijadwalkan ulang oleh pelanggan'],
    );
    await client.query(
      `INSERT INTO schedule_history (booking_id, jadwal_lama, jadwal_baru, teknisi_lama_id, teknisi_baru_id, alasan, diubah_oleh)
       VALUES ($1,$2,$3,$4,$4,$5,$6)`,
      [id, b.jadwal_mulai, start, b.teknisi_id, 'Permintaan pelanggan', actor.label],
    );
    await notify(client, { role: 'admin', title: 'Jadwal diubah pelanggan', message: `${b.kode_booking} dijadwalkan ulang ke ${formatWib(start)}.`, type: 'booking', bookingId: id, tautan: `/admin/bookings?bookingId=${id}` });
    if (b.teknisi_id) await notify(client, { role: 'technician', id: b.teknisi_id, title: 'Jadwal berubah', message: `${b.kode_booking} dipindahkan ke ${formatWib(start)}.`, type: 'booking', bookingId: id, tautan: `/technician/jobs/${id}` });
    await client.query("DELETE FROM reminder_log WHERE booking_id=$1 AND status IN ('pending','failed')", [id]);
    return (await client.query(`${BOOKING_SELECT} WHERE b.id = $1`, [id])).rows.map(mapBooking)[0];
  });
}

async function cancelBooking(id, actor, alasan = 'Dibatalkan oleh pelanggan') {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    if (!EDITABLE.includes(b.status)) {
      throw E.business(`Booking dengan status "${b.status}" tidak dapat dibatalkan.`);
    }

    const isCustomer = !actor?.role || actor.role === 'customer' || actor.label === 'customer';
    if (isCustomer && b.jadwal_mulai) {
      const now = Date.now();
      const jadwalTime = new Date(b.jadwal_mulai).getTime();
      const hoursUntilSchedule = (jadwalTime - now) / (1000 * 60 * 60);

      if (hoursUntilSchedule < 24) {
        throw E.business(
          'Pembatalan mandiri wajib dilakukan minimal 24 jam sebelum jadwal pengerjaan. Silakan hubungi admin kami melalui WhatsApp jika ada kendala mendesak.',
          { jadwal_mulai: b.jadwal_mulai, hours_remaining: Math.max(0, Math.round(hoursUntilSchedule)) }
        );
      }
    }

    await client.query('UPDATE bookings SET status=$2, alasan_batal=$3, updated_at=now() WHERE id=$1', [id, 'cancelled', alasan]);
    await client.query(
      'INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan) VALUES ($1,$2,$3,$4,$5)',
      [id, b.status, 'cancelled', actor.label, alasan],
    );
    await client.query(
      'INSERT INTO booking_audit (booking_id, aksi, detail, oleh) VALUES ($1,$2,$3,$4)',
      [id, 'cancel', JSON.stringify({ reason: alasan }), actor.label],
    );
    await audit(client, { nama: actor.label, role: actor.role || 'customer' }, 'booking_cancelled', 'booking', id, { before: { status: b.status }, after: { status: 'cancelled' }, metadata: { alasan } });
    await client.query("DELETE FROM reminder_log WHERE booking_id=$1 AND status IN ('pending','failed')", [id]);
    await notify(client, { role: 'admin', title: 'Booking dibatalkan', message: `${b.kode_booking} dibatalkan: ${alasan}`, type: 'booking', bookingId: id, tautan: `/admin/bookings?bookingId=${id}` });
    if (b.teknisi_id) await notify(client, { role: 'technician', id: b.teknisi_id, title: 'Booking dibatalkan', message: `${b.kode_booking} dibatalkan.`, type: 'booking', bookingId: id });
    await notify(client, { role: 'customer', id: b.customer_id, title: 'Booking dibatalkan', message: `Booking ${b.kode_booking} dibatalkan. Alasan: ${alasan}`, type: 'booking', bookingId: id, tautan: `/status/${b.kode_booking}` });
    return (await client.query(`${BOOKING_SELECT} WHERE b.id = $1`, [id])).rows.map(mapBooking)[0];
  });
}

async function assignTechnician(id, teknisiId, actor) {
  return await withTx(async (client) => {
    await lockSlots(client);
    const b = await lockBooking(client, id);
    if (!EDITABLE.includes(b.status)) {
      throw E.business(`Teknisi tidak dapat ditetapkan/diganti pada status "${b.status}".`);
    }
    const t = (await client.query('SELECT * FROM technicians WHERE id = $1', [teknisiId])).rows[0];
    if (!t) throw E.validation('Teknisi tidak valid.', { teknisi_id: 'Teknisi tidak ditemukan.' });
    if (!t.aktif) throw E.business('Teknisi tidak aktif dan tidak dapat ditugaskan.');
    const dateStr = wibDateString(new Date(b.jadwal_mulai));
    let av = null;
    try {
      av = (await client.query(
        "SELECT status, catatan FROM technician_availability WHERE teknisi_id=$1 AND tanggal=$2 AND status IN ('off','busy')",
        [teknisiId, dateStr]
      )).rows[0];
    } catch {
      av = (await client.query(
        "SELECT status, catatan FROM technician_availability WHERE technician_id=$1 AND tanggal=$2 AND status IN ('off','busy')",
        [teknisiId, dateStr]
      )).rows[0];
    }
    if (av) {
      throw E.conflict(`Teknisi ${t.nama} sedang tidak tersedia (${av.status}) pada ${dateStr}${av.catatan ? `: ${av.catatan}` : ''}.`);
    }
    await assertTechnicianFree(client, teknisiId, b.jadwal_mulai, b.jadwal_selesai, id);
    await client.query('UPDATE bookings SET teknisi_id=$2, updated_at=now() WHERE id=$1', [id, teknisiId]);
    await client.query(
      'INSERT INTO booking_audit (booking_id, aksi, detail, oleh) VALUES ($1,$2,$3,$4)',
      [id, 'assign_technician', JSON.stringify({ dari: b.teknisi_id, ke: teknisiId, nama: t.nama }), actor.label],
    );
    return (await client.query(`${BOOKING_SELECT} WHERE b.id = $1`, [id])).rows.map(mapBooking)[0];
  });
}

async function changeStatus(id, newStatus, catatan, user) {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    if (user.role === 'technician' && b.teknisi_id !== user.technicianId) {
      throw E.forbidden('Pekerjaan ini bukan penugasan Anda.');
    }
    if (b.status === newStatus) throw E.business(`Booking sudah berstatus "${newStatus}".`);
    if (!(TRANSITIONS[b.status] || []).includes(newStatus)) {
      throw E.business(
        `Status tidak boleh berubah dari "${b.status}" ke "${newStatus}". Urutan yang sah: scheduled → on process → done.`,
        { dari: b.status, ke: newStatus, diizinkan: TRANSITIONS[b.status] },
      );
    }
    if (newStatus === 'on process' && !b.teknisi_id) {
      throw E.business('Pekerjaan belum memiliki teknisi. Tetapkan teknisi sebelum memulai.');
    }
    if (newStatus === 'done' || newStatus === 'delayed') {
      throw E.business('Gunakan endpoint teknisi (selesaikan / laporkan tunda) agar checklist, laporan servis, dan alasan tercatat.');
    }
    await client.query('UPDATE bookings SET status=$2, mulai_aktual=COALESCE(mulai_aktual, now()), updated_at=now() WHERE id=$1', [id, newStatus]);
    await client.query(
      'INSERT INTO status_log (booking_id, status_lama, status_baru, diubah_oleh, catatan) VALUES ($1,$2,$3,$4,$5)',
      [id, b.status, newStatus, user.nama || user.role, catatan || 'Pekerjaan dimulai'],
    );
    const logs = (await client.query(
      'SELECT status_lama, status_baru, diubah_oleh, catatan, waktu FROM status_log WHERE booking_id=$1 ORDER BY waktu, id', [id],
    )).rows;
    return { id, kode_booking: b.kode_booking, status: newStatus, status_log: logs };
  });
}

async function addInventoryUsage(id, { item_id: itemId, jumlah, catatan }, user) {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    if (user.role === 'technician' && b.teknisi_id !== user.technicianId) {
      throw E.forbidden('Pekerjaan ini bukan penugasan Anda.');
    }
    if (b.status !== 'on process') {
      throw E.business('Pemakaian bahan hanya dapat dicatat saat pekerjaan berjalan (status "on process").');
    }
    const item = (await client.query('SELECT * FROM inventory WHERE id=$1 FOR UPDATE', [itemId])).rows[0];
    if (!item || !item.aktif) throw E.validation('Item tidak valid.', { item_id: 'Item inventory tidak ditemukan atau nonaktif.' });
    if (Number(item.stok) < jumlah) {
      throw E.business(`Stok ${item.nama} tidak cukup (tersisa ${Number(item.stok)} ${item.satuan}).`, { stok: Number(item.stok) });
    }
    await client.query('UPDATE inventory SET stok = stok - $2, updated_at=now() WHERE id=$1', [itemId, jumlah]);
    const ins = (await client.query(
      'INSERT INTO inventory_usage (booking_id,item_id,jumlah,teknisi_id,catatan) VALUES ($1,$2,$3,$4,$5) RETURNING id, waktu',
      [id, itemId, jumlah, user.technicianId || b.teknisi_id, catatan || null],
    )).rows[0];
    const sisa = Number(item.stok) - jumlah;
    await client.query(
      `INSERT INTO inventory_adjustments (item_id, jenis, jumlah, catatan, oleh, booking_id, stok_sebelum, stok_sesudah)
       VALUES ($1,'usage',$2,$3,$4,$5,$6,$7)`,
      [itemId, jumlah, catatan || `Dipakai pada ${b.kode_booking}`, user.nama || user.role, id, item.stok, sisa],
    );
    await audit(client, user, 'material_used', 'inventory', itemId, { before: { stok: Number(item.stok) }, after: { stok: sisa }, metadata: { booking: b.kode_booking, jumlah } });
    if (sisa <= Number(item.min_stok)) {
      await notify(client, { role: 'admin', title: 'Stok menipis', message: `${item.nama} tersisa ${sisa} ${item.satuan} (minimum ${Number(item.min_stok)}).`, type: 'inventory', tautan: '/admin/inventory', dedup: `lowstock:${itemId}:${sisa}` });
    }
    return {
      id: ins.id, booking_id: id, item: item.nama, jumlah, satuan: item.satuan,
      sisa_stok: Number(item.stok) - jumlah, waktu: ins.waktu,
    };
  });
}

async function publicStatusByCode(codeRaw) {
  const code = String(codeRaw || '').trim().toUpperCase();
  const row = (await query(`${BOOKING_SELECT} WHERE b.kode_booking = $1`, [code])).rows[0];
  if (!row) throw E.notFound('Kode booking tidak ditemukan. Periksa kembali kode Anda.');

  const riwayat = (await query(
    'SELECT status_lama, status_baru AS status, status_baru, diubah_oleh, catatan, waktu FROM status_log WHERE booking_id=$1 ORDER BY waktu ASC, id ASC', [row.id],
  )).rows;
  const reminders = (await query(
    `SELECT kanal, status, untuk_tanggal, waktu_kirim FROM reminder_log
     WHERE booking_id=$1 AND target='pelanggan' ORDER BY id DESC LIMIT 3`, [row.id],
  )).rows;

  const items = (await query(
    `SELECT bi.id, bi.layanan_id, s.nama_layanan, s.kategori, bi.jumlah_unit, bi.harga_satuan, bi.subtotal, bi.catatan
     FROM booking_items bi
     JOIN service_catalog s ON s.id = bi.layanan_id
     WHERE bi.booking_id = $1 ORDER BY bi.id`, [row.id],
  )).rows;

  const resolvedItems = items.length > 0 ? items : [{
    id: null,
    layanan_id: row.layanan_id,
    nama_layanan: row.nama_layanan,
    kategori: row.kategori,
    jumlah_unit: row.jumlah_unit || 1,
    harga_satuan: row.harga,
    subtotal: (row.harga || 0) * (row.jumlah_unit || 1),
    catatan: row.keluhan,
  }];

  const totalUnits = resolvedItems.reduce((acc, it) => acc + (it.jumlah_unit || 1), 0);
  const namaLayananTeks = resolvedItems.length > 1
    ? resolvedItems.map((i) => `${i.nama_layanan} (${i.jumlah_unit} unit)`).join(', ')
    : row.nama_layanan;

  const inventoryUsage = (await query(
    `SELECT u.id, i.nama, i.satuan, u.jumlah, u.catatan, u.waktu
     FROM inventory_usage u
     JOIN inventory i ON i.id = u.item_id WHERE u.booking_id = $1 ORDER BY u.waktu`, [row.id],
  )).rows;

  const customerUser = (await query("SELECT id FROM users WHERE customer_id = $1 AND role = 'customer' LIMIT 1", [row.customer_id])).rows[0];
  const isMember = Boolean(customerUser);

  let progresTeknisi = null;
  let whatsappInvoiceDelivery = null;
  try {
    const [clRes, phRes, woRes, waRes] = await Promise.all([
      query('SELECT id, task, status, wajib FROM work_order_checklists WHERE booking_id = $1 ORDER BY id', [row.id]),
      query('SELECT tipe, COUNT(*)::int AS total FROM work_order_photos WHERE booking_id = $1 GROUP BY tipe', [row.id]),
      query('SELECT diagnosis, rekomendasi, catatan, updated_at FROM work_orders WHERE booking_id = $1 LIMIT 1', [row.id]),
      query('SELECT id, tipe_invoice, status, percobaan, waktu_kirim, error_terakhir, updated_at FROM whatsapp_invoice_logs WHERE booking_id = $1 ORDER BY id DESC LIMIT 1', [row.id]),
    ]);
    const checklists = clRes.rows || [];
    const completedChecklists = checklists.filter((c) => c.status === 'completed').length;
    const beforePhotos = (phRes.rows || []).find((p) => p.tipe === 'before')?.total || 0;
    const afterPhotos = (phRes.rows || []).find((p) => p.tipe === 'after')?.total || 0;
    const wo = (woRes.rows || [])[0] || null;
    progresTeknisi = {
      checklist_total: checklists.length,
      checklist_selesai: completedChecklists,
      foto_sebelum: beforePhotos,
      foto_sesudah: afterPhotos,
      diagnosis: wo?.diagnosis || null,
      rekomendasi: wo?.rekomendasi || null,
      catatan_teknisi: wo?.catatan || null,
      updated_at: wo?.updated_at || row.updated_at || null,
    };
    whatsappInvoiceDelivery = (waRes.rows || [])[0] || null;
  } catch {
    progresTeknisi = null;
    whatsappInvoiceDelivery = null;
  }

  return {
    id: row.id,
    customer_id: row.customer_id,
    ac_unit_id: row.ac_unit_id || null,
    is_member: isMember,
    kode_booking: row.kode_booking,
    status: row.status,
    layanan: namaLayananTeks,
    layanan_id: row.layanan_id,
    garansi_hari: Number(row.garansi_hari || 14),
    harga: row.harga,
    jumlah_unit: totalUnits,
    items: resolvedItems,
    pemakaian_inventory: inventoryUsage,
    keluhan: row.keluhan,
    jadwal_mulai: row.jadwal_mulai,
    jadwal_selesai: row.jadwal_selesai,
    mulai_aktual: row.mulai_aktual || null,
    selesai_aktual: row.selesai_aktual || null,
    alasan_tunda: row.alasan_tunda || null,
    alasan_batal: row.alasan_batal || null,
    teknisi_id: row.teknisi_id ? Number(row.teknisi_id) : null,
    teknisi: row.teknisi_nama ? row.teknisi_nama.split(' ')[0] : null,
    teknisi_lengkap: row.teknisi_nama || null,
    progres_teknisi: progresTeknisi,
    whatsapp_invoice_delivery: whatsappInvoiceDelivery,
    riwayat_status: riwayat,
    pengingat: reminders,
    konfirmasi_pelanggan: Boolean(row.konfirmasi_pelanggan || row.sudah_feedback || (row.status === 'done' && row.selesai_aktual && (Date.now() - new Date(row.selesai_aktual).getTime() >= 48 * 3600000))),
    waktu_konfirmasi_pelanggan: row.waktu_konfirmasi_pelanggan || null,
    biaya_tambahan_jasa: Number(row.biaya_tambahan_jasa || 0),
    catatan_biaya_tambahan_jasa: row.catatan_biaya_tambahan_jasa || null,
    persetujuan_biaya_pelanggan: Boolean(row.persetujuan_biaya_pelanggan),
    persetujuan_biaya_admin: Boolean(row.persetujuan_biaya_admin),
    status_persetujuan_biaya: row.status_persetujuan_biaya || 'none',
    bisa_feedback: row.status === 'done' && !row.sudah_feedback,
    sudah_feedback: !!row.sudah_feedback,
    feedback: row.sudah_feedback ? { rating: row.rating, komentar: row.komentar } : null,
    status_pembayaran: row.status_pembayaran || 'pending',
    skema_pembayaran: row.skema_pembayaran || 'pay_after_service',
    metode_pembayaran: row.metode_pembayaran || 'transfer',
    bukti_pembayaran_url: row.bukti_pembayaran_url || null,
    status_verifikasi_pembayaran: row.status_verifikasi_pembayaran || 'belum_ada_bukti',
    catatan_verifikasi: row.catatan_verifikasi || null,
    total_dibayar: Number(row.total_dibayar || 0),
    refund_nominal: Number(row.refund_nominal || 0),
    refund_status: row.refund_status || null,
    refund_catatan: row.refund_catatan || null,
    jadwal_teks: formatWib(new Date(row.jadwal_mulai)),
    created_at: row.created_at,
    updated_at: row.updated_at,
    customer_nama: maskCustomerName(row.customer_nama),
    kontak: maskPhone(row.kontak),
    kontak_masked: maskPhone(row.kontak),
    alamat: '[Alamat Disamarkan]',
    alamat_masked: '[Alamat Disamarkan]',
  };
}

async function submitFeedback(id, { kode_booking: kode, kontak, feedback_token, rating, komentar }, sentimen = null, user = null) {
  return await withTx(async (client) => {
    const b = (await client.query('SELECT * FROM bookings WHERE id=$1 FOR UPDATE', [id])).rows[0];
    if (!b) throw E.notFound('Booking tidak ditemukan.');
    if (String(kode || '').trim().toUpperCase() !== b.kode_booking) {
      throw E.notFound('Kode booking tidak sesuai.');
    }

    let verified = false;
    if (feedback_token && b.feedback_token && feedback_token === b.feedback_token) {
      verified = true;
    } else if (user && user.role === 'customer' && (user.customerId === b.customer_id || user.customer_id === b.customer_id)) {
      verified = true;
    } else if (user && (user.role === 'admin' || user.role === 'technician')) {
      verified = true;
    } else if (kontak && !String(kontak).includes('*') && !String(kontak).includes('•')) {
      const cleanInput = String(kontak).replace(/\D/g, '');
      const cleanBooking = String(b.kontak || '').replace(/\D/g, '');
      if (
        cleanInput.length >= 4 && cleanBooking.length >= 4 &&
        (cleanBooking.endsWith(cleanInput) || cleanInput.endsWith(cleanBooking) || cleanBooking.slice(-4) === cleanInput.slice(-4))
      ) {
        verified = true;
      }
    }

    if (!verified) {
      throw E.forbidden('Verifikasi feedback gagal. Gunakan tautan resmi dari notifikasi atau masukkan nomor kontak yang sesuai saat booking.');
    }

    if (b.status !== 'done') throw E.business('Feedback hanya dapat diberikan setelah pekerjaan berstatus "done".');
    const ex = await client.query('SELECT 1 FROM feedback WHERE booking_id=$1', [id]);
    if (ex.rows.length) throw E.conflict('Feedback untuk booking ini sudah pernah dikirim. Terima kasih!');
    await client.query(
      'INSERT INTO feedback (booking_id, rating, komentar, sentimen) VALUES ($1,$2,$3,$4)',
      [id, rating, komentar || null, sentimen || (Number(rating) <= 2 ? 'negative' : 'positive')],
    );
    await client.query(
      `UPDATE bookings
       SET feedback_token = NULL,
           konfirmasi_pelanggan = TRUE,
           waktu_konfirmasi_pelanggan = COALESCE(waktu_konfirmasi_pelanggan, NOW()),
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
    const isLowRating = Number(rating) <= 2;
    await notify(client, {
      role: 'admin',
      title: isLowRating ? 'TINDAK LANJUT WAJIB: Ulasan Bintang Rendah' : 'Feedback baru',
      message: isLowRating
        ? `[PERHATIAN ATURAN BR-24] ${b.kode_booking} diberi rating rendah (${rating}/5). Hubungi customer segera untuk klarifikasi & garansi: "${String(komentar || 'Tidak ada komentar').slice(0, 100)}"`
        : `${b.kode_booking} diberi rating ${rating}/5${komentar ? `: "${String(komentar).slice(0, 80)}"` : ''}`,
      type: 'feedback',
      bookingId: id,
      tautan: `/admin/feedback`,
      priority: isLowRating ? 'high' : 'normal',
    });
    return { rating, komentar: komentar || '', terima_kasih: true };
  });
}

async function getAvailability(dateStr, layananId, jumlahUnitOrNow = 1, maybeNow = new Date(), customDurationMinutes = null) {
  let jumlahUnit = 1;
  let now = maybeNow;
  if (jumlahUnitOrNow instanceof Date) {
    now = jumlahUnitOrNow;
    jumlahUnit = 1;
  } else if (typeof jumlahUnitOrNow === 'number') {
    jumlahUnit = Math.max(1, jumlahUnitOrNow);
  }
  const svc = (await query('SELECT * FROM service_catalog WHERE id=$1 AND aktif', [layananId])).rows[0];
  if (!svc) throw E.validation('Layanan tidak valid.', { layanan_id: 'Layanan tidak ditemukan atau tidak aktif.' });
  const ops = await getOps();
  const dayStart = startOfWibDay(dateStr);
  const dow = wibParts(new Date(dayStart.getTime() + 3600000)).dow;
  if (!ops.days.includes(dow)) {
    return { tanggal: dateStr, buka: false, alasan: `Hari ${DAY_NAMES[dow]} tidak melayani servis.`, slot: [] };
  }
  const cap = await activeTechnicianCount({ query }, dateStr);
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  const booked = (await query(
    "SELECT jadwal_mulai, jadwal_selesai FROM bookings WHERE status <> 'cancelled' AND jadwal_mulai < $2 AND jadwal_selesai > $1", [dayStart, dayEnd],
  )).rows.map((r) => [new Date(r.jadwal_mulai), new Date(r.jadwal_selesai)]);
  const [y, m, d] = dateStr.split('-').map(Number);
  const slots = [];
  const openMin = toMinutes(ops.open);
  const closeMin = toMinutes(ops.close);
  const totalDuration = customDurationMinutes && Number(customDurationMinutes) > 0
    ? Number(customDurationMinutes)
    : (Number(svc.durasi_menit) || 60) * jumlahUnit;

  for (let t = openMin; t < closeMin; t += ops.slot_minutes) {
    const start = fromWib(y, m, d, Math.floor(t / 60), t % 60);
    const end = computeEnd(start, totalDuration, ops.slot_minutes);
    let tersedia = true;
    let alasan = null;
    let kodeAlasan = 'AVAILABLE';
    try {
      assertSlotAllowed(start, end, ops, now);
    } catch (e) {
      tersedia = false;
      alasan = e.detail ? e.detail.jadwal_mulai : e.message;
      kodeAlasan = (e.detail && e.detail.kode_alasan) || 'INVALID_SCHEDULE';
    }
    if (tersedia) {
      const used = booked.filter(([s, e2]) => s < end && e2 > start).length;
      if (cap === 0 || used >= cap) {
        tersedia = false;
        alasan = cap === 0 ? 'Tidak ada teknisi tersedia pada tanggal ini.' : 'Slot penuh.';
        kodeAlasan = 'SLOT_FULL';
      }
    }
    const endParts = wibParts(end);
    slots.push({
      mulai: start.toISOString(),
      selesai: end.toISOString(),
      jam: `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`,
      jam_selesai: `${String(endParts.h).padStart(2, '0')}:${String(endParts.min).padStart(2, '0')}`,
      durasi_menit: totalDuration,
      tersedia,
      alasan,
      kode_alasan: kodeAlasan,
    });
  }
  return {
    tanggal: dateStr,
    buka: true,
    jam_operasional: `${ops.open}–${ops.close}`,
    durasi_menit: totalDuration,
    kapasitas_teknisi: cap,
    slot: slots,
  };
}

async function verifyPublicBookingOwnership(kode, kontak, { allowCancelled = true, minDigits = 6 } = {}) {
  const code = String(kode || '').trim().toUpperCase();
  const b = (await query(
    `SELECT b.*, c.nama AS customer_nama FROM bookings b JOIN customers c ON c.id = b.customer_id WHERE b.kode_booking = $1`,
    [code]
  )).rows[0];
  if (!b) throw E.notFound('Kode booking tidak ditemukan. Periksa kembali kode Anda.');

  const rawKontak = String(kontak || '').trim();
  if (!rawKontak || rawKontak.includes('*') || rawKontak.includes('•')) {
    throw E.forbidden('Masukkan nomor WhatsApp lengkap (minimal 8 digit, bukan nomor yang disamarkan).');
  }

  const inputDigits = rawKontak.replace(/\D/g, '');
  const bookingDigits = String(b.kontak || '').replace(/\D/g, '');

  if (bookingDigits.length < minDigits || inputDigits.length < minDigits) {
    throw E.forbidden(`Data verifikasi tidak valid. Nomor kontak wajib minimal ${minDigits} digit.`);
  }

  const compareLen = Math.min(8, minDigits, bookingDigits.length, inputDigits.length);
  if (bookingDigits.slice(-compareLen) !== inputDigits.slice(-compareLen)) {
    throw E.forbidden('Nomor WhatsApp tidak cocok dengan data pemesan pada tiket ini.');
  }

  if (!allowCancelled && b.status === 'cancelled') {
    throw E.business('Booking ini sudah dibatalkan dan tidak dapat diubah.');
  }
  return b;
}

async function verifyPublicBooking(kode, kontak) {
  return verifyPublicBookingOwnership(kode, kontak, { allowCancelled: false, minDigits: 6 });
}

function calculateInvoice(booking) {
  if (!booking) return null;

  let serviceItems = [];
  let sparepartItems = [];
  let subtotalJasa = 0;
  let subtotalSparepart = 0;
  let totalUnits = 0;

  if (Array.isArray(booking.items) && booking.items.length > 0) {
    serviceItems = booking.items.map((it) => {
      const itemSubtotal = (it.subtotal !== null && it.subtotal !== undefined)
        ? Number(it.subtotal)
        : (Number(it.harga_satuan || it.harga || 0) * Number(it.jumlah_unit || 1));
      subtotalJasa += itemSubtotal;
      totalUnits += Number(it.jumlah_unit || 1);
      return {
        id: it.id,
        layanan_id: it.layanan_id,
        nama_layanan: it.nama_layanan || it.nama || booking.layanan || 'Servis AC',
        harga_satuan: Number(it.harga_satuan || it.harga || 0),
        jumlah_unit: Number(it.jumlah_unit || 1),
        subtotal: itemSubtotal,
        catatan: it.catatan || '',
        jenis: 'jasa',
      };
    });
  } else {
    const basePrice = Number(booking.harga) || 0;
    totalUnits = Number(booking.jumlah_unit) || 1;
    subtotalJasa = basePrice * totalUnits;
    serviceItems = [{
      layanan_id: booking.layanan?.id || booking.layanan_id,
      nama_layanan: booking.layanan?.nama || booking.layanan || 'Servis AC',
      harga_satuan: basePrice,
      jumlah_unit: totalUnits,
      subtotal: subtotalJasa,
      catatan: booking.keluhan || '',
      jenis: 'jasa',
    }];
  }

  if (Array.isArray(booking.pemakaian_inventory) && booking.pemakaian_inventory.length > 0) {
    sparepartItems = booking.pemakaian_inventory.map((m) => {
      const hargaSatuan = Number(m.harga || m.harga_satuan || 0);
      const jml = Number(m.jumlah || 1);
      const itemSubtotal = hargaSatuan * jml;
      subtotalSparepart += itemSubtotal;
      return {
        id: m.id,
        item_id: m.item_id,
        nama_layanan: `Spare Part: ${m.nama || m.item || 'Suku Cadang'}`,
        harga_satuan: hargaSatuan,
        jumlah_unit: jml,
        satuan: m.satuan || 'pcs',
        subtotal: itemSubtotal,
        catatan: m.catatan || '',
        jenis: 'sparepart',
      };
    });
  }

  const biayaTambahanJasa = (booking.status_persetujuan_biaya === 'approved' && Number(booking.biaya_tambahan_jasa) > 0)
    ? Number(booking.biaya_tambahan_jasa)
    : 0;
  if (biayaTambahanJasa > 0) {
    subtotalJasa += biayaTambahanJasa;
    serviceItems.push({
      id: 'fee-adjustment',
      layanan_id: null,
      nama_layanan: 'Penyesuaian Biaya Jasa (Disetujui Pelanggan & Admin)',
      harga_satuan: biayaTambahanJasa,
      jumlah_unit: 1,
      subtotal: biayaTambahanJasa,
      catatan: booking.catatan_biaya_tambahan_jasa || '',
      jenis: 'jasa',
    });
  }

  const subtotal = subtotalJasa + subtotalSparepart;

  const isMember = Boolean(booking.is_member || booking.customer_is_member || booking.has_account);
  let discountJasa = 0;
  let discountReason = '';

  if (isMember) {
    discountJasa = Math.round(subtotalJasa * 0.10);
    discountReason = 'Diskon Membership 10% (Khusus Biaya Jasa)';
  }

  const discount = discountJasa;
  const total = subtotal - discount;

  const totalDibayar = Number(booking.total_dibayar || booking.nominal_bayar || 0);
  const selisih = total - totalDibayar;
  const balanceDue = selisih > 0 ? selisih : 0;
  const refundAmount = selisih < 0 ? Math.abs(selisih) : 0;

  const isFinal = booking.status === 'done' || Boolean(booking.selesai_aktual) || sparepartItems.length > 0;
  const invoiceType = isFinal ? 'final' : 'initial';
  const invoiceTypeLabel = isFinal ? 'Invoice Final (Pekerjaan Selesai)' : 'Invoice Awal (Estimasi Booking)';

  let warrantyText = '14 Hari Kalender';
  const configuredGaransi = Number(booking.garansi_hari || booking.layanan?.garansi_hari || 0);
  const allNames = serviceItems.map((i) => (i.nama_layanan || '').toLowerCase()).join(' ');
  if (configuredGaransi === 45 || (allNames.includes('freon') && allNames.includes('core'))) {
    warrantyText = '45 Hari Penuh Garansi Dingin';
  } else if (configuredGaransi === 30 || allNames.includes('core') || allNames.includes('bongkar') || allNames.includes('freon')) {
    warrantyText = '30 Hari Penuh Garansi Pengerjaan';
  }

  const primaryBasePrice = serviceItems.length > 0 ? (serviceItems[0].harga_satuan || 0) : 0;

  return {
    invoice_type: invoiceType,
    invoice_type_label: invoiceTypeLabel,
    is_member: isMember,
    basePrice: primaryBasePrice,
    units: totalUnits,
    items: [...serviceItems, ...sparepartItems],
    service_items: serviceItems,
    sparepart_items: sparepartItems,
    subtotal_jasa: subtotalJasa,
    subtotal_sparepart: subtotalSparepart,
    subtotal,
    discount,
    discount_reason: discountReason,
    total,
    total_dibayar: totalDibayar,
    balance_due: balanceDue,
    refund_amount: refundAmount,
    status_pembayaran: booking.status_pembayaran || 'pending',
    warrantyText,
  };
}

async function proposeServiceFeeChange(id, { biaya_tambahan_jasa, catatan }, user) {
  const nominal = Number(biaya_tambahan_jasa);
  if (Number.isNaN(nominal) || nominal < 0) {
    throw E.validation('Nominal biaya tambahan jasa tidak valid.');
  }
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    if (user.role === 'technician' && b.teknisi_id !== user.technicianId) {
      throw E.forbidden('Pekerjaan ini bukan penugasan Anda.');
    }
    const isAdminProposer = user.role === 'admin';
    const updated = (await client.query(
      `UPDATE bookings
       SET biaya_tambahan_jasa = $2,
           catatan_biaya_tambahan_jasa = $3,
           persetujuan_biaya_admin = $4,
           persetujuan_biaya_pelanggan = FALSE,
           status_persetujuan_biaya = CASE WHEN $2 = 0 THEN 'none' ELSE 'pending_approval' END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, nominal, catatan, isAdminProposer]
    )).rows[0];
    await notify(client, {
      role: 'customer',
      id: b.customer_id,
      title: 'Pengajuan Perubahan Biaya Jasa',
      message: `Terdapat pengajuan penyesuaian biaya jasa sebesar Rp ${nominal.toLocaleString('id-ID')} pada booking ${b.kode_booking}: "${catatan}". Mohon konfirmasi persetujuan Anda.`,
      type: 'booking',
      bookingId: id,
      tautan: `/status/${b.kode_booking}`,
    });
    if (!isAdminProposer) {
      await notify(client, {
        role: 'admin',
        title: 'Pengajuan Perubahan Biaya Jasa oleh Teknisi',
        message: `Teknisi mengajukan perubahan biaya jasa Rp ${nominal.toLocaleString('id-ID')} pada ${b.kode_booking}: "${catatan}".`,
        type: 'booking',
        bookingId: id,
        tautan: '/admin/bookings',
      });
    }
    return {
      success: true,
      message: 'Pengajuan perubahan biaya jasa berhasil dicatat dan menunggu persetujuan bersama pelanggan serta admin.',
      booking: updated,
    };
  });
}

async function approveServiceFeeChange(id, { disetujui, kontak, catatan }, user) {
  return await withTx(async (client) => {
    const b = await lockBooking(client, id);
    let actorType = null;
    if (user && user.role === 'admin') {
      actorType = 'admin';
    } else if (user && user.role === 'customer') {
      const custId = user.customer_id || user.customerId;
      if (Number(custId) !== Number(b.customer_id)) {
        throw E.forbidden('Anda tidak berhak menyetujui perubahan biaya untuk booking ini.');
      }
      actorType = 'customer';
    } else if (kontak) {
      await verifyPublicBookingOwnership(b.kode_booking, kontak, { allowCancelled: false, minDigits: 8 });
      actorType = 'customer';
    } else {
      throw E.unauthorized('Silakan login atau sertakan nomor kontak pemesan untuk menyetujui perubahan biaya.');
    }

    const custApproved = actorType === 'customer' ? Boolean(disetujui) : Boolean(b.persetujuan_biaya_pelanggan);
    const adminApproved = actorType === 'admin' ? Boolean(disetujui) : Boolean(b.persetujuan_biaya_admin);
    const newStatus = !disetujui
      ? 'rejected'
      : (custApproved && adminApproved ? 'approved' : 'pending_approval');

    const updated = (await client.query(
      `UPDATE bookings
       SET persetujuan_biaya_pelanggan = $2,
           persetujuan_biaya_admin = $3,
           status_persetujuan_biaya = $4,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, custApproved, adminApproved, newStatus]
    )).rows[0];

    return {
      success: true,
      status_persetujuan_biaya: newStatus,
      persetujuan_biaya_pelanggan: custApproved,
      persetujuan_biaya_admin: adminApproved,
      message: newStatus === 'approved'
        ? 'Perubahan biaya jasa telah disetujui oleh pelanggan dan admin.'
        : newStatus === 'rejected'
          ? 'Perubahan biaya jasa ditolak.'
          : 'Persetujuan Anda telah dicatat. Menunggu persetujuan pihak lainnya.',
      booking: updated,
    };
  });
}

module.exports = {
  getOps, createBooking, listBookings, getBookingDetail, reschedule, cancelBooking, assignTechnician, changeStatus,
  addInventoryUsage, publicStatusByCode, submitFeedback, getAvailability, TRANSITIONS, EDITABLE, computeEnd,
  assertSlotAllowed, wibDateString, mapBooking, BOOKING_SELECT, lockBooking, verifyPublicBooking,
  verifyPublicBookingOwnership, calculateInvoice, proposeServiceFeeChange, approveServiceFeeChange,
};

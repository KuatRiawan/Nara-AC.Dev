const { query, withTransaction } = require('../db/pool');
const { E } = require('../errors');
const { notify } = require('./common');

const VALID_NOTIFICATION_TYPES = new Set(['booking', 'inventory', 'system', 'feedback', 'reminder']);

async function createNotification({ target_role, target_id, judul, pesan, tipe, booking_id, tautan, dedup_key }, dbOrClient = null) {
  try {
    const safeType = VALID_NOTIFICATION_TYPES.has(tipe) ? tipe : 'booking';
    const db = dbOrClient && typeof dbOrClient.query === 'function' ? dbOrClient : { query };
    await notify(db, {
      role: target_role,
      id: target_id,
      title: judul,
      message: pesan,
      type: safeType,
      bookingId: booking_id,
      tautan,
      dedup: dedup_key,
    });
  } catch (_) {}
}

function getWarrantyDurationDays(serviceName = '', catalogGaransiHari = null) {
  const configured = Number(catalogGaransiHari);
  if ([14, 30, 45].includes(configured)) {
    return configured;
  }
  const name = (serviceName || '').toLowerCase();
  if (name.includes('freon') && name.includes('core')) {
    return 45;
  }
  if (name.includes('core') || name.includes('bongkar') || name.includes('perbaikan') || name.includes('pasang') || name.includes('freon')) {
    return 30;
  }
  return 14;
}

function normalizeClaimRow(row) {
  if (!row) return row;
  return {
    ...row,
    booking_kode: row.kode_booking || row.booking_kode || null,
    kontak: row.kontak_customer || row.kontak || null,
    teknisi_nama: row.nama_teknisi_pemeriksa || row.teknisi_nama || null,
  };
}

async function getWarrantyInfo(bookingId, { user = null, kontak = null, kode_booking = null } = {}) {
  const bRes = await query(`
    SELECT b.*, s.nama_layanan, s.harga AS harga_layanan, s.garansi_hari AS catalog_garansi_hari,
           c.nama AS nama_customer, c.kontak AS kontak_customer
    FROM bookings b
    JOIN service_catalog s ON s.id = b.layanan_id
    JOIN customers c ON c.id = b.customer_id
    WHERE b.id = $1
  `, [bookingId]);

  const booking = bRes.rows[0];
  if (!booking) throw E.notFound('Booking tidak ditemukan.');

  if (user && user.role === 'customer') {
    const userCustomerId = user.customer_id || user.customerId;
    if (userCustomerId && Number(userCustomerId) !== Number(booking.customer_id)) {
      throw E.forbidden('Anda tidak berhak melihat informasi garansi milik pelanggan lain.');
    }
  }
  if (kode_booking && String(kode_booking).trim().toUpperCase() !== String(booking.kode_booking).toUpperCase()) {
    throw E.forbidden('Kode booking tidak cocok.');
  }

  const durasiHari = getWarrantyDurationDays(booking.nama_layanan, booking.catalog_garansi_hari);
  const tanggalSelesai = booking.selesai_aktual || (booking.status === 'done' ? booking.updated_at : null);

  let garansiMulai = null;
  let garansiSelesai = null;
  let isGaransiAktif = false;
  let sisaHari = 0;

  if (tanggalSelesai && booking.status === 'done') {
    garansiMulai = new Date(tanggalSelesai);
    garansiSelesai = new Date(garansiMulai.getTime() + durasiHari * 86400000);
    const now = new Date();
    isGaransiAktif = now <= garansiSelesai;
    sisaHari = isGaransiAktif ? Math.ceil((garansiSelesai.getTime() - now.getTime()) / 86400000) : 0;
  }

  const fbRes = await query('SELECT * FROM feedback WHERE booking_id = $1', [bookingId]);
  const feedback = fbRes.rows[0] || null;
  const hasQualifyingReview = Boolean(
    feedback &&
    Number(feedback.booking_id) === Number(bookingId) &&
    Number(feedback.rating) >= 1 &&
    Number(feedback.rating) <= 5
  );

  const claimsRes = await query(`
    SELECT c.*, t.nama AS nama_teknisi_pemeriksa
    FROM warranty_claims c
    LEFT JOIN technicians t ON t.id = c.teknisi_pemeriksa_id
    WHERE c.booking_id = $1
    ORDER BY c.created_at DESC
  `, [bookingId]);

  const allClaims = claimsRes.rows.map(normalizeClaimRow);
  const activeClaim = allClaims.find((c) => ['diajukan', 'dijadwalkan', 'diperiksa'].includes(c.status)) || null;

  return {
    booking_id: booking.id,
    ac_unit_id: booking.ac_unit_id || null,
    kode_booking: booking.kode_booking,
    nama_layanan: booking.nama_layanan,
    status_booking: booking.status,
    durasi_garansi_hari: durasiHari,
    garansi_mulai: garansiMulai,
    garansi_selesai: garansiSelesai,
    is_garansi_aktif: isGaransiAktif,
    sisa_hari_garansi: sisaHari,
    feedback,
    has_qualifying_review: hasQualifyingReview,
    requires_review_before_claim: !hasQualifyingReview,
    has_active_claim: Boolean(activeClaim),
    active_claim: activeClaim,
    eligible_for_claim: Boolean(booking.status === 'done' && isGaransiAktif && !activeClaim),
    total_klaim: allClaims.length,
    riwayat_klaim: allClaims,
  };
}

async function submitClaim({ booking_id, keluhan, alasan, rating, review_komentar, user, kontak, file = null, foto_bukti_url = null }) {
  keluhan = keluhan || alasan;
  if (!keluhan || String(keluhan).trim().length < 5) {
    throw E.badRequest('Keluhan wajib diisi minimal 5 karakter.');
  }

  const result = await withTransaction(async (client) => {
    const bRes = await client.query(`
      SELECT b.*, s.nama_layanan, s.garansi_hari AS catalog_garansi_hari, c.id AS customer_id
      FROM bookings b
      JOIN service_catalog s ON s.id = b.layanan_id
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = $1 FOR UPDATE
    `, [booking_id]);

    const booking = bRes.rows[0];
    if (!booking) throw E.notFound('Booking tidak ditemukan.');

    const userCustomerId = user ? (user.customer_id || user.customerId) : null;
    if (user && user.role === 'customer') {
      if (!userCustomerId || Number(booking.customer_id) !== Number(userCustomerId)) {
        throw E.forbidden('Anda tidak berhak mengajukan klaim untuk booking ini.');
      }
    } else if (!user || (user.role !== 'admin' && user.role !== 'technician')) {
      const rawKontak = String(kontak || '').trim();
      if (!rawKontak) {
        throw E.unauthorized('Silakan login atau masukkan nomor WhatsApp pemesan untuk verifikasi klaim.');
      }
      if (rawKontak.includes('*') || rawKontak.includes('•')) {
        throw E.forbidden('Masukkan nomor WhatsApp lengkap (minimal 8 digit, bukan nomor yang disamarkan).');
      }
      const cleanKontak = rawKontak.replace(/\D/g, '');
      const cleanBookingKontak = String(booking.kontak || '').replace(/\D/g, '');
      if (
        cleanKontak.length < 8 ||
        cleanBookingKontak.length < 8 ||
        cleanBookingKontak.slice(-8) !== cleanKontak.slice(-8)
      ) {
        throw E.forbidden('Nomor WhatsApp verifikasi tidak cocok dengan data booking (minimal 8 digit terakhir harus sesuai).');
      }
    }

    if (booking.status !== 'done') {
      throw E.badRequest('Klaim garansi hanya dapat diajukan untuk pekerjaan yang telah selesai.');
    }

    const durasiHari = getWarrantyDurationDays(booking.nama_layanan, booking.catalog_garansi_hari);
    const tanggalSelesai = new Date(booking.selesai_aktual || booking.updated_at);
    const garansiSelesai = new Date(tanggalSelesai.getTime() + durasiHari * 86400000);
    const now = new Date();

    if (now > garansiSelesai) {
      throw E.badRequest(
        `Masa garansi untuk layanan ${booking.nama_layanan} (${durasiHari} hari) telah berakhir pada ${garansiSelesai.toLocaleDateString('id-ID')}.`
      );
    }

    const activeClaim = (await client.query(`
      SELECT id, kode_klaim, status FROM warranty_claims 
      WHERE booking_id = $1 AND status IN ('diajukan', 'dijadwalkan', 'diperiksa')
    `, [booking_id])).rows[0];

    if (activeClaim) {
      throw E.conflict(
        `Hanya satu klaim garansi aktif yang diperbolehkan (BR-30). Klaim ${activeClaim.kode_klaim} saat ini berstatus ${activeClaim.status}.`
      );
    }

    const prevClaims = (await client.query(`
      SELECT keluhan FROM warranty_claims WHERE booking_id = $1
    `, [booking_id])).rows;

    const normalizedNew = String(keluhan).trim().toLowerCase();
    if (prevClaims.some((c) => String(c.keluhan || '').trim().toLowerCase() === normalizedNew)) {
      throw E.badRequest(
        'Klaim berikutnya wajib untuk masalah / keluhan yang berbeda dari klaim sebelumnya (BR-31).'
      );
    }

    const fbRes = await client.query('SELECT * FROM feedback WHERE booking_id = $1', [booking_id]);
    let feedback = fbRes.rows.find((f) => Number(f.booking_id) === Number(booking_id)) || null;

    if (!feedback) {
      if (rating === undefined || rating === null || !review_komentar) {
        throw E.badRequest(
          'Klaim garansi wajib menyertakan review berupa rating (1-5) dan komentar pengalaman servis untuk layanan ini terlebih dahulu (BR-25).'
        );
      }
      const numRating = Number(rating);
      if (Number.isNaN(numRating) || numRating < 1 || numRating > 5) {
        throw E.badRequest('Rating harus antara 1 sampai 5 bintang.');
      }
      if (String(review_komentar).trim().length < 3) {
        throw E.badRequest('Komentar review minimal 3 karakter.');
      }

      const fbInsert = await client.query(`
        INSERT INTO feedback (booking_id, rating, komentar, sentimen, waktu)
        VALUES ($1, $2, $3, $4, now()) RETURNING *
      `, [booking_id, numRating, String(review_komentar).trim(), numRating <= 2 ? 'negative' : 'positive']);
      feedback = fbInsert.rows[0];

      await client.query(`
        UPDATE bookings
        SET konfirmasi_pelanggan = TRUE,
            waktu_konfirmasi_pelanggan = COALESCE(waktu_konfirmasi_pelanggan, NOW()),
            updated_at = NOW()
        WHERE id = $1
      `, [booking_id]);
    }

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const kodeKlaim = `CLM-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
    const resolvedPhotoUrl = file && file.storedName
      ? `/api/v1/files/${file.storedName}`
      : (foto_bukti_url ? String(foto_bukti_url).trim() : null);

    const claimInsert = await client.query(`
      INSERT INTO warranty_claims (
        kode_klaim, booking_id, customer_id, ac_unit_id, keluhan, rating, review_komentar,
        foto_bukti_url, status, is_gratis, biaya_tambahan
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'diajukan', true, 0)
      RETURNING *
    `, [
      kodeKlaim,
      booking_id,
      booking.customer_id,
      booking.ac_unit_id || null,
      String(keluhan).trim(),
      feedback ? feedback.rating : Number(rating),
      feedback ? (feedback.komentar || String(review_komentar || '').trim() || 'Review layanan terverifikasi') : String(review_komentar).trim(),
      resolvedPhotoUrl,
    ]);
    const claim = claimInsert.rows[0];

    return {
      claim: normalizeClaimRow({
        ...claim,
        kode_booking: booking.kode_booking,
        nama_layanan: booking.nama_layanan,
      }),
      booking,
      kodeKlaim,
    };
  });

  await createNotification({
    target_role: 'admin',
    target_id: null,
    judul: 'Klaim Garansi Diajukan',
    pesan: `Pelanggan mengajukan klaim garansi ${result.kodeKlaim} untuk tiket ${result.booking.kode_booking}: "${String(keluhan).trim()}"`,
    tipe: 'booking',
    booking_id,
    tautan: `/admin/claims?claimId=${result.claim.id}`,
    dedup_key: `claim_submitted_${result.claim.id}`,
  });

  return result.claim;
}

async function scheduleInspection(claimId, { jadwal_pemeriksaan, teknisi_pemeriksa_id }, _adminUser) {
  if (!jadwal_pemeriksaan) {
    throw E.badRequest('Jadwal pemeriksaan wajib ditentukan oleh admin (BR-27).');
  }
  if (!teknisi_pemeriksa_id) {
    throw E.badRequest('Teknisi pemeriksa wajib ditunjuk (BR-26).');
  }

  const claim = (await query('SELECT * FROM warranty_claims WHERE id = $1', [claimId])).rows[0];
  if (!claim) throw E.notFound('Klaim garansi tidak ditemukan.');

  if (claim.status !== 'diajukan' && claim.status !== 'dijadwalkan') {
    throw E.badRequest(`Klaim berstatus "${claim.status}" tidak dapat dijadwalkan ulang pemeriksaan.`);
  }

  const updated = (await query(`
    UPDATE warranty_claims
    SET jadwal_pemeriksaan = $1, teknisi_pemeriksa_id = $2, status = 'dijadwalkan', updated_at = now()
    WHERE id = $3 RETURNING *
  `, [jadwal_pemeriksaan, teknisi_pemeriksa_id, claimId])).rows[0];

  await createNotification({
    target_role: 'technician',
    target_id: teknisi_pemeriksa_id,
    judul: 'Tugas Pemeriksaan Klaim Garansi',
    pesan: `Anda ditugaskan memeriksa klaim garansi ${claim.kode_klaim} pada ${new Date(jadwal_pemeriksaan).toLocaleString('id-ID')}.`,
    tipe: 'booking',
    booking_id: claim.booking_id,
    tautan: `/technician/jobs`,
    dedup_key: `claim_tech_scheduled_${claimId}`,
  });

  return normalizeClaimRow(updated);
}

async function reportInspection(claimId, { catatan_pemeriksaan }, _technicianUser) {
  if (!catatan_pemeriksaan || catatan_pemeriksaan.trim().length < 5) {
    throw E.badRequest('Catatan hasil pemeriksaan wajib diisi minimal 5 karakter.');
  }

  const claim = (await query('SELECT * FROM warranty_claims WHERE id = $1', [claimId])).rows[0];
  if (!claim) throw E.notFound('Klaim garansi tidak ditemukan.');

  if (claim.status !== 'dijadwalkan' && claim.status !== 'diperiksa') {
    throw E.badRequest('Pemeriksaan hanya dapat dilaporkan untuk klaim yang telah dijadwalkan.');
  }

  const updated = (await query(`
    UPDATE warranty_claims
    SET catatan_pemeriksaan = $1, status = 'diperiksa', updated_at = now()
    WHERE id = $2 RETURNING *
  `, [catatan_pemeriksaan.trim(), claimId])).rows[0];

  await createNotification({
    target_role: 'admin',
    target_id: null,
    judul: 'Hasil Pemeriksaan Klaim Siap Dinilai',
    pesan: `Laporan pemeriksaan klaim ${claim.kode_klaim} telah diisi oleh teknisi. Silakan tentukan kelayakan klaim.`,
    tipe: 'booking',
    booking_id: claim.booking_id,
    tautan: `/admin/claims?claimId=${claimId}`,
    dedup_key: `claim_inspected_${claimId}`,
  });

  return normalizeClaimRow(updated);
}

async function decideClaim(claimId, { keputusan, alasan_penolakan, biaya_tambahan = 0 }, _adminUser) {
  if (!['disetujui', 'ditolak'].includes(keputusan)) {
    throw E.badRequest('Keputusan harus berupa "disetujui" atau "ditolak".');
  }

  const claim = (await query('SELECT * FROM warranty_claims WHERE id = $1', [claimId])).rows[0];
  if (!claim) throw E.notFound('Klaim garansi tidak ditemukan.');

  if (['selesai'].includes(claim.status)) {
    throw E.badRequest('Klaim sudah selesai diproses.');
  }

  if (keputusan === 'ditolak' && (!alasan_penolakan || alasan_penolakan.trim().length < 5)) {
    throw E.badRequest('Alasan penolakan klaim wajib dijelaskan minimal 5 karakter (BR-33).');
  }

  const effectiveBiayaTambahan = keputusan === 'ditolak' ? 0 : (Number(biaya_tambahan) || 0);

  const updated = (await query(`
    UPDATE warranty_claims
    SET status = $1, alasan_penolakan = $2, biaya_tambahan = $3, is_gratis = true, updated_at = now()
    WHERE id = $4 RETURNING *
  `, [keputusan, keputusan === 'ditolak' ? alasan_penolakan.trim() : null, effectiveBiayaTambahan, claimId])).rows[0];

  if (claim.customer_id) {
    await createNotification({
      target_role: 'customer',
      target_id: claim.customer_id,
      judul: `Klaim Garansi ${keputusan.toUpperCase()}`,
      pesan: keputusan === 'disetujui'
        ? `Klaim garansi Anda (${claim.kode_klaim}) telah disetujui. Teknisi kami akan segera menangani unit AC Anda.`
        : `Klaim garansi Anda (${claim.kode_klaim}) ditolak: "${alasan_penolakan}". Tidak ada biaya tambahan otomatis yang ditagihkan. Anda dapat mengajukan perbaikan berbayar jika diinginkan (BR-32).`,
      tipe: 'booking',
      booking_id: claim.booking_id,
      tautan: `/customer/history`,
      dedup_key: `claim_decided_${claimId}`,
    });
  }

  return normalizeClaimRow(updated);
}

async function convertToPaidBooking(claimId, { layanan_id, jadwal_mulai }, _user) {
  return withTransaction(async (client) => {
    const claim = (await client.query('SELECT * FROM warranty_claims WHERE id = $1 FOR UPDATE', [claimId])).rows[0];
    if (!claim) throw E.notFound('Klaim tidak ditemukan.');

    if (claim.status !== 'ditolak') {
      throw E.badRequest('Fitur ini hanya dapat digunakan untuk klaim yang berstatus ditolak (BR-32).');
    }

    if (claim.booking_berbayar_id) {
      throw E.conflict('Booking servis berbayar untuk klaim ini sudah dibuat sebelumnya.');
    }

    const origBooking = (await client.query('SELECT * FROM bookings WHERE id = $1', [claim.booking_id])).rows[0];

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const kodeBooking = `NARA-AC${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
    const targetLayananId = layanan_id || origBooking.layanan_id;

    const newBookingRes = await client.query(`
      INSERT INTO bookings (
        kode_booking, customer_id, ac_unit_id, layanan_id, jadwal_mulai, jadwal_selesai,
        alamat, kontak, keluhan, status, status_pembayaran, jumlah_unit
      ) VALUES ($1, $2, $3, $4, $5, $5::timestamptz + interval '60 minutes', $6, $7, $8, 'scheduled', 'pending', 1)
      RETURNING *
    `, [
      kodeBooking,
      claim.customer_id,
      claim.ac_unit_id,
      targetLayananId,
      jadwal_mulai || new Date(Date.now() + 86400000).toISOString(),
      origBooking.alamat,
      origBooking.kontak,
      `Tindak lanjut klaim garansi ditolak (${claim.kode_klaim}): ${claim.keluhan}`,
    ]);

    const newBooking = newBookingRes.rows[0];

    await client.query('UPDATE warranty_claims SET booking_berbayar_id = $1, updated_at = now() WHERE id = $2', [
      newBooking.id, claimId,
    ]);

    return {
      message: 'Booking servis berbayar berhasil dibuat dari klaim yang ditolak (BR-32).',
      booking_baru: newBooking,
    };
  });
}

async function listClaims({ status, customer_id, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (status) {
    params.push(status);
    conditions.push(`c.status = $${params.length}`);
  }

  if (customer_id) {
    params.push(customer_id);
    conditions.push(`c.customer_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  params.push(limit, offset);
  const dataQuery = `
    SELECT c.*, b.kode_booking, b.kode_booking AS booking_kode,
           s.nama_layanan,
           cust.nama AS nama_customer, cust.kontak AS kontak_customer, cust.kontak AS kontak,
           t.nama AS nama_teknisi_pemeriksa, t.nama AS teknisi_nama,
           u.brand AS unit_brand, u.model AS unit_model, u.lokasi AS unit_lokasi
    FROM warranty_claims c
    JOIN bookings b ON b.id = c.booking_id
    JOIN service_catalog s ON s.id = b.layanan_id
    LEFT JOIN customers cust ON cust.id = c.customer_id
    LEFT JOIN technicians t ON t.id = c.teknisi_pemeriksa_id
    LEFT JOIN ac_units u ON u.id = c.ac_unit_id
    ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `;

  const totalQuery = `
    SELECT COUNT(*)::int AS total
    FROM warranty_claims c
    ${whereClause}
  `;

  const [dataRes, countRes] = await Promise.all([
    query(dataQuery, params),
    query(totalQuery, params.slice(0, conditions.length)),
  ]);

  return {
    data: dataRes.rows.map(normalizeClaimRow),
    meta: {
      total: countRes.rows[0]?.total || 0,
      page: Number(page),
      limit: Number(limit),
    },
  };
}

module.exports = {
  getWarrantyDurationDays,
  getWarrantyInfo,
  submitClaim,
  scheduleInspection,
  reportInspection,
  decideClaim,
  convertToPaidBooking,
  listClaims,
};

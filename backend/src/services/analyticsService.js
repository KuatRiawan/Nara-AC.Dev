const fs = require('fs');
const path = require('path');
const { query } = require('../db/pool');
const { wibDateString, addDaysWibString, startOfWibDay, DAY_MS } = require('../utils/time');

function loadGovernedDsArtifact(filename) {
  try {
    const filePath = path.resolve(__dirname, '../../../data-science/output', filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (_) {}
  return null;
}

async function latestPredictions() {
  try {
    const rows = (await query(
      `SELECT target, periode, nilai_prediksi::float AS nilai, batas_bawah::float AS bawah, batas_atas::float AS atas,
              model_version, keterangan, is_synthetic, metrik, dibuat_pada
       FROM prediction_output
       WHERE dibuat_pada = (SELECT MAX(dibuat_pada) FROM prediction_output)
       ORDER BY periode`)).rows;
    if (rows.length) {
      return {
        target: rows[0].target,
        model_version: rows[0].model_version,
        keterangan: rows[0].keterangan,
        is_synthetic: rows[0].is_synthetic,
        dibuat_pada: rows[0].dibuat_pada,
        metrik: rows[0].metrik,
        prediksi: rows.map((r) => ({ periode: r.periode, nilai: r.nilai, batas_bawah: r.bawah, batas_atas: r.atas })),
      };
    }
  } catch (_) {}
  return loadGovernedDsArtifact('predictions.json');
}

async function summary({ dari, sampai } = {}, now = new Date()) {
  const today = wibDateString(now);
  const to = sampai || today;
  const from = dari || addDaysWibString(today, -29);
  const fromD = startOfWibDay(from);
  const toD = new Date(startOfWibDay(to).getTime() + DAY_MS);
  const range = [fromD, toD];
  const one = async (sql, p = range) => {
    try {
      return (await query(sql, p)).rows;
    } catch {
      return [];
    }
  };

  const [totRow] = await one(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_synthetic)::int AS sintetis,
            COUNT(*) FILTER (WHERE teknisi_id IS NULL AND status IN ('scheduled', 'rescheduled'))::int AS belum_ditugaskan
     FROM bookings WHERE jadwal_mulai >= $1 AND jadwal_mulai < $2`
  );
  const tot = totRow || { total: 0, sintetis: 0, belum_ditugaskan: 0 };

  const status = await one(
    `SELECT status, COUNT(*)::int AS jumlah FROM bookings WHERE jadwal_mulai >= $1 AND jadwal_mulai < $2 GROUP BY status`
  );
  const perPeriode = await one(
    `SELECT to_char(date_trunc('month', jadwal_mulai AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM') AS periode, COUNT(*)::int AS jumlah
     FROM bookings WHERE jadwal_mulai >= $1 AND jadwal_mulai < $2 GROUP BY 1 ORDER BY 1`
  );
  const perHari = await one(
    `SELECT to_char((jadwal_mulai AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS tanggal, COUNT(*)::int AS jumlah
     FROM bookings WHERE jadwal_mulai >= $1 AND jadwal_mulai < $2 GROUP BY 1 ORDER BY 1`
  );
  const bulanIniRows = await one(
    `SELECT COUNT(*)::int AS n FROM bookings WHERE to_char(jadwal_mulai AT TIME ZONE 'Asia/Jakarta','YYYY-MM') = $1`,
    [today.slice(0, 7)]
  );
  const bulanIni = bulanIniRows[0]?.n || 0;

  const workload = await one(
    `SELECT t.id, t.nama, t.aktif,
            COUNT(b.id) FILTER (WHERE b.status IN ('scheduled', 'rescheduled'))::int AS scheduled,
            COUNT(b.id) FILTER (WHERE b.status='on process')::int AS on_process,
            COUNT(b.id) FILTER (WHERE b.status='delayed')::int AS delayed,
            COUNT(b.id) FILTER (WHERE b.status='done')::int AS done,
            COUNT(b.id) FILTER (WHERE b.status<>'cancelled')::int AS total
     FROM technicians t LEFT JOIN bookings b ON b.teknisi_id=t.id AND b.jadwal_mulai >= $1 AND b.jadwal_mulai < $2
     GROUP BY t.id ORDER BY done DESC, total DESC, t.nama`
  );

  const [ratingRow] = await one(
    `SELECT COALESCE(ROUND(AVG(f.rating)::numeric,2),0)::float AS rata, COUNT(f.id)::int AS jumlah,
            COUNT(*) FILTER (WHERE f.rating<=2)::int AS rendah
     FROM feedback f JOIN bookings b ON b.id=f.booking_id WHERE b.jadwal_mulai >= $1 AND b.jadwal_mulai < $2`
  );
  const rating = ratingRow || { rata: 0, jumlah: 0, rendah: 0 };

  const distRating = await one(
    `SELECT f.rating, COUNT(*)::int AS jumlah FROM feedback f JOIN bookings b ON b.id=f.booking_id
     WHERE b.jadwal_mulai >= $1 AND b.jadwal_mulai < $2 GROUP BY f.rating ORDER BY f.rating`
  );
  const stokMenipis = await one(
    `SELECT id, nama, kategori, stok::float, satuan, min_stok::float FROM inventory
     WHERE aktif AND stok <= min_stok ORDER BY (stok / NULLIF(min_stok,0)) NULLS FIRST, nama`, []
  );
  const reminder = await one(
    `SELECT status, COUNT(*)::int AS jumlah FROM reminder_log GROUP BY status`, []
  );
  const [komplainRow] = await one(`SELECT COUNT(*) FILTER (WHERE status='open')::int AS terbuka FROM complaint_tickets`, []);
  const komplain = komplainRow || { terbuka: 0 };

  const besok = addDaysWibString(today, 1);
  const [bskRow] = await one(
    `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE teknisi_id IS NULL)::int AS tanpa_teknisi
     FROM bookings WHERE status IN ('scheduled', 'rescheduled') AND (jadwal_mulai AT TIME ZONE 'Asia/Jakarta')::date = $1::date`, [besok]
  );
  const bsk = bskRow || { total: 0, tanpa_teknisi: 0 };

  const layananTerpopuler = await one(
    `SELECT s.id, s.kode, s.nama_layanan, s.kategori, s.harga::float AS harga_satuan,
            COUNT(DISTINCT b.id) FILTER (WHERE b.status <> 'cancelled')::int AS jumlah_booking,
            COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'done')::int AS booking_selesai,
            COALESCE(SUM(COALESCE(bi.jumlah_unit, b.jumlah_unit, 1)) FILTER (WHERE b.status <> 'cancelled'), 0)::int AS total_unit,
            COALESCE(SUM(COALESCE(bi.subtotal, s.harga * COALESCE(b.jumlah_unit, 1))) FILTER (WHERE b.status = 'done'), 0)::float AS estimasi_pendapatan_jasa
     FROM service_catalog s
     LEFT JOIN bookings b ON b.layanan_id = s.id AND b.jadwal_mulai >= $1 AND b.jadwal_mulai < $2
     LEFT JOIN booking_items bi ON bi.booking_id = b.id AND bi.layanan_id = s.id
     WHERE s.aktif = TRUE
     GROUP BY s.id
     ORDER BY jumlah_booking DESC, total_unit DESC, s.id ASC`
  );

  const [revRow] = await one(
    `SELECT
       COALESCE(SUM(CASE
         WHEN b.status <> 'cancelled' AND (b.status_pembayaran = 'paid' OR b.status_verifikasi_pembayaran = 'diverifikasi')
         THEN GREATEST(COALESCE(b.total_dibayar, 0) - COALESCE(b.refund_nominal, 0),
                       CASE WHEN b.total_dibayar > 0 THEN b.total_dibayar - COALESCE(b.refund_nominal, 0)
                            ELSE (s.harga * COALESCE(b.jumlah_unit, 1)) END)
         ELSE 0 END), 0)::float AS pendapatan_terkonfirmasi,
       COALESCE(SUM(CASE
         WHEN b.status = 'done' AND b.status_pembayaran <> 'paid' AND COALESCE(b.status_verifikasi_pembayaran, '') <> 'diverifikasi'
         THEN (s.harga * COALESCE(b.jumlah_unit, 1))
         ELSE 0 END), 0)::float AS piutang_belum_terverifikasi,
       COALESCE(SUM(COALESCE(b.refund_nominal, 0)), 0)::float AS total_refund,
       COUNT(*) FILTER (WHERE b.status <> 'cancelled' AND (b.status_pembayaran = 'paid' OR b.status_verifikasi_pembayaran = 'diverifikasi'))::int AS transaksi_lunas,
       COUNT(*) FILTER (WHERE b.status_verifikasi_pembayaran = 'menunggu_verifikasi')::int AS menunggu_verifikasi_admin,
       COUNT(*) FILTER (WHERE b.status = 'cancelled')::int AS transaksi_dibatalkan
     FROM bookings b
     JOIN service_catalog s ON s.id = b.layanan_id
     WHERE b.jadwal_mulai >= $1 AND b.jadwal_mulai < $2`
  );

  const [custTxRow] = await one(
    `SELECT
       COUNT(DISTINCT b.id) FILTER (WHERE b.status <> 'cancelled')::int AS total_transaksi_aktif,
       COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'done')::int AS transaksi_selesai,
       COUNT(DISTINCT b.customer_id) FILTER (WHERE b.status <> 'cancelled')::int AS pelanggan_unik,
       COUNT(DISTINCT b.customer_id) FILTER (WHERE b.status <> 'cancelled' AND u.id IS NOT NULL)::int AS pelanggan_member,
       COUNT(DISTINCT b.customer_id) FILTER (WHERE b.status <> 'cancelled' AND u.id IS NULL)::int AS pelanggan_non_member,
       COALESCE(SUM(COALESCE(b.jumlah_unit, 1)) FILTER (WHERE b.status <> 'cancelled'), 0)::int AS total_unit_ac
     FROM bookings b
     LEFT JOIN users u ON u.customer_id = b.customer_id AND u.role = 'customer'
     WHERE b.jadwal_mulai >= $1 AND b.jadwal_mulai < $2`
  );

  const scheduledUpcoming = await one(
    `SELECT b.id, b.kode_booking, b.status, b.jadwal_mulai, b.jadwal_selesai, b.jumlah_unit,
            c.nama AS nama_pelanggan, s.nama_layanan, t.nama AS nama_teknisi
     FROM bookings b
     JOIN customers c ON c.id = b.customer_id
     JOIN service_catalog s ON s.id = b.layanan_id
     LEFT JOIN technicians t ON t.id = b.teknisi_id
     WHERE b.status IN ('scheduled', 'rescheduled', 'on process', 'delayed')
       AND b.jadwal_mulai >= $1 AND b.jadwal_mulai < $2
     ORDER BY b.jadwal_mulai ASC
     LIMIT 25`
  );

  const toMap = (rows, k) => Object.fromEntries(rows.map((r) => [r[k], r.jumlah]));
  const statusDist = { scheduled: 0, rescheduled: 0, 'on process': 0, delayed: 0, done: 0, cancelled: 0, ...toMap(status, 'status') };
  const reminderDist = { pending: 0, sent: 0, failed: 0, ...toMap(reminder, 'status') };

  const governedSummary = loadGovernedDsArtifact('rfm_b2b_summary.json');
  const dsPredictions = await latestPredictions();

  const insights = [];
  if (bsk.tanpa_teknisi > 0) insights.push({ tingkat: 'peringatan', teks: `${bsk.tanpa_teknisi} booking besok belum memiliki teknisi — tetapkan teknisi sekarang.` });
  if (tot.belum_ditugaskan > 0) insights.push({ tingkat: 'info', teks: `${tot.belum_ditugaskan} booking terjadwal belum ditugaskan ke teknisi.` });
  if (revRow?.menunggu_verifikasi_admin > 0) insights.push({ tingkat: 'peringatan', teks: `${revRow.menunggu_verifikasi_admin} bukti pembayaran transfer menunggu verifikasi manual admin.` });
  if (stokMenipis.length) insights.push({ tingkat: 'peringatan', teks: `${stokMenipis.length} item inventory menipis: ${stokMenipis.slice(0, 3).map((s) => s.nama).join(', ')}.` });
  if (reminderDist.failed > 0) insights.push({ tingkat: 'peringatan', teks: `${reminderDist.failed} pengingat gagal terkirim — buka halaman Pengingat untuk kirim ulang.` });
  if (rating.jumlah >= 5 && rating.rata < 4) insights.push({ tingkat: 'peringatan', teks: `Rata-rata rating ${rating.rata} di bawah 4 — tinjau feedback terbaru.` });
  if (komplain.terbuka > 0) insights.push({ tingkat: 'info', teks: `${komplain.terbuka} tiket keluhan belum ditangani.` });
  const aktif = workload.filter((w) => w.aktif && w.total > 0);
  if (aktif.length >= 2) {
    const max = aktif[0]; const min = aktif[aktif.length - 1];
    if (max.total >= 2 * Math.max(min.total, 1)) insights.push({ tingkat: 'info', teks: `Beban kerja tidak seimbang: ${max.nama} (${max.total}) vs ${min.nama} (${min.total}).` });
  }
  if (!insights.length) insights.push({ tingkat: 'ok', teks: 'Operasional berjalan normal pada rentang tanggal ini.' });

  return {
    rentang: { dari: from, sampai: to },
    booking_total: tot.total,
    booking_bulan_ini: bulanIni,
    booking_besok: bsk.total,
    status_distribusi: statusDist,
    booking_per_bulan: perPeriode,
    booking_per_hari: perHari,
    transaksi_pelanggan: {
      total_transaksi_aktif: custTxRow?.total_transaksi_aktif || 0,
      transaksi_selesai: custTxRow?.transaksi_selesai || 0,
      pelanggan_unik: custTxRow?.pelanggan_unik || 0,
      pelanggan_member: custTxRow?.pelanggan_member || 0,
      pelanggan_non_member: custTxRow?.pelanggan_non_member || 0,
      total_unit_ac: custTxRow?.total_unit_ac || 0,
      histori_governed_rfm: governedSummary?.rfm_summary || null,
    },
    layanan_terpopuler: layananTerpopuler,
    pendapatan: {
      pendapatan_terkonfirmasi: revRow?.pendapatan_terkonfirmasi || 0,
      piutang_belum_terverifikasi: revRow?.piutang_belum_terverifikasi || 0,
      total_refund: revRow?.total_refund || 0,
      transaksi_lunas: revRow?.transaksi_lunas || 0,
      menunggu_verifikasi_admin: revRow?.menunggu_verifikasi_admin || 0,
      transaksi_dibatalkan: revRow?.transaksi_dibatalkan || 0,
      histori_governed_servis: governedSummary?.timeseries_summary || null,
      histori_governed_b2b: governedSummary?.b2b_summary || null,
    },
    workload_teknisi: workload,
    booking_terjadwal: {
      total_terjadwal_rentang: (statusDist.scheduled || 0) + (statusDist.rescheduled || 0),
      sedang_dikerjakan: statusDist['on process'] || 0,
      tertunda: statusDist.delayed || 0,
      belum_ditugaskan: tot.belum_ditugaskan || 0,
      booking_besok: bsk.total || 0,
      daftar_jadwal: scheduledUpcoming,
    },
    prediksi_ds: dsPredictions,
    rating: { ...rating, distribusi: distRating },
    inventory_menipis: stokMenipis,
    reminder: reminderDist,
    tiket_keluhan_terbuka: komplain.terbuka,
    insight: insights,
    governed_dataset_summary: governedSummary,
    sumber_data: {
      database: 'PostgreSQL Transaksional + Governed Data Science Pipeline (CV. Nara Teknindotama)',
      booking_sintetis: tot.sintetis,
      booking_nyata: tot.total - tot.sintetis,
      catatan: 'Pendapatan terkonfirmasi hanya menghitung pembayaran lunas/terverifikasi (mengecualikan booking dibatalkan dan pembayaran yang belum diverifikasi).',
    },
  };
}

async function trends(period = '7d', now = new Date()) {
  const p = ['7d', '30d', '90d', '1y'].includes(period) ? period : '7d';

  if (p === '1y') {
    const year = now.getFullYear();
    const startYear = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const endYear = new Date(Date.UTC(year, 11, 31, 23, 59, 59));

    const rows = (await query(`
      SELECT 
        to_char(date_trunc('month', jadwal_mulai AT TIME ZONE 'Asia/Jakarta'), 'MM') AS month_num,
        COUNT(*) FILTER (WHERE status <> 'cancelled')::int AS total,
        COUNT(*) FILTER (WHERE status = 'done')::int AS selesai
      FROM bookings
      WHERE jadwal_mulai >= $1 AND jadwal_mulai <= $2
      GROUP BY 1
      ORDER BY 1
    `, [startYear, endYear])).rows;

    const monthMap = new Map(rows.map((r) => [r.month_num, r]));
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    return monthNames.map((name, idx) => {
      const mStr = String(idx + 1).padStart(2, '0');
      const found = monthMap.get(mStr) || {};
      return {
        date: name,
        key: `${year}-${mStr}`,
        total: found.total || 0,
        selesai: found.selesai || 0,
      };
    });
  }

  if (p === '90d') {
    const startDate = new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const rows = (await query(`
      SELECT 
        to_char(date_trunc('week', jadwal_mulai AT TIME ZONE 'Asia/Jakarta'), 'YYYY-MM-DD') AS week_start,
        COUNT(*) FILTER (WHERE status <> 'cancelled')::int AS total,
        COUNT(*) FILTER (WHERE status = 'done')::int AS selesai
      FROM bookings
      WHERE jadwal_mulai >= $1 AND jadwal_mulai <= $2
      GROUP BY 1
      ORDER BY 1
    `, [startDate, now])).rows;

    return rows.map((r) => {
      const d = new Date(r.week_start);
      return {
        date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        key: r.week_start,
        total: r.total || 0,
        selesai: r.selesai || 0,
      };
    });
  }

  const daysCount = p === '30d' ? 30 : 7;
  const startDate = new Date(now.getTime() - (daysCount - 1) * 24 * 60 * 60 * 1000);
  startDate.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const rows = (await query(`
    SELECT 
      to_char((jadwal_mulai AT TIME ZONE 'Asia/Jakarta')::date, 'YYYY-MM-DD') AS day_str,
      COUNT(*) FILTER (WHERE status <> 'cancelled')::int AS total,
      COUNT(*) FILTER (WHERE status = 'done')::int AS selesai
    FROM bookings
    WHERE jadwal_mulai >= $1 AND jadwal_mulai <= $2
    GROUP BY 1
    ORDER BY 1
  `, [startDate, endOfToday])).rows;

  const dayMap = new Map(rows.map((r) => [r.day_str, r]));
  const result = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    const found = dayMap.get(key) || {};

    const label = p === '7d'
      ? d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
      : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

    result.push({
      date: label,
      key,
      total: found.total || 0,
      selesai: found.selesai || 0,
    });
  }

  return result;
}

module.exports = { summary, latestPredictions, trends };

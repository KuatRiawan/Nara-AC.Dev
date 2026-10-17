import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useToast } from '../../components/ui/toast';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Bot,
  BrainCircuit,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
  Star,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  X,
  Calendar,
  Terminal,
  DollarSign,
  Award,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';

function getWibDateStr(daysOffset = 0) {
  const d = new Date(Date.now() + daysOffset * 86400000);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function AdminAnalytics() {
  const { error: showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [dari, setDari] = useState(() => getWibDateStr(-29));
  const [sampai, setSampai] = useState(() => getWibDateStr(14));
  const [summaryData, setSummaryData] = useState(null);
  const [predictionsData, setPredictionsData] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);
  const [inferenceLogs, setInferenceLogs] = useState([]);
  const [showStreamlitModal, setShowStreamlitModal] = useState(false);
  const [streamlitError, setStreamlitError] = useState(false);

  const streamlitUrl = import.meta.env.VITE_STREAMLIT_URL || 'http://localhost:8501';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowStreamlitModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchData = useCallback(async (fromDate = dari, toDate = sampai) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [sumRes, predRes, statRes, infRes] = await Promise.allSettled([
        api.get('/analytics/summary', { params: { dari: fromDate, sampai: toDate } }),
        api.get('/analytics/predictions'),
        api.get('/ai/status'),
        api.get('/inference-logs?limit=15'),
      ]);

      if (sumRes.status === 'fulfilled') {
        const val = sumRes.value?.booking_total !== undefined ? sumRes.value : (sumRes.value?.data || sumRes.value);
        setSummaryData(val || null);
      } else {
        setErrorMsg('Sebagian data analitik gagal dimuat.');
      }

      if (predRes.status === 'fulfilled') {
        const pVal = predRes.value?.prediksi ? predRes.value : (predRes.value?.data || predRes.value);
        setPredictionsData(pVal || null);
      }

      if (statRes.status === 'fulfilled') {
        setAiStatus(statRes.value?.data || statRes.value || null);
      }

      if (infRes.status === 'fulfilled') {
        const rawInf = infRes.value?.data?.data || infRes.value?.data || infRes.value || [];
        setInferenceLogs(Array.isArray(rawInf) ? rawInf : []);
      }
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Gagal memuat analitik.';
      setErrorMsg(msg);
      showError('Gagal memuat analitik: ' + msg);
    } finally {
      setLoading(false);
    }
  }, [dari, sampai, showError]);

  useEffect(() => {
    fetchData(dari, sampai);
  }, []);

  const applyPresetRange = (daysBack, daysForward = 7) => {
    const f = getWibDateStr(-daysBack);
    const t = getWibDateStr(daysForward);
    setDari(f);
    setSampai(t);
    fetchData(f, t);
  };

  const chartDailyData = useMemo(() => {
    if (!Array.isArray(summaryData?.booking_per_hari)) return [];
    return summaryData.booking_per_hari.map((d) => {
      const parts = String(d.tanggal || '').split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.tanggal;
      return {
        tanggal: label,
        fullName: d.tanggal,
        jumlah: Number(d.jumlah || 0),
      };
    });
  }, [summaryData]);

  const chartWorkloadData = useMemo(() => {
    if (!Array.isArray(summaryData?.workload_teknisi)) return [];
    return summaryData.workload_teknisi.map((t) => ({
      nama: (t.nama || 'Teknisi').split(' ')[0],
      fullName: t.nama,
      scheduled: Number(t.scheduled || 0),
      on_process: Number(t.on_process || 0),
      delayed: Number(t.delayed || 0),
      done: Number(t.done || 0),
      total: Number(t.total || 0),
    }));
  }, [summaryData]);

  const topServicesData = useMemo(() => {
    if (Array.isArray(summaryData?.layanan_terpopuler) && summaryData.layanan_terpopuler.length > 0) {
      return summaryData.layanan_terpopuler.map((s) => ({
        id: s.id,
        kode: s.kode,
        nama: s.nama_layanan,
        kategori: s.kategori,
        jumlah_booking: Number(s.jumlah_booking || 0),
        booking_selesai: Number(s.booking_selesai || 0),
        total_unit: Number(s.total_unit || 0),
        pendapatan: Number(s.estimasi_pendapatan_jasa || 0),
      }));
    }
    return [];
  }, [summaryData]);

  const dsForecastSource = predictionsData || summaryData?.prediksi_ds || null;
  const forecastChartData = useMemo(() => {
    if (!Array.isArray(dsForecastSource?.prediksi)) return [];
    return dsForecastSource.prediksi.map((p) => {
      const parts = String(p.periode || '').split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : p.periode;
      return {
        periode: label,
        fullDate: p.periode,
        prediksi: Number(p.nilai || 0),
        bawah: Number(p.batas_bawah || 0),
        atas: Number(p.batas_atas || 0),
      };
    });
  }, [dsForecastSource]);

  const insights = useMemo(() => {
    return Array.isArray(summaryData?.insight) ? summaryData.insight : [];
  }, [summaryData]);

  const txMetrics = summaryData?.transaksi_pelanggan || {};
  const revMetrics = summaryData?.pendapatan || {};
  const schedMetrics = summaryData?.booking_terjadwal || {};
  const governed = summaryData?.governed_dataset_summary || {};
  const rfmGov = governed.customer_rfm || governed.rfm_summary || txMetrics.histori_governed_rfm || null;
  const regGov = governed.regular_operations || governed.timeseries_summary || revMetrics.histori_governed_servis || null;
  const b2bGov = governed.b2b_resik_projects || governed.b2b_summary || revMetrics.histori_governed_b2b || null;

  const avgConfidence = useMemo(() => {
    if (!inferenceLogs.length) return 0;
    const sum = inferenceLogs.reduce((acc, curr) => acc + (Number(curr.confidence) || 0), 0);
    return Math.round((sum / inferenceLogs.length) * 1000) / 10;
  }, [inferenceLogs]);

  const avgLatency = useMemo(() => {
    if (!inferenceLogs.length) return 0;
    const sum = inferenceLogs.reduce((acc, curr) => acc + (Number(curr.latency_ms) || 0), 0);
    return Math.round(sum / inferenceLogs.length);
  }, [inferenceLogs]);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50/50 relative min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Analitik Operasional, Keuangan & Data Science
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Metrik transaksional terverifikasi (PostgreSQL) dipadukan dengan peramalan permintaan 14 hari & profil RFM Data Science CV. Nara Teknindotama.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs">
            <Input
              type="date"
              value={dari}
              onChange={(e) => {
                const val = e.target.value;
                setDari(val);
                if (val && sampai) fetchData(val, sampai);
              }}
              aria-label="Tanggal Mulai Analitik"
              className="h-8 text-xs border-0 bg-transparent px-2 w-32 font-semibold"
            />
            <span className="text-slate-400">s/d</span>
            <Input
              type="date"
              value={sampai}
              onChange={(e) => {
                const val = e.target.value;
                setSampai(val);
                if (dari && val) fetchData(dari, val);
              }}
              aria-label="Tanggal Akhir Analitik"
              className="h-8 text-xs border-0 bg-transparent px-2 w-32 font-semibold"
            />
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => applyPresetRange(7, 7)}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 text-xs font-bold text-slate-600 cursor-pointer"
            >
              14 Hari
            </button>
            <button
              type="button"
              onClick={() => applyPresetRange(29, 14)}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 text-xs font-bold text-slate-600 cursor-pointer"
            >
              30 Hari
            </button>
            <button
              type="button"
              onClick={() => applyPresetRange(89, 30)}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 text-xs font-bold text-slate-600 cursor-pointer"
            >
              90 Hari
            </button>
          </div>

          <Button
            onClick={() => {
              setStreamlitError(false);
              setShowStreamlitModal(true);
            }}
            variant="outline"
            className="rounded-xl border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer h-9"
          >
            <Terminal className="w-4 h-4 text-blue-600" />
            <span>DS Lab</span>
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
          <span>{errorMsg}</span>
          <Button size="sm" variant="outline" onClick={() => fetchData(dari, sampai)} className="h-8 text-xs">
            Muat Ulang
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">1. Transaksi Pelanggan</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">
              {txMetrics.total_transaksi_aktif ?? summaryData?.booking_total ?? 0}{' '}
              <span className="text-xs font-semibold text-slate-500">Order Aktif</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {txMetrics.pelanggan_unik || 0} pelanggan ({txMetrics.pelanggan_member || 0} member) · {txMetrics.total_unit_ac || 0} unit AC
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">2. Pendapatan Terverifikasi</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-emerald-700 font-mono">
              Rp {Number(revMetrics.pendapatan_terkonfirmasi || 0).toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {revMetrics.transaksi_lunas || 0} lunas · Rp {Number(revMetrics.piutang_belum_terverifikasi || 0).toLocaleString('id-ID')} belum verifikasi
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-sky-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700">3. Layanan Terpopuler</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-base font-extrabold text-slate-900 truncate">
              {topServicesData[0]?.nama || 'Cuci AC Standard'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {topServicesData[0]?.jumlah_booking || 0} order ({topServicesData[0]?.total_unit || 0} unit) pada rentang ini
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-teal-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">4. Beban & Job Selesai</span>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-teal-700">
              {summaryData?.status_distribusi?.done || 0}{' '}
              <span className="text-xs font-semibold text-slate-500">Selesai</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {chartWorkloadData.length} teknisi aktif · Rating {summaryData?.rating?.rata || 0}/5
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-amber-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">5. Booking Terjadwal</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">
              {schedMetrics.total_terjadwal_rentang ?? 0}{' '}
              <span className="text-xs font-semibold text-slate-500">Terjadwal</span>
            </p>
            <p className="text-xs text-amber-700 font-medium mt-1">
              {schedMetrics.booking_besok || 0} jadwal besok · {schedMetrics.belum_ditugaskan || 0} belum ada teknisi
            </p>
          </div>
        </div>
      </div>

      {(rfmGov || regGov || b2bGov) && (
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 rounded-2xl p-5 sm:p-6 text-white shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-sky-100 text-[11px] font-bold uppercase tracking-wider">
                <BrainCircuit className="w-3.5 h-3.5" />
                Governed Data Science Pipeline (CV. Nara Teknindotama)
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold mt-1">
                Rekonsiliasi Dataset Historis Tervalidasi & Peramalan Permintaan
              </h2>
            </div>
            <div className="text-xs text-blue-100 font-mono">
              Model: {dsForecastSource?.model_version || 'nara-ds-v2.1-ridge-ts'} · Holdout 74 Hari MAE: {dsForecastSource?.metrik?.daily_order_MAE ?? '1.29'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3.5">
              <div className="text-blue-100 font-semibold">Histori Servis Reguler (527 Hari)</div>
              <div className="text-lg font-black mt-1 font-mono">
                Rp {Number(regGov?.total_net_revenue_idr || 96118800).toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-blue-100 mt-0.5">
                {regGov?.total_transactions || 545} transaksi selesai · {regGov?.total_units_serviced || 724} unit AC
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3.5">
              <div className="text-blue-100 font-semibold">Basis Pelanggan RFM (PII Tokenized)</div>
              <div className="text-lg font-black mt-1 font-mono">
                {rfmGov?.total_customers || 251} Pelanggan
              </div>
              <div className="text-[11px] text-blue-100 mt-0.5">
                {rfmGov?.registered_members || 53} Member Aktif · Siklus Repeat Median {rfmGov?.median_repeat_interval_days || 96.5} Hari
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3.5">
              <div className="text-blue-100 font-semibold">Proyek B2B & Komersial (79 Proyek)</div>
              <div className="text-lg font-black mt-1 font-mono">
                Rp {Number(b2bGov?.total_net_profit_idr || 157544300).toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-blue-100 mt-0.5">
                Nilai Bruto Rp {Number(b2bGov?.total_gross_value_idr || 234005000).toLocaleString('id-ID')}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-xl p-3.5">
              <div className="text-blue-100 font-semibold">Prediksi Permintaan 14 Hari Ke Depan</div>
              <div className="text-lg font-black mt-1 font-mono">
                {forecastChartData.reduce((acc, d) => acc + d.prediksi, 0).toFixed(1)} Order
              </div>
              <div className="text-[11px] text-blue-100 mt-0.5">
                Rata-rata {(forecastChartData.reduce((acc, d) => acc + d.prediksi, 0) / Math.max(1, forecastChartData.length)).toFixed(2)} order/hari
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200/60">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Rekomendasi & Peringatan Operasional</h3>
              <p className="text-xs text-slate-500">
                Periode evaluasi: {summaryData?.rentang?.dari || dari} s/d {summaryData?.rentang?.sampai || sampai} WIB
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Dibatalkan: {revMetrics.transaksi_dibatalkan || 0} · Refund: Rp {Number(revMetrics.total_refund || 0).toLocaleString('id-ID')}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((ins, idx) => {
            const isWarning = ins.tingkat === 'peringatan';
            const isInfo = ins.tingkat === 'info';
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                  isWarning
                    ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                    : isInfo
                      ? 'bg-blue-50/70 border-blue-200 text-blue-950'
                      : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                }`}
              >
                {isWarning ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                )}
                <span className="font-medium leading-relaxed">{ins.teks}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Prediksi Permintaan Harian (Data Science 14 Hari)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Output model Autoregressive Ridge Regression beserta rentang ketidakpastian
              </p>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="h-64 w-full">
            {forecastChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Data prediksi belum tersedia.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPred" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="periode" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area
                    type="monotone"
                    dataKey="atas"
                    name="Batas Atas"
                    stroke="#93c5fd"
                    strokeDasharray="3 3"
                    fillOpacity={0}
                  />
                  <Area
                    type="monotone"
                    dataKey="prediksi"
                    name="Prediksi Order/Hari"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorPred)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Distribusi Beban Kerja & Penyelesaian Teknisi
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan tiket terjadwal, sedang dikerjakan, dan selesai per teknisi
              </p>
            </div>
            <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="h-64 w-full">
            {chartWorkloadData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Belum ada data beban kerja teknisi pada periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartWorkloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="nama" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis allowDecimals={false} stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="scheduled" name="Terjadwal" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="on_process" name="Dikerjakan" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="done" name="Selesai" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Layanan Paling Sering Digunakan</h3>
                <p className="text-xs text-slate-500">Peringkat paket layanan berdasarkan volume order & unit AC</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Paket Layanan</th>
                  <th className="py-3 px-4 text-center">Order</th>
                  <th className="py-3 px-4 text-center">Total Unit</th>
                  <th className="py-3 px-4 text-right">Nilai Jasa (Selesai)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topServicesData.map((svc) => (
                  <tr key={svc.id || svc.kode} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{svc.nama}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{svc.kode}</div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">
                      {svc.jumlah_booking}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {svc.total_unit} unit
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                      Rp {svc.pendapatan.toLocaleString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Booking Pelanggan Terjadwal</h3>
                <p className="text-xs text-slate-500">Daftar jadwal kunjungan aktif & penugasan teknisi</p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600">
              {schedMetrics.daftar_jadwal?.length || 0} Jadwal Aktif
            </span>
          </div>

          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold text-[11px] sticky top-0">
                <tr>
                  <th className="py-3 px-4">Kode & Jadwal</th>
                  <th className="py-3 px-4">Pelanggan & Layanan</th>
                  <th className="py-3 px-4">Teknisi</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!schedMetrics.daftar_jadwal?.length ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-500">
                      Tidak ada booking aktif terjadwal pada rentang tanggal ini.
                    </td>
                  </tr>
                ) : (
                  schedMetrics.daftar_jadwal.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-blue-700">{b.kode_booking}</div>
                        <div className="text-[11px] text-slate-500">
                          {b.jadwal_mulai ? new Date(b.jadwal_mulai).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : '-'} WIB
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{b.nama_pelanggan}</div>
                        <div className="text-[11px] text-slate-500">
                          {b.nama_layanan} ({b.jumlah_unit || 1} unit)
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {b.nama_teknisi ? (
                          <span className="font-semibold text-slate-800">{b.nama_teknisi}</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                            Belum Ditugaskan
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Performa AI Assistant ({aiStatus?.tersedia ? 'Online' : 'Standby'})
              </h3>
              <p className="text-xs text-slate-500">
                Rata-rata Confidence: {avgConfidence}% · Latency: {avgLatency} ms · {inferenceLogs.length} log terbaru
              </p>
            </div>
          </div>
        </div>

        {inferenceLogs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold text-[11px]">
                <tr>
                  <th className="py-3 px-5">Waktu</th>
                  <th className="py-3 px-5">Intent</th>
                  <th className="py-3 px-5">Confidence</th>
                  <th className="py-3 px-5">Latency</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inferenceLogs.slice(0, 8).map((log) => {
                  const confPct = Math.round((Number(log.confidence) || 0) * 100);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-5 font-mono text-slate-600">
                        {log.waktu ? new Date(log.waktu).toLocaleTimeString('id-ID') : '-'}
                      </td>
                      <td className="py-3 px-5 font-mono font-bold text-slate-900">{log.intent || 'general'}</td>
                      <td className="py-3 px-5 font-mono text-blue-700 font-bold">{confPct}%</td>
                      <td className="py-3 px-5 font-mono text-slate-600">{log.latency_ms || 12} ms</td>
                      <td className="py-3 px-5 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {log.fallback ? 'Fallback' : 'Presisi'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {typeof document !== 'undefined' && createPortal(
        <>
          {showStreamlitModal && (
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowStreamlitModal(false);
              }}
              className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex justify-center items-center p-4"
            >
              <div className="bg-white rounded-3xl max-w-5xl w-full h-[85vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/15 rounded-xl">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">Streamlit Data Science Explorer</h3>
                      <p className="text-xs text-blue-100 font-mono">{streamlitUrl}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={streamlitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-blue-100 hover:text-white hover:bg-white/10 text-xs font-bold flex items-center gap-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="hidden sm:inline">Tab Baru</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setShowStreamlitModal(false)}
                      className="p-1.5 rounded-xl text-blue-100 hover:text-white hover:bg-white/10 cursor-pointer"
                      aria-label="Tutup"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 w-full h-full bg-slate-50 relative overflow-hidden">
                  {streamlitError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-slate-50">
                      <AlertTriangle className="w-10 h-10 text-amber-600 mb-3" />
                      <h4 className="text-base font-bold text-slate-900 mb-1">
                        Layanan Streamlit Opsional Belum Aktif
                      </h4>
                      <p className="text-xs text-slate-600 max-w-md">
                        Seluruh metrik Data Science dan peramalan 14 hari sudah terintegrasi langsung pada dashboard utama di belakang jendela ini.
                      </p>
                    </div>
                  ) : (
                    <iframe
                      src={streamlitUrl}
                      title="Dashboard AI Analytics - Streamlit Data Science Lab"
                      className="w-full h-full border-0"
                      sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                      onError={() => setStreamlitError(true)}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}

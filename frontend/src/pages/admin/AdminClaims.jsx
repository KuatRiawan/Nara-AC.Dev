import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import api from '../../api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../components/ui/toast';
import { cn } from '../../lib/utils';
import {
  ShieldCheck,
  Search,
  Clock,
  CheckCircle2,
  Wrench,
  Calendar,
  RefreshCw,
  Star,
  Plus,
  FileText,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

export default function AdminClaims() {
  const { error: showError, success: showSuccess } = useToast();
  const [claims, setClaims] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDecideModalOpen, setIsDecideModalOpen] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);

  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [decisionType, setDecisionType] = useState('disetujui');
  const [rejectReason, setRejectReason] = useState('');
  const [inspectNotes, setInspectNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const [claimsRes, techsRes] = await Promise.all([
        api.get('/claims/admin', { params: { limit: 100 } }),
        api.get('/technicians'),
      ]);
      const claimsData = claimsRes?.data?.data || claimsRes?.data || claimsRes;
      const techsData = techsRes?.data?.data || techsRes?.data || techsRes;
      setClaims(Array.isArray(claimsData) ? claimsData : []);
      setTechnicians(Array.isArray(techsData) ? techsData : []);
    } catch (err) {
      showError('Gagal memuat data klaim garansi: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.location || claims.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const targetClaimId = params.get('claimId') || params.get('id');
    if (!targetClaimId) return;

    const found = claims.find(c => String(c.id) === String(targetClaimId) || String(c.kode_klaim || '').toUpperCase() === String(targetClaimId).toUpperCase());
    if (found) {
      if (found.status === 'diajukan') {
        openScheduleModal(found);
      } else if (found.status === 'diperiksa') {
        openDecideModal(found);
      } else {
        openInspectModal(found);
      }
      setSearch(found.kode_klaim || '');
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('claimId');
        url.searchParams.delete('id');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      } catch {}
    }
  }, [claims]);

  const kpis = useMemo(() => {
    const total = claims.length;
    let diajukan = 0;
    let aktif = 0;
    let disetujui = 0;
    let ditolak = 0;

    claims.forEach((c) => {
      if (c.status === 'diajukan') diajukan++;
      else if (c.status === 'dijadwalkan' || c.status === 'diperiksa') aktif++;
      else if (c.status === 'disetujui' || c.status === 'selesai') disetujui++;
      else if (c.status === 'ditolak') ditolak++;
    });

    return { total, diajukan, aktif, disetujui, ditolak };
  }, [claims]);

  const filteredClaims = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((c) => {
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      if (!matchStatus) return false;
      if (!q) return true;

      const kodeBooking = c.kode_booking || c.booking_kode || '';
      const customerNama = c.nama_customer || c.customer_nama || '';
      const kontak = c.kontak_customer || c.kontak || '';

      return (
        (c.kode_klaim && c.kode_klaim.toLowerCase().includes(q))
        || kodeBooking.toLowerCase().includes(q)
        || customerNama.toLowerCase().includes(q)
        || kontak.toLowerCase().includes(q)
        || (c.keluhan && c.keluhan.toLowerCase().includes(q))
      );
    });
  }, [claims, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredClaims.length / itemsPerPage));
  const paginatedClaims = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClaims.slice(start, start + itemsPerPage);
  }, [filteredClaims, currentPage, itemsPerPage]);

  const openScheduleModal = (claim) => {
    setSelectedClaim(claim);
    setScheduleDate(new Date().toISOString().split('T')[0]);
    setScheduleTime('10:00');
    setSelectedTechnicianId(claim.teknisi_pemeriksa_id ? String(claim.teknisi_pemeriksa_id) : (technicians[0]?.id ? String(technicians[0].id) : ''));
    setIsScheduleModalOpen(true);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduleDate) {
      showError('Pilih tanggal pemeriksaan.');
      return;
    }
    if (!selectedTechnicianId) {
      showError('Pilih teknisi pemeriksa.');
      return;
    }

    setActionLoading(true);
    try {
      const isoDatetime = `${scheduleDate}T${scheduleTime}:00+07:00`;
      await api.patch(`/claims/${selectedClaim.id}/schedule`, {
        jadwal_pemeriksaan: isoDatetime,
        teknisi_pemeriksa_id: Number(selectedTechnicianId),
      });
      showSuccess(`Jadwal pemeriksaan klaim ${selectedClaim.kode_klaim} berhasil ditentukan.`);
      setIsScheduleModalOpen(false);
      fetchClaims();
    } catch (err) {
      showError('Gagal menjadwalkan pemeriksaan: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setActionLoading(false);
    }
  };

  const openDecideModal = (claim) => {
    setSelectedClaim(claim);
    setDecisionType('disetujui');
    setRejectReason('');
    setIsDecideModalOpen(true);
  };

  const handleDecideSubmit = async (e) => {
    e.preventDefault();
    if (decisionType === 'ditolak' && (!rejectReason.trim() || rejectReason.trim().length < 5)) {
      showError('Alasan penolakan klaim wajib diisi minimal 5 karakter.');
      return;
    }

    setActionLoading(true);
    try {
      await api.patch(`/claims/${selectedClaim.id}/decide`, {
        keputusan: decisionType,
        alasan_penolakan: decisionType === 'ditolak' ? rejectReason.trim() : '',
        biaya_tambahan: 0,
      });
      showSuccess(`Klaim ${selectedClaim.kode_klaim} berhasil diputuskan ${decisionType.toUpperCase()}.`);
      setIsDecideModalOpen(false);
      fetchClaims();
    } catch (err) {
      showError('Gagal memutuskan klaim: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setActionLoading(false);
    }
  };

  const openInspectModal = (claim) => {
    setSelectedClaim(claim);
    setInspectNotes(claim.catatan_pemeriksaan || '');
    setIsInspectModalOpen(true);
  };

  const handleInspectSubmit = async (e) => {
    e.preventDefault();
    if (!inspectNotes.trim() || inspectNotes.trim().length < 5) {
      showError('Catatan hasil pemeriksaan wajib diisi minimal 5 karakter.');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/claims/${selectedClaim.id}/inspect`, {
        catatan_pemeriksaan: inspectNotes.trim(),
      });
      showSuccess(`Laporan hasil pemeriksaan ${selectedClaim.kode_klaim} berhasil disimpan.`);
      setIsInspectModalOpen(false);
      fetchClaims();
    } catch (err) {
      showError('Gagal menyimpan hasil pemeriksaan: ' + (err?.response?.data?.error?.message || err?.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToPaid = async (claim) => {
    try {
      const res = await api.post(`/claims/${claim.id}/convert-to-paid`, {});
      showSuccess(res?.message || res?.data?.message || 'Tiket booking servis berbayar baru berhasil dibuat.');
      fetchClaims();
    } catch (err) {
      showError('Gagal konversi ke servis berbayar: ' + (err?.response?.data?.error?.message || err?.message));
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50/50 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Klaim Garansi Servis
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Penetapan jadwal inspeksi gratis (Rp 0), penugasan teknisi pemeriksa, dan keputusan kelayakan klaim garansi.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Klaim</span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{kpis.total}</p>
            <p className="text-xs text-slate-500 mt-0.5">Seluruh riwayat klaim garansi</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-amber-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Perlu Dijadwalkan</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-amber-800">{kpis.diajukan}</p>
            <p className="text-xs text-amber-600 mt-0.5">Menunggu jadwal & teknisi</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-blue-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Sedang Inspeksi</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-blue-800">{kpis.aktif}</p>
            <p className="text-xs text-blue-600 mt-0.5">Kunjungan pemeriksaan gratis</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-emerald-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Klaim Disetujui</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-emerald-800">{kpis.disetujui}</p>
            <p className="text-xs text-emerald-600 mt-0.5">Bebas biaya servis (Rp 0)</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder="Cari kode klaim, booking, pelanggan..."
            aria-label="Cari klaim garansi"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: `Semua (${kpis.total})` },
            { id: 'diajukan', label: `Perlu Jadwal (${kpis.diajukan})` },
            { id: 'dijadwalkan', label: 'Dijadwalkan' },
            { id: 'diperiksa', label: 'Diperiksa' },
            { id: 'disetujui', label: `Disetujui (${kpis.disetujui})` },
            { id: 'ditolak', label: `Ditolak (${kpis.ditolak})` },
          ].map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={statusFilter === tab.id ? 'default' : 'outline'}
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`rounded-xl text-xs font-bold cursor-pointer h-9 whitespace-nowrap ${
                statusFilter === tab.id ? 'bg-blue-600 text-white' : 'border-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Mobile & Tablet Card View */}
        <div className="block lg:hidden p-4 bg-slate-50/50">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs font-semibold">
              Memuat data klaim garansi...
            </div>
          ) : paginatedClaims.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs font-medium">
              Tidak ada permohonan klaim garansi yang ditemukan.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {paginatedClaims.map((claim) => {
                const kodeBooking = claim.kode_booking || claim.booking_kode || `#${claim.booking_id}`;
                const customerNama = claim.nama_customer || claim.customer_nama || 'Pelanggan';
                const kontak = claim.kontak_customer || claim.kontak || '-';
                const teknisiNama = claim.nama_teknisi_pemeriksa || claim.teknisi_nama;

                return (
                  <div key={claim.id} className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-black text-blue-700 text-sm">{claim.kode_klaim}</span>
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Tiket: {kodeBooking}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {claim.created_at ? new Date(claim.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                          </span>
                        </div>
                        <Badge
                          variant={
                            claim.status === 'disetujui' || claim.status === 'selesai'
                              ? 'success'
                              : claim.status === 'ditolak'
                                ? 'destructive'
                                : claim.status === 'diajukan'
                                  ? 'warning'
                                  : 'info'
                          }
                          className="text-[10px] uppercase font-bold shrink-0"
                        >
                          {claim.status}
                        </Badge>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 truncate">{customerNama}</span>
                          <span className="font-mono text-slate-500 text-[11px] shrink-0">{kontak}</span>
                        </div>
                        {(claim.unit_brand || claim.nama_layanan) && (
                          <p className="text-[11px] text-blue-600 font-medium">
                            {claim.unit_brand ? `${claim.unit_brand} ${claim.unit_model || ''}` : claim.nama_layanan}
                          </p>
                        )}
                      </div>

                      <div className="text-xs space-y-1">
                        <p className="text-slate-700 italic line-clamp-2 bg-amber-50/50 p-2 rounded-lg border border-amber-100/70">
                          &ldquo;{claim.keluhan}&rdquo;
                        </p>
                        {claim.foto_bukti_url && (
                          <a
                            href={claim.foto_bukti_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline pt-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Lihat Foto Bukti</span>
                          </a>
                        )}
                        {claim.alasan_penolakan && (
                          <p className="text-rose-600 text-[11px] font-bold bg-rose-50 p-1.5 rounded border border-rose-100">
                            Ditolak: {claim.alasan_penolakan}
                          </p>
                        )}
                      </div>

                      {/* Pemeriksaan info */}
                      <div className="text-xs border-t border-slate-100 pt-2 space-y-1 text-slate-600">
                        {claim.jadwal_pemeriksaan ? (
                          <div>
                            <div className="flex items-center gap-1 font-bold text-slate-800 text-[11px]">
                              <Clock className="w-3 h-3 text-blue-600" />
                              <span>{new Date(claim.jadwal_pemeriksaan).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} WIB</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Teknisi: <strong className="text-slate-700">{teknisiNama || `ID #${claim.teknisi_pemeriksa_id}`}</strong>
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold inline-block">
                            Belum Dijadwalkan
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5 flex-wrap">
                      {claim.status === 'diajukan' && (
                        <Button
                          size="sm"
                          onClick={() => openScheduleModal(claim)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-9 cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5 mr-1" />
                          <span>Jadwalkan</span>
                        </Button>
                      )}

                      {(claim.status === 'dijadwalkan' || claim.status === 'diperiksa') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openInspectModal(claim)}
                            className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold h-9 cursor-pointer"
                          >
                            <Wrench className="w-3.5 h-3.5 mr-1" />
                            <span>Inspeksi</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openDecideModal(claim)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            <span>Putuskan</span>
                          </Button>
                        </>
                      )}

                      {claim.status === 'ditolak' && !claim.booking_berbayar_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConvertToPaid(claim)}
                          className="w-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold h-9 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          <span>Buat Servis Berbayar</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3.5 px-5">Kode Klaim & Tiket</th>
                <th className="py-3.5 px-5">Pelanggan & Unit AC</th>
                <th className="py-3.5 px-5">Keluhan Garansi</th>
                <th className="py-3.5 px-5">Ulasan Layanan</th>
                <th className="py-3.5 px-5">Pemeriksaan / Teknisi</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5 text-right">Tindakan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    Memuat data klaim garansi...
                  </td>
                </tr>
              ) : paginatedClaims.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    Tidak ada permohonan klaim garansi yang ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedClaims.map((claim) => {
                  const kodeBooking = claim.kode_booking || claim.booking_kode || `#${claim.booking_id}`;
                  const customerNama = claim.nama_customer || claim.customer_nama || 'Pelanggan';
                  const kontak = claim.kontak_customer || claim.kontak || '-';
                  const teknisiNama = claim.nama_teknisi_pemeriksa || claim.teknisi_nama;

                  return (
                    <tr key={claim.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5">
                        <p className="font-mono font-extrabold text-blue-700 text-xs">{claim.kode_klaim}</p>
                        <p className="font-mono text-slate-500 mt-0.5 text-[11px]">Tiket: {kodeBooking}</p>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {claim.created_at ? new Date(claim.created_at).toLocaleDateString('id-ID') : '-'}
                        </span>
                      </td>

                      <td className="py-3.5 px-5">
                        <p className="font-bold text-slate-900">{customerNama}</p>
                        <p className="text-slate-500 text-[11px] font-mono mt-0.5">{kontak}</p>
                        {(claim.unit_brand || claim.nama_layanan) && (
                          <p className="text-[11px] text-blue-600 mt-0.5">
                            {claim.unit_brand ? `${claim.unit_brand} ${claim.unit_model || ''}` : claim.nama_layanan}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-5 max-w-xs">
                        <p className="line-clamp-2 text-slate-800 font-semibold" title={claim.keluhan}>
                          &ldquo;{claim.keluhan}&rdquo;
                        </p>
                        {claim.foto_bukti_url && (
                          <a
                            href={claim.foto_bukti_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline mt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Lihat Foto Bukti
                          </a>
                        )}
                        {claim.alasan_penolakan && (
                          <p className="text-rose-600 text-[11px] mt-1 font-bold">
                            Alasan Ditolak: {claim.alasan_penolakan}
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn('w-3.5 h-3.5', i < (claim.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-200')}
                            />
                          ))}
                          <span className="text-[11px] font-bold text-slate-700 ml-1">({claim.rating || 5}/5)</span>
                        </div>
                        {claim.review_komentar && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1" title={claim.review_komentar}>
                            &ldquo;{claim.review_komentar}&rdquo;
                          </p>
                        )}
                      </td>

                      <td className="py-3.5 px-5">
                        {claim.jadwal_pemeriksaan ? (
                          <div>
                            <p className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-blue-600" />
                              {new Date(claim.jadwal_pemeriksaan).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} WIB
                            </p>
                            <p className="text-slate-600 text-[11px] mt-0.5">
                              Teknisi: <strong>{teknisiNama || `Teknisi #${claim.teknisi_pemeriksa_id}`}</strong>
                            </p>
                            {claim.catatan_pemeriksaan && (
                              <p className="text-[11px] text-emerald-700 mt-0.5 line-clamp-1" title={claim.catatan_pemeriksaan}>
                                Temuan: {claim.catatan_pemeriksaan}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                            Belum Dijadwalkan
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-5">
                        <Badge
                          variant={
                            claim.status === 'disetujui' || claim.status === 'selesai'
                              ? 'success'
                              : claim.status === 'ditolak'
                                ? 'destructive'
                                : claim.status === 'diajukan'
                                  ? 'warning'
                                  : 'info'
                          }
                          className="text-[10px] uppercase font-bold"
                        >
                          {claim.status}
                        </Badge>
                        {claim.status === 'disetujui' && (
                          <span className="text-emerald-700 font-bold text-[10px] block mt-0.5">
                            Gratis (Rp 0)
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {claim.status === 'diajukan' && (
                            <Button
                              size="sm"
                              onClick={() => openScheduleModal(claim)}
                              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold h-8 px-2.5 cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5 mr-1" />
                              <span>Jadwalkan</span>
                            </Button>
                          )}

                          {(claim.status === 'dijadwalkan' || claim.status === 'diperiksa') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openInspectModal(claim)}
                              className="border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-[11px] font-bold h-8 px-2.5 cursor-pointer"
                            >
                              <Wrench className="w-3.5 h-3.5 mr-1" />
                              <span>Inspeksi</span>
                            </Button>
                          )}

                          {(claim.status === 'dijadwalkan' || claim.status === 'diperiksa') && (
                            <Button
                              size="sm"
                              onClick={() => openDecideModal(claim)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold h-8 px-2.5 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              <span>Putuskan</span>
                            </Button>
                          )}

                          {claim.status === 'ditolak' && !claim.booking_berbayar_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConvertToPaid(claim)}
                              className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[11px] font-bold h-8 px-2.5 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              <span>Buat Servis Berbayar</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div>
            Menampilkan <strong className="text-slate-900">{filteredClaims.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> –{' '}
            <strong className="text-slate-900">{Math.min(filteredClaims.length, currentPage * itemsPerPage)}</strong> dari{' '}
            <strong className="text-slate-900">{filteredClaims.length}</strong> klaim garansi
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Sebelumnya
              </button>
              <div className="px-3 py-1 font-bold text-slate-800">
                Hal {currentPage} / {totalPages}
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </div>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <>
          {isScheduleModalOpen && selectedClaim && (
            <div
              className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex justify-center items-center p-4 overflow-y-auto"
              onClick={() => setIsScheduleModalOpen(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5 my-auto"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Jadwalkan Pemeriksaan Garansi</h3>
                      <p className="text-xs text-slate-500 font-mono">{selectedClaim.kode_klaim}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-900">
                  Pemeriksaan klaim garansi di lokasi pelanggan 100% bebas biaya (Rp 0).
                </div>

                <form onSubmit={handleScheduleSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tanggal Pemeriksaan</label>
                    <Input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="rounded-xl border-slate-200 text-xs font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Jam Kedatangan (08:00–18:00 WIB)</label>
                    <Input
                      type="time"
                      min="08:00"
                      max="18:00"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="rounded-xl border-slate-200 text-xs font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Pilih Teknisi Pemeriksa</label>
                    <select
                      id="claim-technician-select"
                      name="claim_technician_id"
                      value={selectedTechnicianId}
                      onChange={(e) => setSelectedTechnicianId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-semibold text-xs focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">-- Pilih Teknisi --</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsScheduleModalOpen(false)}
                      className="rounded-xl text-xs font-bold"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={actionLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                    >
                      {actionLoading ? 'Menyimpan...' : 'Tetapkan Jadwal & Teknisi'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isDecideModalOpen && selectedClaim && (
            <div
              className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex justify-center items-center p-4 overflow-y-auto"
              onClick={() => setIsDecideModalOpen(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-5 my-auto"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Keputusan Klaim Garansi</h3>
                      <p className="text-xs text-slate-500 font-mono">{selectedClaim.kode_klaim}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDecideModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleDecideSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-2">Pilih Keputusan Akhir</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDecisionType('disetujui')}
                        className={cn(
                          'p-3 rounded-2xl border text-center font-bold transition-all cursor-pointer',
                          decisionType === 'disetujui'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        <Check className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                        <span>Disetujui (Gratis)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDecisionType('ditolak')}
                        className={cn(
                          'p-3 rounded-2xl border text-center font-bold transition-all cursor-pointer',
                          decisionType === 'ditolak'
                            ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        )}
                      >
                        <X className="w-5 h-5 text-rose-600 mx-auto mb-1" />
                        <span>Tolak Klaim</span>
                      </button>
                    </div>
                  </div>

                  {decisionType === 'disetujui' ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                      Klaim garansi yang disetujui bebas biaya jasa pengerjaan (Rp 0).
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="font-bold text-slate-700 block">
                        Alasan Penolakan Klaim (Wajib Minimal 5 Karakter)
                      </label>
                      <textarea
                        id="claim-reject-reason-textarea"
                        name="claim_reject_reason"
                        rows={3}
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Jelaskan alasan penolakan klaim garansi..."
                        className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500"
                        required
                      />
                      <p className="text-[11px] text-slate-500">
                        Klaim yang ditolak tidak menimbulkan tagihan otomatis kepada pelanggan.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDecideModalOpen(false)}
                      className="rounded-xl text-xs font-bold"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={actionLoading}
                      className={cn(
                        'rounded-xl text-xs font-bold text-white',
                        decisionType === 'disetujui' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                      )}
                    >
                      {actionLoading ? 'Menyimpan...' : `Konfirmasi ${decisionType === 'disetujui' ? 'Setujui' : 'Tolak'}`}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isInspectModalOpen && selectedClaim && (
            <div
              className="fixed inset-0 z-[9999] bg-slate-950/60 backdrop-blur-xs flex justify-center items-center p-4 overflow-y-auto"
              onClick={() => setIsInspectModalOpen(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 my-auto"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Hasil Pemeriksaan Teknisi</h3>
                      <p className="text-xs text-slate-500 font-mono">{selectedClaim.kode_klaim}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsInspectModalOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleInspectSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Catatan Temuan di Lapangan (Minimal 5 Karakter)
                    </label>
                    <textarea
                      id="claim-inspect-notes-textarea"
                      name="claim_inspect_notes"
                      rows={4}
                      value={inspectNotes}
                      onChange={(e) => setInspectNotes(e.target.value)}
                      placeholder="Deskripsikan kondisi pipa, tekanan freon, dan hasil pemeriksaan..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsInspectModalOpen(false)}
                      className="rounded-xl text-xs font-bold"
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      disabled={actionLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                    >
                      {actionLoading ? 'Menyimpan...' : 'Simpan Laporan'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}

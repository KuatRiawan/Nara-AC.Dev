import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { useToast } from '../../components/ui/toast';
import {
  Clock,
  User,
  ShieldCheck,
  Star,
  CheckCircle2,
  FileText,
  AlertCircle,
  X,
  Upload,
  Loader2,
  Eye
} from 'lucide-react';

export default function CustomerHistory() {
  const { error: showError, success: showSuccess } = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [claimModalBooking, setClaimModalBooking] = useState(null);
  const [warrantyInfo, setWarrantyInfo] = useState(null);
  const [loadingWarranty, setLoadingWarranty] = useState(false);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const [claimReason, setClaimReason] = useState('');
  const [claimPhoto, setClaimPhoto] = useState(null);
  const [claimPhotoPreview, setClaimPhotoPreview] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimError, setClaimError] = useState('');

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/customer/history');
      setHistory(Array.isArray(res) ? res : (res?.data || []));
    } catch (e) {
      showError('Gagal memuat riwayat: ' + (e.response?.data?.error?.message || e.message));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOpenClaimModal = async (booking) => {
    setClaimModalBooking(booking);
    setReviewError('');
    setClaimError('');
    setLoadingWarranty(true);
    try {
      const info = await api.get(`/claims/warranty-info/${booking.id}`);
      setWarrantyInfo(info?.data || info);
    } catch (e) {
      setWarrantyInfo({
        has_qualifying_review: Boolean(booking.sudah_feedback),
        warranty_valid: true,
        has_active_claim: false
      });
    } finally {
      setLoadingWarranty(false);
    }
  };

  const handleCloseClaimModal = () => {
    setClaimModalBooking(null);
    setWarrantyInfo(null);
    setReviewError('');
    setClaimError('');
    if (claimPhotoPreview) {
      URL.revokeObjectURL(claimPhotoPreview);
    }
    setClaimPhoto(null);
    setClaimPhotoPreview('');
  };

  const handleInlineReviewSubmit = async (e) => {
    e.preventDefault();
    if (!claimModalBooking) return;
    if (!reviewRating || reviewRating < 1 || reviewRating > 5) {
      setReviewError('Silakan pilih rating bintang (1–5).');
      return;
    }
    if (!reviewComment || reviewComment.trim().length < 3) {
      setReviewError('Mohon tuliskan ulasan singkat mengenai layanan sebelumnya.');
      return;
    }
    setSubmittingReview(true);
    setReviewError('');
    try {
      await api.post(`/customer/bookings/${claimModalBooking.id}/review`, {
        rating: reviewRating,
        komentar: reviewComment.trim()
      });
      showSuccess('Ulasan berhasil disimpan! Silakan lanjutkan pengajuan klaim garansi Anda.');
      setWarrantyInfo((prev) => ({
        ...(prev || {}),
        has_qualifying_review: true,
        existing_review: { rating: reviewRating, komentar: reviewComment.trim() }
      }));
      setHistory((prev) =>
        prev.map((item) =>
          item.id === claimModalBooking.id
            ? { ...item, sudah_feedback: true, rating: reviewRating, review_komentar: reviewComment.trim() }
            : item
        )
      );
      setClaimModalBooking((prev) => (prev ? { ...prev, sudah_feedback: true } : prev));
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.error?.message || err?.message || 'Gagal mengirim ulasan.';
      setReviewError(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleClaimPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setClaimError('Format foto harus JPG, PNG, atau WEBP.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setClaimError('Ukuran foto maksimal 5 MB.');
      return;
    }
    setClaimError('');
    if (claimPhotoPreview) URL.revokeObjectURL(claimPhotoPreview);
    setClaimPhoto(file);
    setClaimPhotoPreview(URL.createObjectURL(file));
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimModalBooking) return;
    if (!claimReason || claimReason.trim().length < 10) {
      setClaimError('Deskripsikan keluhan klaim garansi minimal 10 karakter.');
      return;
    }
    setSubmittingClaim(true);
    setClaimError('');
    try {
      const formData = new FormData();
      formData.append('booking_id', String(claimModalBooking.id));
      formData.append('alasan', claimReason.trim());
      if (claimPhoto) {
        formData.append('foto_bukti', claimPhoto);
      }
      await api.post('/claims', formData);
      showSuccess('Klaim garansi berhasil diajukan dan sedang ditinjau Admin.');
      setClaimReason('');
      handleCloseClaimModal();
      await loadHistory();
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.error?.message || err?.message || 'Gagal mengajukan klaim garansi.';
      setClaimError(msg);
    } finally {
      setSubmittingClaim(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Memuat riwayat servis...</div>;
  }

  const hasQualifyingReview = Boolean(
    warrantyInfo?.has_qualifying_review || claimModalBooking?.sudah_feedback
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Riwayat Servis &amp; Garansi</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pantau riwayat pekerjaan selesai, unduh E-Invoice, beri ulasan, atau ajukan klaim garansi resmi.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {history.map((b) => {
          const isDone = b.status === 'done';
          const reviewed = Boolean(b.sudah_feedback);

          return (
            <Card key={b.id} className="overflow-hidden rounded-2xl border-slate-200/80 shadow-xs hover:shadow-md transition-all bg-white">
              <div className={`h-1.5 ${isDone ? 'bg-emerald-500' : b.status === 'cancelled' ? 'bg-rose-500' : 'bg-blue-600'}`} />
              <CardContent className="p-5 sm:p-6">
                <div className="flex flex-col lg:flex-row justify-between gap-5">
                  <div className="space-y-2.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-base sm:text-lg text-slate-900">
                        {b.nama_layanan || b.layanan?.nama_layanan || 'Service AC'}
                      </h3>
                      <Badge variant={isDone ? 'success' : b.status === 'cancelled' ? 'danger' : 'info'}>
                        {(b.status || '').toUpperCase()}
                      </Badge>
                      {isDone && reviewed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          Ulasan Terkirim ({b.rating || 5}/5)
                        </span>
                      )}
                      {isDone && b.garansi_hari && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Garansi {b.garansi_hari} Hari
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-500">
                      Kode Booking: <span className="font-mono font-bold text-slate-800">{b.kode_booking}</span>
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-xs sm:text-sm pt-2">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                        <span>{b.jadwal_mulai ? new Date(b.jadwal_mulai).toLocaleString('id-ID') : '-'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <User className="h-4 w-4 text-blue-600 shrink-0" />
                        <span>Teknisi: <strong>{b.teknisi_nama || 'Tim Teknisi NARA AC'}</strong></span>
                      </div>
                      {b.brand && (
                        <div className="col-span-1 sm:col-span-2 text-slate-600">
                          Unit AC: <strong>{b.brand}</strong> ({b.lokasi || 'Lokasi Utama'})
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap lg:flex-col gap-2 justify-end lg:justify-center shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/status/${b.kode_booking}`)}
                      className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Detail &amp; E-Invoice</span>
                    </Button>

                    {isDone && !reviewed && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/feedback/${b.kode_booking}`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span>Beri Ulasan</span>
                      </Button>
                    )}

                    {isDone && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenClaimModal(b)}
                        className="rounded-xl text-xs font-bold border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Klaim Garansi</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {history.length === 0 && (
          <div className="p-10 text-center border-2 border-dashed rounded-2xl text-slate-500 bg-white border-slate-200/80 text-sm">
            Belum ada riwayat servis yang tercatat pada akun Anda.
          </div>
        )}
      </div>

      {typeof document !== 'undefined' &&
        claimModalBooking &&
        createPortal(
          <div
            onClick={handleCloseClaimModal}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-claim-modal-title"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-sky-100 overflow-hidden my-auto"
            >
              <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-sky-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-300 shrink-0" />
                  <div>
                    <h3 id="customer-claim-modal-title" className="font-black text-sm sm:text-base">
                      Pengajuan Klaim Garansi Resmi
                    </h3>
                    <p className="text-[11px] text-sky-100 font-mono">
                      Tiket: {claimModalBooking.kode_booking} • {claimModalBooking.nama_layanan || 'Service AC'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseClaimModal}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
                  aria-label="Tutup modal klaim"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-5 text-xs">
                {loadingWarranty ? (
                  <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span>Memeriksa kelayakan garansi &amp; status ulasan...</span>
                  </div>
                ) : warrantyInfo?.has_active_claim ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Klaim Garansi Aktif Sudah Terdaftar</span>
                    </p>
                    <p className="leading-relaxed">
                      Saat ini sudah terdapat pengajuan klaim garansi aktif untuk pesanan <strong>{claimModalBooking.kode_booking}</strong>. Tim Admin sedang memproses jadwal kunjungan pemeriksaan gratis untuk Anda.
                    </p>
                  </div>
                ) : warrantyInfo?.warranty_expired ? (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Masa Berlaku Garansi Telah Berakhir</span>
                    </p>
                    <p className="leading-relaxed">
                      Masa garansi layanan ini telah berakhir. Silakan buat pesanan servis baru dengan diskon member 10%.
                    </p>
                  </div>
                ) : !hasQualifyingReview ? (
                  <form onSubmit={handleInlineReviewSubmit} className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 leading-relaxed">
                      <p className="font-bold mb-1">Langkah 1 dari 2: Ulasan Layanan Diperlukan</p>
                      <p>
                        Sebelum mengirim klaim garansi untuk tiket <strong>{claimModalBooking.kode_booking}</strong>, mohon berikan penilaian atas kunjungan servis sebelumnya. Setelah ulasan disimpan, Anda dapat langsung melanjutkan klaim garansi tanpa keluar dari halaman ini.
                      </p>
                    </div>

                    {reviewError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                        {reviewError}
                      </div>
                    )}

                    <div>
                      <label className="font-bold text-slate-700 block mb-2">Rating Layanan Sebelumnya *</label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className="p-1.5 rounded-xl hover:bg-amber-50 transition-colors cursor-pointer"
                          >
                            <Star
                              className={`w-7 h-7 ${
                                reviewRating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-2 font-bold text-slate-700">{reviewRating} / 5</span>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="inline-review-comment" className="font-bold text-slate-700 block mb-1">
                        Komentar Ulasan Singkat *
                      </label>
                      <textarea
                        id="inline-review-comment"
                        rows={3}
                        required
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Tuliskan pengalaman Anda pada pengerjaan sebelumnya..."
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={handleCloseClaimModal} className="rounded-xl text-xs">
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={submittingReview}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                      >
                        {submittingReview ? 'Menyimpan Ulasan...' : 'Simpan Ulasan & Lanjut Klaim'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleClaimSubmit} className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Ulasan Layanan Terverifikasi</p>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          Ulasan Anda untuk pesanan ini sudah tercatat. Anda tidak perlu mengisi ulasan ulang dan dapat langsung mengajukan klaim garansi.
                        </p>
                      </div>
                    </div>

                    {claimError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                        {claimError}
                      </div>
                    )}

                    <div>
                      <label htmlFor="claim-reason-input" className="font-bold text-slate-700 block mb-1">
                        Deskripsi Keluhan Garansi * (Min. 10 Karakter)
                      </label>
                      <textarea
                        id="claim-reason-input"
                        rows={4}
                        required
                        value={claimReason}
                        onChange={(e) => setClaimReason(e.target.value)}
                        placeholder="Jelaskan kendala AC yang dialami pasca servis (contoh: unit indoor meneteskan air kembali / kurang dingin)..."
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label htmlFor="claim-photo-input" className="font-bold text-slate-700 block mb-1">
                        Lampiran Foto Kendala (Opsional • JPG/PNG/WEBP Maks. 5 MB)
                      </label>
                      <input
                        id="claim-photo-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleClaimPhotoChange}
                        className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {claimPhotoPreview && (
                        <div className="mt-2 relative inline-block">
                          <img
                            src={claimPhotoPreview}
                            alt="Pratinjau bukti klaim"
                            className="h-24 w-auto rounded-xl border border-slate-200 object-contain bg-slate-50 p-1"
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button type="button" variant="outline" onClick={handleCloseClaimModal} className="rounded-xl text-xs">
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={submittingClaim}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                      >
                        {submittingClaim ? 'Mengirim Klaim...' : 'Kirim Klaim Garansi'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

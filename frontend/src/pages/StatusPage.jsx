import React, { useState, useEffect, useMemo, useRef, useContext, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import CompanyLogo from '../components/CompanyLogo';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/toast';
import { useBusinessProfile, buildWhatsAppUrl, COPYRIGHT_TEXT } from '../hooks/useBusinessProfile';
import { useContextualBack } from '../hooks/useContextualBack';
import OfficialInvoicePaper from '../components/OfficialInvoicePaper';
import { Badge } from '../components/ui/badge';
import {
  Search,
  Clock,
  Wrench,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Printer,
  ShieldCheck,
  FileText,
  Check,
  CalendarCheck,
  XCircle,
  AlertCircle,
  Copy,
  X,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  CalendarDays,
  Ticket,
  Star,
  CreditCard,
  Upload,
  Send,
  DollarSign,
  RefreshCw,
  Camera,
  Lock,
  Edit3,
  Image as ImageIcon,
} from 'lucide-react';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export default function StatusPage({ initialInvoiceOpen = false }) {
  const { kode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext) || {};
  const { error: showError, success: showSuccess } = useToast();
  const { whatsappNumber } = useBusinessProfile();
  const { goBack, fallbackLabel } = useContextualBack('/');

  const isInvoiceRoute = location.pathname.startsWith('/invoice');
  const [kodeInput, setKodeInput] = useState(kode || '');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(!!kode);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [isEditingVerifiedPhone, setIsEditingVerifiedPhone] = useState(false);
  const [phoneInputDraft, setPhoneInputDraft] = useState('');
  const [verifyingPhoneLoading, setVerifyingPhoneLoading] = useState(false);
  const [phoneVerifyError, setPhoneVerifyError] = useState('');

  const [isInvoiceOpen, setIsInvoiceOpen] = useState(initialInvoiceOpen || isInvoiceRoute);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [proofNominal, setProofNominal] = useState('');
  const [proofCatatan, setProofCatatan] = useState('');
  const [proofError, setProofError] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const proofSubmittingRef = useRef(false);

  const [selectedScheme, setSelectedScheme] = useState('pay_after_service');
  const [selectedMethod, setSelectedMethod] = useState('transfer');
  const [isSubmittingScheme, setIsSubmittingScheme] = useState(false);

  const [waDeliveryState, setWaDeliveryState] = useState({
    status: 'idle',
    message: '',
    error: '',
  });

  const [invoiceData, setInvoiceData] = useState(null);
  const [warrantyInfo, setWarrantyInfo] = useState(null);

  const [claimKeluhan, setClaimKeluhan] = useState('');
  const [claimPhotoFile, setClaimPhotoFile] = useState(null);
  const [claimPhotoPreview, setClaimPhotoPreview] = useState('');
  const [claimRating, setClaimRating] = useState(5);
  const [claimReview, setClaimReview] = useState('');
  const [reviewUnlockedInSession, setReviewUnlockedInSession] = useState(false);
  const [isSubmittingReviewFirst, setIsSubmittingReviewFirst] = useState(false);
  const [claimModalError, setClaimModalError] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const claimSubmittingRef = useRef(false);

  const [cancelReason, setCancelReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [confirmingDoneLoading, setConfirmingDoneLoading] = useState(false);

  useEffect(() => {
    if (user && user.role === 'customer' && user.kontak && !String(user.kontak).includes('*')) {
      setVerifiedPhone(user.kontak);
      setPhoneInputDraft(user.kontak);
    }
  }, [user]);

  const fetchStatus = useCallback(async (searchKode, silent = false) => {
    if (!searchKode) return;
    if (!silent) {
      setLoading(true);
      setError('');
    } else {
      setRefreshing(true);
    }

    try {
      const normalizedCode = searchKode.trim().toUpperCase();
      const res = await api.get(`/public/bookings/${encodeURIComponent(normalizedCode)}`);
      const data = res?.kode_booking ? res : (res?.data || res);
      setBooking(data);

      if (data?.whatsapp_invoice_delivery) {
        const deliv = data.whatsapp_invoice_delivery;
        setWaDeliveryState({
          status: deliv.status || 'idle',
          message: deliv.status === 'sent'
            ? `Invoice terakhir terkirim (${deliv.waktu_kirim ? new Date(deliv.waktu_kirim).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'terverifikasi'})`
            : deliv.status === 'failed'
              ? `Pengiriman sebelumnya gagal: ${deliv.error_terakhir || 'Gangguan jaringan'}`
              : '',
          error: deliv.error_terakhir || '',
        });
      }

      try {
        const invoiceRes = await api.get(`/public/bookings/${encodeURIComponent(normalizedCode)}/invoice`, {
          params: verifiedPhone ? { kontak: verifiedPhone } : undefined,
        });
        const inv = invoiceRes?.total !== undefined ? invoiceRes : (invoiceRes?.data || invoiceRes);
        setInvoiceData(inv);
        if (inv?.kontak_terdaftar_unmasked && !verifiedPhone) {
          setVerifiedPhone(inv.kontak_terdaftar_unmasked);
          setPhoneInputDraft(inv.kontak_terdaftar_unmasked);
        }
      } catch {
        setInvoiceData(null);
      }

      if (data?.id) {
        try {
          const wRes = await api.get(`/claims/warranty-info/${data.id}`, {
            params: { kode_booking: data.kode_booking },
          });
          const wData = wRes?.booking_id !== undefined ? wRes : (wRes?.data?.data || wRes?.data || wRes);
          setWarrantyInfo(wData || null);
        } catch {
          setWarrantyInfo(null);
        }
      }
    } catch (err) {
      if (!silent) {
        setBooking(null);
        setInvoiceData(null);
        setWarrantyInfo(null);
        setError(
          err?.response?.data?.error?.message
          || err?.error?.message
          || err?.message
          || 'Kode booking tidak ditemukan. Pastikan kode tiket sudah benar.'
        );
      }
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [verifiedPhone]);

  useEffect(() => {
    if (kode) {
      setKodeInput(kode.toUpperCase());
      fetchStatus(kode, false);
    }
  }, [kode, fetchStatus]);

  useEffect(() => {
    if (!booking?.kode_booking) return undefined;
    const activeStatuses = ['scheduled', 'rescheduled', 'on process', 'delayed'];
    if (!activeStatuses.includes((booking.status || '').toLowerCase())) return undefined;

    const timer = window.setInterval(() => {
      fetchStatus(booking.kode_booking, true);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [booking?.kode_booking, booking?.status, fetchStatus]);

  useEffect(() => {
    if ((initialInvoiceOpen || isInvoiceRoute) && booking) {
      setIsInvoiceOpen(true);
    }
  }, [initialInvoiceOpen, isInvoiceRoute, booking]);

  useEffect(() => {
    return () => {
      if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
      if (claimPhotoPreview) URL.revokeObjectURL(claimPhotoPreview);
    };
  }, [proofPreviewUrl, claimPhotoPreview]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (kodeInput.trim()) {
      navigate(`/status/${kodeInput.trim().toUpperCase()}`);
      fetchStatus(kodeInput.trim(), false);
    }
  };

  const copyBookingCode = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleVerifyPhoneOwnership = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleaned = String(phoneInputDraft || '').trim();
    if (!cleaned || cleaned.includes('*') || cleaned.includes('•') || cleaned.replace(/\D/g, '').length < 8) {
      setPhoneVerifyError('Masukkan nomor WhatsApp lengkap saat booking (minimal 8 digit).');
      return false;
    }
    setVerifyingPhoneLoading(true);
    setPhoneVerifyError('');
    try {
      const res = await api.post(`/public/bookings/${encodeURIComponent(booking.kode_booking)}/verify-phone`, {
        kontak: cleaned,
      });
      const verified = res?.kontak_terverifikasi || res?.data?.kontak_terverifikasi || cleaned;
      setVerifiedPhone(verified);
      setPhoneInputDraft(verified);
      setIsEditingVerifiedPhone(false);
      showSuccess('Nomor WhatsApp pemesan berhasil diverifikasi dan dikunci.');
      fetchStatus(booking.kode_booking, true);
      return verified;
    } catch (err) {
      const msg = err?.error?.message || err?.message || 'Nomor WhatsApp tidak cocok dengan data pemesan.';
      setPhoneVerifyError(msg);
      showError(msg);
      return false;
    } finally {
      setVerifyingPhoneLoading(false);
    }
  };

  const renderPhoneVerificationField = (idPrefix = 'verify') => {
    const isLocked = Boolean(verifiedPhone) && !isEditingVerifiedPhone;
    return (
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${idPrefix}-phone-input`} className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-600" />
            <span>Nomor WhatsApp Pemesan Terverifikasi</span>
          </label>
          {isLocked ? (
            <button
              type="button"
              onClick={() => {
                setIsEditingVerifiedPhone(true);
                setPhoneInputDraft('');
                setPhoneVerifyError('');
              }}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              Ubah Nomor
            </button>
          ) : verifiedPhone ? (
            <button
              type="button"
              onClick={() => {
                setIsEditingVerifiedPhone(false);
                setPhoneInputDraft(verifiedPhone);
                setPhoneVerifyError('');
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Batal Ubah
            </button>
          ) : null}
        </div>

        {isLocked ? (
          <div className="flex items-center gap-2">
            <Input
              id={`${idPrefix}-phone-input`}
              type="tel"
              value={verifiedPhone}
              readOnly
              disabled
              aria-readonly="true"
              className="h-10 text-xs font-mono font-bold bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed select-none"
            />
            <span className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold whitespace-nowrap inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Terkunci
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                id={`${idPrefix}-phone-input`}
                type="tel"
                value={phoneInputDraft}
                onChange={(e) => {
                  setPhoneInputDraft(e.target.value);
                  if (phoneVerifyError) setPhoneVerifyError('');
                }}
                placeholder={`Masukkan nomor lengkap (${booking?.kontak || '0812xxxxxxxx'})`}
                className="h-10 text-xs font-mono bg-white"
              />
              <Button
                type="button"
                size="sm"
                disabled={verifyingPhoneLoading}
                onClick={handleVerifyPhoneOwnership}
                className="h-10 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 cursor-pointer"
              >
                {verifyingPhoneLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verifikasi'}
              </Button>
            </div>
            {phoneVerifyError && (
              <p className="text-[11px] text-rose-600 font-semibold">{phoneVerifyError}</p>
            )}
            <p className="text-[11px] text-slate-500">
              Verifikasi kepemilikan nomor WhatsApp terlebih dahulu. Setelah terverifikasi, nomor akan dikunci otomatis.
            </p>
          </div>
        )}
      </div>
    );
  };

  const resolveActivePhone = async () => {
    if (verifiedPhone && !isEditingVerifiedPhone) return verifiedPhone;
    const ok = await handleVerifyPhoneOwnership();
    return ok || null;
  };

  const statusInfo = useMemo(() => {
    const s = (booking?.status || '').toLowerCase();
    const hasTech = Boolean(booking?.teknisi || booking?.teknisi_lengkap);
    if (s === 'done') {
      return {
        label: 'Pekerjaan Selesai & Bergaransi',
        color: 'bg-emerald-600 text-white',
        step: 3,
        stateType: 'completed',
        icon: CheckCircle2,
      };
    }
    if (s === 'on process') {
      return {
        label: 'Sedang Dikerjakan Teknisi di Lokasi',
        color: 'bg-blue-600 text-white',
        step: 2,
        stateType: 'active',
        icon: Wrench,
      };
    }
    if (s === 'delayed') {
      return {
        label: 'Pengerjaan / Kedatangan Tertunda',
        color: 'bg-amber-600 text-white',
        step: hasTech ? 1 : 0,
        stateType: 'delayed',
        icon: AlertCircle,
      };
    }
    if (s === 'cancelled') {
      return {
        label: 'Dibatalkan',
        color: 'bg-rose-600 text-white',
        step: -1,
        stateType: 'cancelled',
        icon: XCircle,
      };
    }
    if (s === 'rescheduled') {
      return {
        label: hasTech ? 'Dijadwalkan Ulang · Teknisi Siap' : 'Dijadwalkan Ulang',
        color: 'bg-sky-600 text-white',
        step: hasTech ? 1 : 0,
        stateType: 'rescheduled',
        icon: CalendarCheck,
      };
    }
    if (hasTech) {
      return {
        label: 'Teknisi Ditugaskan & Terjadwal',
        color: 'bg-blue-600 text-white',
        step: 1,
        stateType: 'assigned',
        icon: Wrench,
      };
    }
    return {
      label: 'Terjadwal · Menunggu Penugasan Teknisi',
      color: 'bg-sky-600 text-white',
      step: 0,
      stateType: 'pending',
      icon: CalendarCheck,
    };
  }, [booking]);

  const invoiceCalc = useMemo(() => {
    if (invoiceData) {
      return {
        basePrice: invoiceData.basePrice || 0,
        units: invoiceData.units || 1,
        subtotal: invoiceData.subtotal || 0,
        discount: invoiceData.discount || 0,
        total: invoiceData.total || 0,
        warrantyText: invoiceData.warrantyText || '14 Hari Kalender',
      };
    }
    const fallbackTotal = (Number(booking?.harga) || 0) * (Number(booking?.jumlah_unit) || 1);
    return {
      basePrice: Number(booking?.harga) || 0,
      units: booking?.jumlah_unit || 1,
      subtotal: fallbackTotal,
      discount: 0,
      total: fallbackTotal,
      warrantyText: `${booking?.garansi_hari || 14} Hari Kalender`,
    };
  }, [booking, invoiceData]);

  const hasQualifyingReview = useMemo(() => {
    if (reviewUnlockedInSession) return true;
    if (warrantyInfo?.has_qualifying_review) return true;
    if (warrantyInfo?.feedback && Number(warrantyInfo.feedback.booking_id) === Number(booking?.id)) return true;
    if (booking?.sudah_feedback) return true;
    return false;
  }, [reviewUnlockedInSession, warrantyInfo, booking]);

  const existingFeedback = useMemo(() => {
    return warrantyInfo?.feedback || booking?.feedback || (reviewUnlockedInSession ? { rating: claimRating, komentar: claimReview } : null);
  }, [warrantyInfo, booking, reviewUnlockedInSession, claimRating, claimReview]);

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    const phone = await resolveActivePhone();
    if (!phone) return;
    setActionLoading(true);
    try {
      await api.patch(`/public/bookings/${booking.kode_booking}/cancel`, {
        kontak: phone,
        alasan: cancelReason.trim() || 'Dibatalkan oleh pelanggan',
      });
      showSuccess('Jadwal servis berhasil dibatalkan.');
      setIsCancelModalOpen(false);
      fetchStatus(booking.kode_booking, false);
    } catch (err) {
      showError(err?.error?.message || err?.message || 'Gagal membatalkan jadwal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReschedule = async (e) => {
    e.preventDefault();
    if (!newDate) {
      showError('Silakan pilih tanggal kunjungan baru.');
      return;
    }
    const phone = await resolveActivePhone();
    if (!phone) return;
    setActionLoading(true);
    try {
      await api.patch(`/public/bookings/${booking.kode_booking}/reschedule`, {
        jadwal_mulai: `${newDate}T${newTime}:00+07:00`,
        kontak: phone,
      });
      showSuccess('Jadwal kunjungan teknisi berhasil diperbarui.');
      setIsRescheduleModalOpen(false);
      fetchStatus(booking.kode_booking, false);
    } catch (err) {
      showError(err?.error?.fields?.jadwal_mulai || err?.fields?.jadwal_mulai || err?.error?.message || err?.message || 'Gagal mengubah jadwal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmWorkDone = async () => {
    if (confirmingDoneLoading) return;
    const phone = await resolveActivePhone();
    if (!phone) return;
    setConfirmingDoneLoading(true);
    try {
      await api.post(`/public/bookings/${booking.kode_booking}/confirm-done`, {
        kontak: phone,
        catatan: 'Pelanggan mengonfirmasi pekerjaan teknisi telah selesai dengan baik.',
      });
      showSuccess('Pekerjaan servis berhasil dikonfirmasi selesai.');
      fetchStatus(booking.kode_booking, false);
    } catch (err) {
      showError(err?.error?.message || err?.message || 'Gagal mengonfirmasi penyelesaian pekerjaan.');
    } finally {
      setConfirmingDoneLoading(false);
    }
  };

  const handleProofFileChange = (e) => {
    const file = e.target.files?.[0];
    setProofError('');
    if (!file) {
      setProofFile(null);
      if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
      setProofPreviewUrl('');
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setProofError('Format file tidak didukung. Gunakan foto JPG, PNG, atau WEBP.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setProofError('Ukuran foto melebihi batas maksimal 5 MB.');
      e.target.value = '';
      return;
    }
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
    setProofFile(file);
    setProofPreviewUrl(URL.createObjectURL(file));
  };

  const handleConfirmProof = async (e) => {
    e.preventDefault();
    if (proofSubmittingRef.current || isSubmittingProof) return;
    setProofError('');

    if (!proofFile && !proofUrl.trim()) {
      setProofError('Silakan pilih foto bukti transfer atau masukkan tautan bukti pembayaran.');
      return;
    }
    const nominalNum = Number(proofNominal);
    if (!nominalNum || nominalNum <= 0) {
      setProofError('Nominal pembayaran harus berupa angka positif.');
      return;
    }

    const phone = await resolveActivePhone();
    if (!phone && !user) return;

    proofSubmittingRef.current = true;
    setIsSubmittingProof(true);
    try {
      let res;
      if (proofFile) {
        const fd = new FormData();
        fd.append('foto', proofFile);
        fd.append('nominal', String(nominalNum));
        if (proofCatatan.trim()) fd.append('catatan', proofCatatan.trim());
        if (phone) fd.append('kontak', phone);
        res = await api.post(`/payments/bookings/${booking.id}/proof`, fd);
      } else {
        res = await api.post(`/payments/bookings/${booking.id}/proof`, {
          bukti_url: proofUrl.trim(),
          nominal: nominalNum,
          catatan: proofCatatan.trim(),
          kontak: phone || undefined,
        });
      }
      showSuccess(res?.message || res?.data?.message || 'Bukti pembayaran berhasil diunggah dan menunggu verifikasi manual admin.');
      setIsProofModalOpen(false);
      setProofFile(null);
      if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
      setProofPreviewUrl('');
      setProofUrl('');
      setProofCatatan('');
      fetchStatus(booking.kode_booking, false);
    } catch (err) {
      const msg = err?.error?.message || err?.message || 'Gagal mengunggah bukti pembayaran.';
      setProofError(msg);
      showError(msg);
    } finally {
      proofSubmittingRef.current = false;
      setIsSubmittingProof(false);
    }
  };

  const handleConfirmScheme = async (e) => {
    e.preventDefault();
    const phone = await resolveActivePhone();
    if (!phone && !user) return;
    setIsSubmittingScheme(true);
    try {
      const res = await api.post(`/payments/bookings/${booking.id}/scheme`, {
        skema_pembayaran: selectedScheme,
        metode_pembayaran: selectedMethod,
        kontak: phone || undefined,
      });
      showSuccess(res?.message || res?.data?.message || 'Skema dan metode pembayaran berhasil diperbarui.');
      setIsSchemeModalOpen(false);
      fetchStatus(booking.kode_booking, false);
    } catch (err) {
      showError(err?.error?.message || err?.message || 'Gagal memperbarui skema pembayaran.');
    } finally {
      setIsSubmittingScheme(false);
    }
  };

  const handleSubmitStepReviewForClaim = async (e) => {
    e.preventDefault();
    if (isSubmittingReviewFirst) return;
    setClaimModalError('');

    if (!claimReview.trim() || claimReview.trim().length < 3) {
      setClaimModalError('Komentar ulasan servis wajib diisi minimal 3 karakter sebelum melanjutkan klaim garansi.');
      return;
    }

    const phone = await resolveActivePhone();
    if (!phone && !user) return;

    setIsSubmittingReviewFirst(true);
    try {
      await api.post(`/bookings/${booking.id}/feedback`, {
        kode_booking: booking.kode_booking,
        kontak: phone || undefined,
        rating: Number(claimRating),
        komentar: claimReview.trim(),
      });
      setReviewUnlockedInSession(true);
      showSuccess('Ulasan servis berhasil disimpan. Anda kini dapat mengirimkan pengajuan klaim garansi.');
      fetchStatus(booking.kode_booking, true);
    } catch (err) {
      const msg = err?.error?.message || err?.message || 'Gagal menyimpan ulasan servis. Klaim garansi belum dapat dibuka.';
      setClaimModalError(msg);
      showError(msg);
    } finally {
      setIsSubmittingReviewFirst(false);
    }
  };

  const handleClaimPhotoChange = (e) => {
    const file = e.target.files?.[0];
    setClaimModalError('');
    if (!file) {
      setClaimPhotoFile(null);
      if (claimPhotoPreview) URL.revokeObjectURL(claimPhotoPreview);
      setClaimPhotoPreview('');
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setClaimModalError('Format foto tidak didukung. Gunakan JPG, PNG, atau WEBP.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setClaimModalError('Ukuran foto maksimal 5 MB.');
      e.target.value = '';
      return;
    }
    if (claimPhotoPreview) URL.revokeObjectURL(claimPhotoPreview);
    setClaimPhotoFile(file);
    setClaimPhotoPreview(URL.createObjectURL(file));
  };

  const handleConfirmClaim = async (e) => {
    e.preventDefault();
    if (claimSubmittingRef.current || isSubmittingClaim) return;
    setClaimModalError('');

    if (!hasQualifyingReview) {
      setClaimModalError('Harap kirimkan ulasan servis pada Langkah 1 terlebih dahulu sebelum mengajukan klaim garansi.');
      return;
    }

    if (!claimKeluhan.trim() || claimKeluhan.trim().length < 5) {
      setClaimModalError('Detail keluhan garansi wajib diisi minimal 5 karakter.');
      return;
    }

    const phone = await resolveActivePhone();
    if (!phone && !user) return;

    claimSubmittingRef.current = true;
    setIsSubmittingClaim(true);
    try {
      let res;
      if (claimPhotoFile) {
        const fd = new FormData();
        fd.append('booking_id', String(booking.id));
        fd.append('keluhan', claimKeluhan.trim());
        if (phone) fd.append('kontak', phone);
        fd.append('foto', claimPhotoFile);
        res = await api.post('/claims', fd);
      } else {
        res = await api.post('/claims', {
          booking_id: booking.id,
          keluhan: claimKeluhan.trim(),
          kontak: phone || undefined,
        });
      }
      showSuccess(res?.message || res?.data?.message || 'Klaim garansi berhasil diajukan.');
      setIsClaimModalOpen(false);
      setClaimKeluhan('');
      setClaimPhotoFile(null);
      if (claimPhotoPreview) URL.revokeObjectURL(claimPhotoPreview);
      setClaimPhotoPreview('');
      fetchStatus(booking.kode_booking, false);
    } catch (err) {
      const msg = err?.error?.message || err?.message || 'Gagal mengajukan klaim garansi.';
      setClaimModalError(msg);
      showError(msg);
    } finally {
      claimSubmittingRef.current = false;
      setIsSubmittingClaim(false);
    }
  };

  const handleSendWhatsAppInvoice = async () => {
    if (!booking?.id || waDeliveryState.status === 'sending') return;
    const phone = await resolveActivePhone();
    if (!phone && !user) return;

    setWaDeliveryState({ status: 'sending', message: 'Mengirim E-Invoice ke nomor WhatsApp pemesan...', error: '' });
    try {
      const res = await api.post(`/payments/bookings/${booking.id}/send-whatsapp`, {
        tipe_invoice: booking.status === 'done' ? 'final' : 'initial',
        kontak: phone || undefined,
      });
      const payload = res?.status ? res : (res?.data || res);
      if (payload?.success === false || payload?.status === 'failed') {
        const failMsg = payload?.message || 'Pengiriman invoice via WhatsApp gagal.';
        setWaDeliveryState({
          status: 'failed',
          message: failMsg,
          error: payload?.error || 'Gateway timeout',
        });
        showError(failMsg);
      } else {
        const okMsg = payload?.message || 'Invoice resmi berhasil dikirim ke WhatsApp pemesan.';
        setWaDeliveryState({
          status: 'sent',
          message: okMsg,
          error: '',
        });
        showSuccess(okMsg);
      }
    } catch (err) {
      const msg = err?.error?.message || err?.message || 'Gagal mengirim invoice ke WhatsApp.';
      setWaDeliveryState({
        status: 'failed',
        message: msg,
        error: msg,
      });
      showError(msg);
    }
  };

  useEffect(() => {
    if (isInvoiceOpen) {
      document.body.classList.add('invoice-modal-open');
    } else {
      document.body.classList.remove('invoice-modal-open');
    }
    return () => {
      document.body.classList.remove('invoice-modal-open');
    };
  }, [isInvoiceOpen]);

  const handlePrintInvoice = () => {
    const origTitle = document.title;
    document.title = `Invoice_${booking?.kode_booking || 'NARA'}_CV_Nara_Teknindotama`;
    window.print();
    setTimeout(() => {
      document.title = origTitle;
    }, 1000);
  };

  const timelineSteps = useMemo(() => {
    const s = (booking?.status || '').toLowerCase();
    const hasTech = Boolean(booking?.teknisi || booking?.teknisi_lengkap);
    const prog = booking?.progres_teknisi || {};

    return [
      {
        num: 1,
        title: 'Booking Terdaftar',
        desc: booking?.created_at
          ? `Tiket dibuat ${new Date(booking.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} WIB`
          : 'Jadwal tercatat di sistem',
        state: s === 'cancelled' ? 'cancelled' : 'completed',
      },
      {
        num: 2,
        title: hasTech ? 'Teknisi Ditugaskan' : 'Penugasan Teknisi',
        desc: hasTech
          ? `Teknisi: ${booking.teknisi_lengkap || booking.teknisi}`
          : 'Menunggu alokasi teknisi operasional',
        state: s === 'cancelled'
          ? 'cancelled'
          : (s === 'done' || s === 'on process')
            ? 'completed'
            : hasTech
              ? 'active'
              : 'pending',
      },
      {
        num: 3,
        title: 'Pengerjaan di Lokasi',
        desc: s === 'on process'
          ? `Checklist ${prog.checklist_selesai || 0}/${prog.checklist_total || 7} · Foto Before ${prog.foto_sebelum || 0} / After ${prog.foto_sesudah || 0}`
          : s === 'done'
            ? `Selesai dikerjakan (${prog.checklist_selesai || 7}/${prog.checklist_total || 7} checklist)`
            : s === 'delayed'
              ? `Tertunda: ${booking?.alasan_tunda || 'Menunggu konfirmasi jadwal'}`
              : 'Menunggu teknisi memulai pekerjaan',
        state: s === 'done'
          ? 'completed'
          : s === 'on process'
            ? 'active'
            : s === 'delayed'
              ? 'delayed'
              : 'pending',
      },
      {
        num: 4,
        title: 'Selesai & Garansi Aktif',
        desc: s === 'done'
          ? `Selesai ${booking?.selesai_aktual ? new Date(booking.selesai_aktual).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) + ' WIB' : ''} · Garansi ${warrantyInfo?.durasi_garansi_hari || booking?.garansi_hari || 14} Hari`
          : 'Aktif otomatis saat pekerjaan selesai',
        state: s === 'done' ? 'completed' : 'pending',
      },
    ];
  }, [booking, warrantyInfo]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-slate-50 to-white font-sans flex flex-col text-slate-800 print:bg-white print:min-h-0 print:block">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm 10mm 10mm; }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-size: 11px !important;
          }
          body.invoice-modal-open #root,
          body:has(#invoice-print-portal) #root { display: none !important; }
          header, footer, aside, nav, .print\\:hidden, [data-print-hide="true"] { display: none !important; }
          .invoice-modal-backdrop {
            position: static !important;
            inset: auto !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            overflow: visible !important;
          }
          .invoice-modal-card {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
          }
          .avoid-page-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <header className="bg-white/90 backdrop-blur-md border-b border-sky-100/80 sticky top-0 z-40 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex justify-between items-center">
          <Link to="/" className="flex items-center hover:opacity-90 transition-opacity">
            <CompanyLogo iconSize="h-8" />
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/booking">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Booking Baru</span>
              </Button>
            </Link>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={goBack}
              className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{fallbackLabel}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 print:hidden">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider border border-blue-200 mb-3">
            <FileText className="w-3.5 h-3.5" /> Pelacakan Tiket Digital Real-Time
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
            Lacak Status Servis AC
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            Pantau aktivitas pengerjaan teknisi, riwayat status, pembayaran, garansi, dan unduh E-Invoice resmi.
          </p>

          <form onSubmit={handleSearch} className="mt-6 flex items-center gap-2 max-w-md mx-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <label htmlFor="status-search" className="sr-only">Masukkan kode booking</label>
              <Input
                id="status-search"
                type="text"
                value={kodeInput}
                onChange={(e) => setKodeInput(e.target.value.toUpperCase())}
                placeholder="Contoh: NARA-AC... atau BK-..."
                className="h-12 pl-10 uppercase font-mono font-bold tracking-wider rounded-2xl border-slate-200 bg-white shadow-xs focus:ring-2 focus:ring-blue-500 text-sm"
                required
                aria-label="Kode booking"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !kodeInput.trim()}
              className="h-12 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Lacak</span>
            </Button>
          </form>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="flex-1">{error}</span>
          </motion.div>
        )}

        {loading && (
          <div className="bg-white rounded-3xl p-8 border border-sky-100 shadow-xl space-y-6 animate-pulse">
            <div className="h-12 bg-slate-100 rounded-2xl w-2/3" />
            <div className="h-28 bg-slate-100 rounded-2xl" />
            <div className="h-40 bg-slate-100 rounded-2xl" />
          </div>
        )}

        {booking && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-3xl border border-sky-100 shadow-xl shadow-blue-900/5 p-6 sm:p-8 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-emerald-500" />

              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                    KODE TIKET SERVIS
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={cn(
                      'px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5',
                      statusInfo.color
                    )}
                  >
                    {statusInfo.icon && React.createElement(statusInfo.icon, { className: 'w-3.5 h-3.5' })}
                    <span>{statusInfo.label}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => fetchStatus(booking.kode_booking, true)}
                    disabled={refreshing}
                    title="Segarkan status terbaru dari server"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 cursor-pointer"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5 text-blue-600', refreshing && 'animate-spin')} />
                    <span className="hidden sm:inline">Segarkan</span>
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-sky-50/90 via-blue-50/50 to-slate-50 border border-sky-200/80 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Nomor Tiket Pemesanan Resmi
                  </span>
                  <div className="font-mono font-black text-blue-700 text-base sm:text-lg md:text-xl tracking-wider break-all select-all">
                    {booking.kode_booking}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyBookingCode(booking.kode_booking)}
                  className="shrink-0 w-full sm:w-auto py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
                </button>
              </div>

              {(() => {
                const s = (booking.status || '').toLowerCase();
                const techName = booking.teknisi_lengkap || booking.teknisi;
                const prog = booking.progres_teknisi || {};

                if (s === 'done') {
                  return (
                    <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-black text-emerald-950">Pekerjaan Servis Telah Selesai</h4>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              {booking.konfirmasi_pelanggan ? 'Terkonfirmasi Pelanggan' : 'Menunggu Konfirmasi Anda'}
                            </span>
                          </div>
                          <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                            Diselesaikan oleh teknisi <strong>{techName || 'Resmi NARA AC'}</strong>
                            {booking.selesai_aktual ? ` pada ${new Date(booking.selesai_aktual).toLocaleString('id-ID')} WIB` : ''}.
                            {prog.diagnosis ? ` Diagnosa: "${prog.diagnosis}".` : ''}
                          </p>
                        </div>
                      </div>
                      {!booking.konfirmasi_pelanggan && (
                        <Button
                          size="sm"
                          disabled={confirmingDoneLoading}
                          onClick={handleConfirmWorkDone}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9 px-4 shrink-0 cursor-pointer"
                        >
                          {confirmingDoneLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                          Konfirmasi Pekerjaan Selesai
                        </Button>
                      )}
                    </div>
                  );
                }

                if (s === 'on process') {
                  return (
                    <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <Wrench className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-black text-blue-950">Teknisi Sedang Mengerjakan Servis di Lokasi</h4>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white">
                              In Progress
                            </span>
                          </div>
                          <p className="text-xs text-blue-800 mt-0.5">
                            Teknisi <strong>{techName || 'NARA AC'}</strong> telah memulai pengerjaan
                            {booking.mulai_aktual ? ` sejak pukul ${new Date(booking.mulai_aktual).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB` : ''}.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                        <div className="bg-white p-2.5 rounded-xl border border-blue-100 flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Progres Checklist SOP:</span>
                          <span className="font-mono font-bold text-blue-700">
                            {prog.checklist_selesai || 0} / {prog.checklist_total || 7} Selesai
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-blue-100 flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Foto Kondisi Sebelum:</span>
                          <span className="font-mono font-bold text-emerald-700">{prog.foto_sebelum || 0} Foto</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-blue-100 flex items-center justify-between">
                          <span className="text-slate-600 font-medium">Foto Kondisi Sesudah:</span>
                          <span className="font-mono font-bold text-emerald-700">{prog.foto_sesudah || 0} Foto</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (s === 'delayed') {
                  return (
                    <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-amber-950">Kunjungan / Pengerjaan Mengalami Penundaan</h4>
                        <p className="text-xs text-amber-800 mt-0.5">
                          {booking.alasan_tunda || 'Teknisi melaporkan kendala di lapangan. Tim admin akan segera menghubungi Anda.'}
                        </p>
                      </div>
                    </div>
                  );
                }

                if (s === 'cancelled') {
                  return (
                    <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                        <XCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-rose-950">Booking Telah Dibatalkan</h4>
                        <p className="text-xs text-rose-800 mt-0.5">
                          Alasan: {booking.alasan_batal || 'Dibatalkan sesuai permintaan.'}
                        </p>
                      </div>
                    </div>
                  );
                }

                if (techName) {
                  return (
                    <div className="mb-6 p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900">Teknisi Resmi Telah Ditugaskan</h4>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            Terjadwal
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Teknisi <strong>{techName}</strong> telah dijadwalkan untuk menangani servis AC Anda sesuai waktu kunjungan.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="mb-6 p-4 rounded-2xl bg-sky-50 border border-sky-200/80 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-sky-950">Jadwal Terdaftar — Menunggu Alokasi Teknisi</h4>
                      <p className="text-xs text-sky-800 mt-0.5">
                        Tiket servis Anda sudah terdaftar. Tim operasional sedang menetapkan teknisi untuk rute lokasi Anda.
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="py-6 border-y border-slate-100 space-y-6">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-4">
                    Tahapan Progres Pengerjaan
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
                    <div className="hidden sm:block absolute top-5 left-10 right-10 h-0.5 bg-slate-200 z-0" />
                    {timelineSteps.map((st) => {
                      const isCompleted = st.state === 'completed';
                      const isActive = st.state === 'active';
                      const isDelayed = st.state === 'delayed';
                      const isCancelled = st.state === 'cancelled';

                      return (
                        <div key={st.num} className="relative z-10 flex sm:flex-col items-start gap-3 bg-white sm:bg-transparent p-2.5 sm:p-0 rounded-xl border sm:border-0 border-slate-100">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-xs transition-all border-2',
                              isCompleted
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                : isActive
                                  ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100 shadow-sm'
                                  : isDelayed
                                    ? 'bg-amber-500 border-amber-500 text-white'
                                    : isCancelled
                                      ? 'bg-rose-500 border-rose-500 text-white'
                                      : 'bg-white border-slate-200 text-slate-400'
                            )}
                          >
                            {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : st.num}
                          </div>
                          <div className="min-w-0 sm:pr-2">
                            <h4
                              className={cn(
                                'text-xs font-extrabold leading-snug',
                                isActive ? 'text-blue-700' : isCompleted ? 'text-slate-900' : isDelayed ? 'text-amber-800' : 'text-slate-500'
                              )}
                            >
                              {st.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed break-words">
                              {st.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {Array.isArray(booking.riwayat_status) && booking.riwayat_status.length > 0 && (
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
                      Riwayat Kronologis Status Tiket
                    </h4>
                    <div className="relative pl-5 space-y-3 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {booking.riwayat_status.map((log, idx) => {
                        const isLatest = idx === booking.riwayat_status.length - 1;
                        const statusLabel = (log.status_baru || log.status || 'scheduled').toUpperCase();
                        return (
                          <div key={idx} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs bg-slate-50/80 border border-slate-200/70 rounded-xl px-3.5 py-2.5">
                            <span
                              className={cn(
                                'absolute -left-[17px] top-3.5 w-2.5 h-2.5 rounded-full border-2 border-white',
                                isLatest ? 'bg-blue-600 ring-2 ring-blue-200' : 'bg-emerald-500'
                              )}
                            />
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10px] font-bold">
                                  {statusLabel}
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {log.catatan || `Status diperbarui menjadi ${statusLabel}`}
                                </span>
                              </div>
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 shrink-0">
                              {log.waktu ? new Date(log.waktu).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) + ' WIB' : '-'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Paket Layanan:
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">{booking.layanan || 'Cuci AC'}</p>
                  <p className="text-xs font-bold text-blue-600 mt-0.5 font-mono">
                    {invoiceData?.units || booking?.jumlah_unit || 1} Unit AC
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Jadwal Kedatangan:
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {booking.jadwal_mulai
                      ? new Date(booking.jadwal_mulai).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '-'}
                  </p>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    Pukul{' '}
                    {booking.jadwal_mulai
                      ? new Date(booking.jadwal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                      : '-'}{' '}
                    WIB
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Teknisi Bertugas:
                  </span>
                  <p className="font-extrabold text-slate-900 text-sm">
                    {booking.teknisi_lengkap || booking.teknisi || 'Sedang Dialokasikan'}
                  </p>
                  {booking.teknisi_lengkap || booking.teknisi ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 border border-emerald-200/60">
                      <ShieldCheck className="w-3 h-3" /> Teknisi Resmi NARA AC
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md mt-1 border border-slate-200/60">
                      <Clock className="w-3 h-3 text-slate-400" /> Menunggu Penugasan Admin
                    </span>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 sm:col-span-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Pemesan & Lokasi Pengerjaan:
                  </span>
                  <p className="font-semibold text-slate-800 text-xs leading-relaxed">
                    {invoiceData?.alamat_unmasked || booking.alamat || '-'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Pemesan: <strong>{invoiceData?.customer_nama_unmasked || booking.customer_nama}</strong> ({verifiedPhone || booking.kontak || '-'})
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-100 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      {booking.status === 'done' ? 'Total Tagihan Final:' : 'Total Estimasi Biaya:'}
                    </span>
                    <p className="text-2xl font-black text-blue-700 font-mono tracking-tight">
                      Rp {(invoiceCalc.total || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 font-medium mt-1">
                    {booking.status_pembayaran === 'paid' ? 'Pembayaran Lunas' : 'Lihat rincian pada E-Invoice'}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                {renderPhoneVerificationField('main-status')}
              </div>

              {booking.status === 'done' && warrantyInfo && (
                <div className="mt-6 bg-gradient-to-r from-blue-50/70 via-sky-50/50 to-emerald-50/40 rounded-2xl p-5 sm:p-6 border border-blue-100 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-blue-100/80 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="font-black text-sm text-slate-900">Garansi Pengerjaan &amp; Komponen Resmi</h4>
                        <p className="text-xs text-slate-500 font-medium">
                          {hasQualifyingReview
                            ? 'Ulasan servis telah tercatat — Anda dapat langsung mengajukan klaim garansi jika diperlukan'
                            : 'Ulasan servis diperlukan 1 kali sebelum mengajukan klaim garansi'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={warrantyInfo.is_garansi_aktif ? 'success' : 'secondary'} className="text-xs font-bold uppercase">
                      {warrantyInfo.is_garansi_aktif ? `Garansi Aktif (${warrantyInfo.sisa_hari_garansi} Hari Lagi)` : 'Masa Garansi Berakhir'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white/80 p-3 rounded-xl border border-blue-100/60">
                      <span className="text-slate-500 font-semibold block text-[11px] uppercase">Masa Berlaku</span>
                      <span className="font-bold text-slate-800">{warrantyInfo.durasi_garansi_hari} Hari Kalender</span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-blue-100/60">
                      <span className="text-slate-500 font-semibold block text-[11px] uppercase">Berakhir Pada</span>
                      <span className="font-bold text-slate-800">
                        {warrantyInfo.garansi_selesai
                          ? new Date(warrantyInfo.garansi_selesai).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '-'}
                      </span>
                    </div>
                    <div className="bg-white/80 p-3 rounded-xl border border-blue-100/60">
                      <span className="text-slate-500 font-semibold block text-[11px] uppercase">Biaya Kunjungan Inspeksi</span>
                      <span className="font-bold text-emerald-700">100% Gratis (Rp 0)</span>
                    </div>
                  </div>

                  {warrantyInfo.active_claim && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-amber-900 uppercase tracking-wider">
                          Klaim Garansi Aktif: {warrantyInfo.active_claim.kode_klaim}
                        </span>
                        <Badge variant="warning" className="font-bold uppercase">
                          {warrantyInfo.active_claim.status}
                        </Badge>
                      </div>
                      <p className="text-slate-700 font-medium">
                        <span className="font-bold text-slate-900">Keluhan:</span> &ldquo;{warrantyInfo.active_claim.keluhan}&rdquo;
                      </p>
                      {warrantyInfo.active_claim.jadwal_pemeriksaan ? (
                        <p className="text-blue-800 font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Jadwal Pemeriksaan: {new Date(warrantyInfo.active_claim.jadwal_pemeriksaan).toLocaleString('id-ID')} WIB</span>
                        </p>
                      ) : (
                        <p className="text-amber-800 italic">
                          Menunggu penetapan jadwal pemeriksaan teknisi oleh admin.
                        </p>
                      )}
                    </div>
                  )}

                  {warrantyInfo.riwayat_klaim?.[0]?.status === 'ditolak' && !warrantyInfo.active_claim && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-rose-900 uppercase">
                          Klaim Sebelumnya Ditolak ({warrantyInfo.riwayat_klaim[0].kode_klaim})
                        </span>
                        <Badge variant="destructive" className="font-bold uppercase">Ditolak (Rp 0)</Badge>
                      </div>
                      <p className="text-rose-800">
                        <span className="font-bold">Alasan:</span> {warrantyInfo.riwayat_klaim[0].alasan_penolakan || 'Tidak memenuhi kriteria garansi resmi'}
                      </p>
                      <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-slate-600">Tidak ada biaya tambahan otomatis. Anda dapat membuat booking servis berbayar baru jika diperlukan.</span>
                        <Button
                          size="sm"
                          onClick={() => navigate('/booking')}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg h-8 px-3 cursor-pointer"
                        >
                          Booking Servis Berbayar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 bg-slate-50/80 rounded-2xl p-5 sm:p-6 border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                    <div>
                      <h4 className="font-black text-sm text-slate-900">Skema, Metode &amp; Bukti Pembayaran</h4>
                      <p className="text-xs text-slate-500 font-medium">Pengaturan tagihan dan unggah foto bukti transfer bank</p>
                    </div>
                  </div>
                  <Badge variant={booking.status_pembayaran === 'paid' ? 'success' : 'secondary'} className="text-xs font-bold uppercase">
                    {booking.status_pembayaran === 'paid' ? 'LUNAS (PAID)' : 'TAGIHAN AKTIF (PENDING)'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wider mb-1">
                        Skema Pembayaran
                      </span>
                      <p className="font-bold text-slate-900 text-sm">
                        {booking.skema_pembayaran === 'full_upfront'
                          ? 'Bayar Lunas di Awal'
                          : booking.skema_pembayaran === 'dp_50'
                            ? 'Uang Muka (DP 50%)'
                            : 'Bayar Setelah Servis'}
                      </p>
                    </div>
                    {booking.status !== 'done' && booking.status_pembayaran !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedScheme(booking.skema_pembayaran || 'pay_after_service');
                          setSelectedMethod(booking.metode_pembayaran || 'transfer');
                          setIsSchemeModalOpen(true);
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline text-left mt-2 cursor-pointer"
                      >
                        Ubah Skema &amp; Metode &rarr;
                      </button>
                    )}
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wider mb-1">
                      Metode Pembayaran
                    </span>
                    <p className="font-bold text-slate-900 text-sm">
                      {booking.metode_pembayaran === 'transfer'
                        ? 'Transfer Bank Resmi'
                        : booking.metode_pembayaran === 'qris'
                          ? 'QRIS Resmi NARA AC'
                          : 'Tunai kepada Teknisi'}
                    </p>
                    <span className="text-xs text-slate-500 mt-1 block">
                      {booking.metode_pembayaran === 'transfer'
                        ? 'BCA 8720-9182-33 / Mandiri 137-00-9821-4451'
                        : 'Disediakan saat servis'}
                    </span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wider mb-1">
                        Status Verifikasi Bukti Transfer
                      </span>
                      {booking.status_verifikasi_pembayaran === 'diverifikasi' || booking.status_pembayaran === 'paid' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Diverifikasi Admin
                        </span>
                      ) : booking.status_verifikasi_pembayaran === 'ditolak' ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded text-xs border border-rose-200">
                          <XCircle className="w-3.5 h-3.5" /> Bukti Ditolak
                        </span>
                      ) : booking.bukti_pembayaran_url ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded text-xs border border-amber-200">
                          <Clock className="w-3.5 h-3.5" /> Menunggu Verifikasi Admin
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs italic">Belum mengunggah foto bukti</span>
                      )}
                    </div>

                    {booking.status_verifikasi_pembayaran !== 'diverifikasi' && booking.status_pembayaran !== 'paid' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setProofError('');
                          setProofNominal(
                            booking.skema_pembayaran === 'dp_50'
                              ? Math.round((invoiceCalc.total || 0) * 0.5)
                              : (invoiceCalc.total || 0)
                          );
                          setIsProofModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold h-8 px-3 mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{booking.bukti_pembayaran_url ? 'Unggah Ulang Foto Bukti' : 'Unggah Foto Bukti Bayar'}</span>
                      </Button>
                    )}
                  </div>
                </div>

                {booking.status_verifikasi_pembayaran === 'ditolak' && booking.catatan_verifikasi && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Alasan Penolakan Bukti Transfer:</span>
                      <p className="mt-0.5">{booking.catatan_verifikasi}</p>
                    </div>
                  </div>
                )}

                {(Number(booking.refund_nominal || 0) > 0 || booking.refund_status === 'processed') && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 flex items-start gap-2.5">
                    <DollarSign className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black uppercase tracking-wider text-emerald-800 block">
                        Pengembalian Kelebihan Pembayaran
                      </span>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        Kelebihan pembayaran sebesar <strong>Rp {Number(booking.refund_nominal || 0).toLocaleString('id-ID')}</strong> telah diproses pengembaliannya.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {['scheduled', 'rescheduled'].includes((booking.status || '').toLowerCase()) && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsRescheduleModalOpen(true)}
                          className="rounded-xl border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer h-9"
                        >
                          Ubah Jadwal
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsCancelModalOpen(true)}
                          className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer h-9"
                        >
                          Batalkan
                        </Button>
                      </>
                    )}

                    {booking.status === 'done' && !hasQualifyingReview && (
                      <Link to={`/feedback/${booking.kode_booking}`}>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer h-9"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Beri Ulasan Servis</span>
                        </Button>
                      </Link>
                    )}

                    {booking.status === 'done' && hasQualifyingReview && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        Ulasan Terverifikasi ({existingFeedback?.rating || 5}/5)
                      </span>
                    )}

                    {booking.status === 'done' && warrantyInfo?.is_garansi_aktif && !warrantyInfo?.active_claim && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setClaimModalError('');
                          setIsClaimModalOpen(true);
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer h-9"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Ajukan Klaim Garansi</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      aria-label="Cetak Invoice Resmi"
                      onClick={() => setIsInvoiceOpen(true)}
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer h-9 px-4"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak Invoice Resmi</span>
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={waDeliveryState.status === 'sending'}
                      onClick={handleSendWhatsAppInvoice}
                      className="rounded-xl border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer h-9 px-3.5"
                    >
                      {waDeliveryState.status === 'sending' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      ) : waDeliveryState.status === 'failed' ? (
                        <RefreshCw className="w-3.5 h-3.5 text-rose-600" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-blue-600" />
                      )}
                      <span>
                        {waDeliveryState.status === 'sent'
                          ? 'Kirim Ulang Invoice WA'
                          : waDeliveryState.status === 'failed'
                            ? 'Coba Kirim Ulang Invoice WA'
                            : 'Kirim Invoice ke WA'}
                      </span>
                    </Button>

                    <a
                      href={buildWhatsAppUrl(whatsappNumber, `Halo Admin NARA AC, saya butuh bantuan terkait tiket servis ${booking.kode_booking}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5 cursor-pointer h-9 px-3.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Bantuan CS</span>
                      </Button>
                    </a>
                  </div>
                </div>

                {waDeliveryState.status !== 'idle' && waDeliveryState.message && (
                  <div
                    className={cn(
                      'p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border',
                      waDeliveryState.status === 'sent'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : waDeliveryState.status === 'failed'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {waDeliveryState.status === 'sent' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : waDeliveryState.status === 'failed' ? (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
                      )}
                      <span>{waDeliveryState.message}</span>
                    </div>
                    {waDeliveryState.status === 'failed' && (
                      <button
                        type="button"
                        onClick={handleSendWhatsAppInvoice}
                        className="text-xs font-bold text-rose-700 underline hover:no-underline shrink-0 cursor-pointer"
                      >
                        Kirim Ulang
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {isInvoiceOpen && booking && typeof document !== 'undefined' && createPortal(
        <div
          id="invoice-print-portal"
          className="invoice-modal-backdrop fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full print:h-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setIsInvoiceOpen(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="invoice-modal-card bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] print:max-w-none print:w-full print:rounded-none print:shadow-none print:border-none print:max-h-none print:h-auto print:overflow-visible print:block"
          >
            <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center justify-between print:hidden">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-sky-200" />
                Pratinjau E-Invoice Resmi CV. Nara Teknindotama
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handlePrintInvoice}
                  className="h-8 px-3 rounded-lg bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Unduh PDF</span>
                </Button>

                <button
                  type="button"
                  onClick={() => setIsInvoiceOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-white/15 text-white flex items-center justify-center cursor-pointer"
                  aria-label="Tutup modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <OfficialInvoicePaper booking={{ ...booking, ...invoiceData }} />
          </motion.div>
        </div>,
        document.body
      )}

      <AnimatePresence>
        {isRescheduleModalOpen && booking && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span>Ubah Jadwal Kunjungan</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsRescheduleModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmReschedule} className="space-y-4 text-xs">
                <div>
                  <label htmlFor="reschedule-date" className="font-bold text-slate-700 block mb-1">Tanggal Kunjungan Baru *</label>
                  <Input
                    id="reschedule-date"
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="h-11 rounded-xl text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="reschedule-time" className="font-bold text-slate-700 block mb-1">Jam Kedatangan Baru (08:00–18:00 WIB) *</label>
                  <select
                    id="reschedule-time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 text-xs font-semibold bg-white"
                  >
                    <option value="08:00">08:00 WIB (Pagi)</option>
                    <option value="09:00">09:00 WIB (Pagi)</option>
                    <option value="10:00">10:00 WIB (Pagi)</option>
                    <option value="11:00">11:00 WIB (Pagi)</option>
                    <option value="12:00">12:00 WIB (Siang)</option>
                    <option value="13:00">13:00 WIB (Siang)</option>
                    <option value="14:00">14:00 WIB (Siang)</option>
                    <option value="15:00">15:00 WIB (Sore)</option>
                    <option value="16:00">16:00 WIB (Sore)</option>
                    <option value="17:00">17:00 WIB (Sore)</option>
                    <option value="18:00">18:00 WIB (Sore - Layanan ≤ 60 Menit)</option>
                  </select>
                </div>

                {renderPhoneVerificationField('reschedule')}

                <div className="pt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsRescheduleModalOpen(false)}
                    className="h-10 px-4 rounded-xl text-xs font-bold"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading}
                    className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Jadwal Baru'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCancelModalOpen && booking && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-black text-lg text-rose-600 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>Batalkan Jadwal Servis</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {booking.jadwal_mulai && (new Date(booking.jadwal_mulai).getTime() - Date.now()) < 24 * 3600 * 1000 && (
                <div className="p-3.5 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                  <p className="font-bold mb-1 flex items-center gap-1.5 text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    Ketentuan Pembatalan Servis (Minimal 24 Jam)
                  </p>
                  <p>
                    Jadwal kunjungan Anda tersisa <strong>kurang dari 24 jam</strong>. Pembatalan mandiri dinonaktifkan. Silakan hubungi admin melalui WhatsApp untuk koordinasi darurat.
                  </p>
                </div>
              )}

              <form onSubmit={handleConfirmCancel} className="space-y-4 text-xs">
                {renderPhoneVerificationField('cancel')}

                <div>
                  <label htmlFor="cancel-reason" className="font-bold text-slate-700 block mb-1">Alasan Pembatalan (Opsional)</label>
                  <textarea
                    id="cancel-reason"
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Contoh: Ada keperluan mendadak..."
                    className="w-full rounded-xl border border-slate-200 p-2.5 text-xs bg-slate-50 focus:bg-white resize-y"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCancelModalOpen(false)}
                    className="h-10 px-4 rounded-xl text-xs font-bold"
                  >
                    Kembali
                  </Button>
                  <Button
                    type="submit"
                    disabled={actionLoading || (booking.jadwal_mulai && (new Date(booking.jadwal_mulai).getTime() - Date.now()) < 24 * 3600 * 1000)}
                    className="h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Ya, Batalkan Jadwal'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isClaimModalOpen && booking && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 my-auto"
            >
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <span>Pengajuan Klaim Garansi Resmi</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {claimModalError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{claimModalError}</span>
                  </div>
                )}

                {renderPhoneVerificationField('claim')}

                {!hasQualifyingReview ? (
                  <form onSubmit={handleSubmitStepReviewForClaim} className="space-y-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                        Langkah 1 dari 2 · Ulasan Wajib
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1.5">
                        Berikan Ulasan untuk Layanan Ini Terlebih Dahulu
                      </h4>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">
                        Sesuai ketentuan garansi NARA AC, pelanggan wajib memberikan penilaian dan komentar ulasan atas layanan yang telah selesai sebelum formulir klaim garansi dibuka.
                      </p>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1.5">Rating Kepuasan Servis *</label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setClaimRating(star)}
                            className="p-1 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star
                              className={cn(
                                'w-5 h-5',
                                star <= claimRating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'
                              )}
                            />
                          </button>
                        ))}
                        <span className="font-bold text-slate-700 ml-2">{claimRating} / 5 Bintang</span>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="claim-step1-review" className="font-bold text-slate-700 block mb-1">
                        Komentar Ulasan Servis (Minimal 3 Karakter) *
                      </label>
                      <textarea
                        id="claim-step1-review"
                        rows={2}
                        value={claimReview}
                        onChange={(e) => setClaimReview(e.target.value)}
                        placeholder="Tuliskan pengalaman servis Anda untuk tiket ini..."
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsClaimModalOpen(false)}
                        className="h-9 px-4 rounded-xl text-xs font-bold"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmittingReviewFirst}
                        className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                      >
                        {isSubmittingReviewFirst ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                        Simpan Ulasan &amp; Lanjut Klaim &rarr;
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmClaim} className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-emerald-900">
                            Ulasan Layanan Terverifikasi ({existingFeedback?.rating || 5}/5 Bintang)
                          </div>
                          {existingFeedback?.komentar && (
                            <p className="text-[11px] text-emerald-800 italic mt-0.5">
                              &ldquo;{existingFeedback.komentar}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-white text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0">
                        Tanpa Review Ulang
                      </span>
                    </div>

                    <div>
                      <label htmlFor="claim-keluhan" className="font-bold text-slate-700 block mb-1">
                        Detail Keluhan / Masalah AC Pasca-Servis (Minimal 5 Karakter) *
                      </label>
                      <textarea
                        id="claim-keluhan"
                        value={claimKeluhan}
                        onChange={(e) => setClaimKeluhan(e.target.value)}
                        placeholder="Contoh: Unit AC indoor di kamar utama kembali meneteskan air setelah 3 hari servis..."
                        className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-slate-50 focus:bg-white resize-y"
                        rows={3}
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="claim-photo-upload" className="font-bold text-slate-700 block mb-1">
                        Foto Bukti Kondisi AC (Opsional — JPG/PNG/WEBP Maks 5 MB)
                      </label>
                      <input
                        id="claim-photo-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleClaimPhotoChange}
                        className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                      {claimPhotoPreview && (
                        <div className="mt-2 relative inline-block">
                          <img
                            src={claimPhotoPreview}
                            alt="Pratinjau foto bukti klaim"
                            className="h-24 w-auto rounded-xl border border-slate-200 object-contain bg-slate-900"
                          />
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsClaimModalOpen(false)}
                        className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Batal
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmittingClaim}
                        className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSubmittingClaim ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                        <span>Kirim Pengajuan Klaim</span>
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isProofModalOpen && booking && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 my-auto"
            >
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-600" />
                  <span>Unggah Foto Bukti Pembayaran</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsProofModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmProof} className="space-y-4 text-xs">
                {proofError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{proofError}</span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 space-y-1">
                  <p className="font-bold text-blue-900">Rekening Resmi CV. Nara Teknindotama:</p>
                  <p className="text-slate-700 font-mono text-[11px]">
                    • <strong>BCA:</strong> 8720-9182-33 a.n CV NARA TEKNINDOTAMA<br />
                    • <strong>Mandiri:</strong> 137-00-9821-4451 a.n CV NARA TEKNINDOTAMA
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pembayaran akan berstatus <strong>Menunggu Verifikasi</strong> hingga diperiksa secara manual oleh Admin.
                  </p>
                </div>

                <div>
                  <label htmlFor="proof-file-input" className="font-bold text-slate-700 block mb-1.5">
                    Pilih Foto / Tangkapan Layar Bukti Transfer (JPG, PNG, WEBP — Maks 5 MB) *
                  </label>
                  <label
                    htmlFor="proof-file-input"
                    className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-2xl bg-slate-50 hover:bg-blue-50/30 transition-colors cursor-pointer"
                  >
                    {proofPreviewUrl ? (
                      <div className="space-y-2 text-center">
                        <img
                          src={proofPreviewUrl}
                          alt="Pratinjau Bukti Pembayaran"
                          className="max-h-44 w-auto mx-auto rounded-xl object-contain border border-slate-200 bg-white"
                        />
                        <span className="text-[11px] font-bold text-blue-600 block">
                          {proofFile?.name} ({Math.round((proofFile?.size || 0) / 1024)} KB) — Klik untuk mengganti foto
                        </span>
                      </div>
                    ) : (
                      <div className="text-center space-y-1.5 py-2">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                          <Camera className="w-5 h-5" />
                        </div>
                        <div className="font-bold text-slate-800">Klik untuk memilih foto struk / bukti m-banking</div>
                        <div className="text-[11px] text-slate-500">Mendukung JPG, PNG, WEBP hingga 5 MB</div>
                      </div>
                    )}
                    <input
                      id="proof-file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleProofFileChange}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div>
                  <label htmlFor="proof-url" className="font-bold text-slate-600 block mb-1">
                    Atau Tautan Referensi Bukti (Opsional jika sudah unggah foto)
                  </label>
                  <Input
                    id="proof-url"
                    type="url"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-10 text-xs font-mono"
                  />
                </div>

                <div>
                  <label htmlFor="proof-nominal" className="font-bold text-slate-700 block mb-1">
                    Nominal Transfer (Rp) *
                  </label>
                  <Input
                    id="proof-nominal"
                    type="number"
                    min="1"
                    value={proofNominal}
                    onChange={(e) => setProofNominal(e.target.value)}
                    placeholder="Contoh: 75000"
                    className="h-10 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="proof-catatan" className="font-bold text-slate-700 block mb-1">
                    Catatan Pengirim (Opsional)
                  </label>
                  <Input
                    id="proof-catatan"
                    type="text"
                    value={proofCatatan}
                    onChange={(e) => setProofCatatan(e.target.value)}
                    placeholder="Contoh: Transfer via BCA a.n Budi"
                    className="h-10 text-xs"
                  />
                </div>

                {renderPhoneVerificationField('proof')}

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsProofModalOpen(false)}
                    disabled={isSubmittingProof}
                    className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingProof}
                    className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSubmittingProof ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{isSubmittingProof ? 'Mengunggah Bukti...' : 'Kirim Bukti Pembayaran'}</span>
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSchemeModalOpen && booking && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                  <span>Pilih Skema Pembayaran</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsSchemeModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleConfirmScheme} className="space-y-4 text-xs">
                <div>
                  <label htmlFor="scheme-select" className="font-bold text-slate-700 block mb-1">
                    Skema Tagihan
                  </label>
                  <select
                    id="scheme-select"
                    value={selectedScheme}
                    onChange={(e) => setSelectedScheme(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-semibold text-slate-800"
                  >
                    <option value="pay_after_service">Bayar Setelah Selesai Pengerjaan</option>
                    <option value="dp_50">Uang Muka (DP 50% di Awal)</option>
                    <option value="full_upfront">Bayar Lunas 100% di Awal</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="method-select" className="font-bold text-slate-700 block mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    id="method-select"
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-2.5 text-xs bg-white font-semibold text-slate-800"
                  >
                    <option value="transfer">Transfer Bank (Wajib Bukti &amp; Verifikasi)</option>
                    <option value="qris">QRIS Resmi NARA AC</option>
                    <option value="cash">Tunai Langsung ke Teknisi</option>
                  </select>
                </div>

                {renderPhoneVerificationField('scheme')}

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsSchemeModalOpen(false)}
                    className="h-10 px-4 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingScheme}
                    className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSubmittingScheme ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Simpan Pilihan'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="bg-white border-t border-slate-200/80 py-6 text-xs text-slate-500 mt-auto print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>{COPYRIGHT_TEXT}</p>
          <div className="flex items-center gap-3 font-medium">
            <Link to="/terms-conditions" className="hover:text-blue-600 transition-colors">
              Syarat &amp; Ketentuan
            </Link>
            <span className="text-slate-300">&bull;</span>
            <Link to="/privacy-policy" className="hover:text-blue-600 transition-colors">
              Kebijakan Privasi
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

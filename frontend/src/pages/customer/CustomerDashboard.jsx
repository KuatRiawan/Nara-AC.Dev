import { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../../AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Wrench,
  FileText,
  CheckCircle2,
  Bell,
  CalendarCheck,
  Plus,
  Wind,
  Sparkles,
  ShieldCheck,
  Copy,
  Check,
  Clock,
  UserCheck,
  MessageCircle,
  ChevronRight,
  MapPin,
  X,
  AlertCircle,
  Settings
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import api from '../../api';
import { useToast } from '../../components/ui/toast';
import { useBusinessProfile, buildWhatsAppUrl } from '../../hooks/useBusinessProfile';

export default function CustomerDashboard() {
  const { user } = useContext(AuthContext);
  const { error: showError, success: showSuccess } = useToast();
  const { whatsappNumber } = useBusinessProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const prevUnreadRef = useRef(null);
  const showNotifModalRef = useRef(showNotifModal);

  useEffect(() => {
    showNotifModalRef.current = showNotifModal;
  }, [showNotifModal]);

  const fetchNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoadingNotifs(true);
    try {
      const res = await api.get('/customer/notifications?limit=10&page=1');
      setNotifications(Array.isArray(res?.data) ? res.data : (res?.data?.data || (Array.isArray(res) ? res : [])));
    } catch (err) {
      if (!isSilent) {
        showError('Gagal memuat notifikasi: ' + (err.response?.data?.error?.message || err.message));
      }
    } finally {
      if (!isSilent) setLoadingNotifs(false);
    }
  }, [showError]);

  const fetchDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await api.get('/customer/dashboard');
      const payload = res.data?.data || res.data || res;
      setData(payload);
      const newUnread = payload?.unread_notifications || 0;
      if (prevUnreadRef.current !== null && newUnread > prevUnreadRef.current) {
        showSuccess('Notifikasi Baru: Ada booking atau pembaruan status baru diterima!');
      }
      prevUnreadRef.current = newUnread;
      if (showNotifModalRef.current) {
        fetchNotifications(true);
      }
    } catch (err) {
      if (!isSilent) {
        showError('Gagal memuat dashboard: ' + (err.response?.data?.error?.message || err.message));
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [showError, showSuccess, fetchNotifications]);

  useEffect(() => {
    fetchDashboardData(false);
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 5000);

    const handleSync = () => {
      fetchDashboardData(true);
    };

    window.addEventListener('focus', handleSync);
    window.addEventListener('nara-booking-created', handleSync);
    window.addEventListener('nara-booking-updated', handleSync);
    window.addEventListener('nara-notification-updated', handleSync);
    const handleStorage = (e) => {
      if (e.key === 'nara_booking_sync_timestamp' || e.key === 'nara_notification_sync') {
        handleSync();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('nara-booking-created', handleSync);
      window.removeEventListener('nara-booking-updated', handleSync);
      window.removeEventListener('nara-notification-updated', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [fetchDashboardData]);

  useEffect(() => {
    const handleOpenNotif = () => {
      setShowNotifModal(true);
      fetchNotifications(false);
    };
    window.addEventListener('nara-open-customer-notifs', handleOpenNotif);

    if (location.search.includes('notif=') || location.search.includes('modal=notif')) {
      handleOpenNotif();
    }

    return () => {
      window.removeEventListener('nara-open-customer-notifs', handleOpenNotif);
    };
  }, [location.search, fetchNotifications]);

  const handleOpenNotifications = () => {
    setShowNotifModal(true);
    fetchNotifications(false);
  };

  const handleMarkSingleRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.patch(`/customer/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setData((prev) => (prev ? { ...prev, unread_notifications: Math.max(0, (prev.unread_notifications || 1) - 1) } : prev));
    } catch (err) {
      showError('Gagal menandai notifikasi: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleCustomerNotificationClick = (item) => {
    if (!item.is_read) {
      handleMarkSingleRead(item.id);
    }
    let target = item.tautan;
    const bId = item.booking_id || item.reference_id;
    if (!target && bId) {
      target = `/status/${item.kode_booking || bId}`;
    }
    if (!target) {
      const match = (item.message + ' ' + item.title).match(/\b(AC-[A-Z0-9]+|NARA-AC-[A-Z0-9]+)\b/i);
      if (match) target = `/status/${match[1]}`;
    }
    if (target) {
      setShowNotifModal(false);
      navigate(target);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/customer/notifications/read-all', {});
      showSuccess('Semua notifikasi ditandai sudah dibaca');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setData((prev) => (prev ? { ...prev, unread_notifications: 0 } : prev));
    } catch (err) {
      showError('Gagal memperbarui notifikasi: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    showSuccess('Kode booking disalin ke clipboard');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const formatIndonesianDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return (
        date.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) + ' WIB'
      );
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-44 bg-slate-200/80 rounded-3xl" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200/60" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-7">
          <div className="lg:col-span-4 h-64 bg-white rounded-2xl border border-slate-200/60" />
          <div className="lg:col-span-3 h-64 bg-white rounded-2xl border border-slate-200/60" />
        </div>
      </div>
    );
  }

  const activeBooking = data?.active_bookings?.[0];

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'on process':
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sedang Dikerjakan
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-800 border border-sky-300">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            Dijadwalkan
          </span>
        );
      case 'rescheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Jadwal Ulang
          </span>
        );
      case 'delayed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-800 border border-rose-300">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Tertunda
          </span>
        );
      default:
        return (
          <Badge variant="info" className="font-bold text-xs uppercase">
            {status || 'AKTIF'}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-sky-600 text-white shadow-xl shadow-blue-600/15 border border-blue-500/40 p-6 sm:p-8">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-sky-300/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/15 text-white border border-white/25 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                MEMBER RESMI NARA AC
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/15 text-sky-50 border border-white/20">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                ID: #MBR-{String(user?.id || 1).padStart(4, '0')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/25 text-emerald-100 border border-emerald-300/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                Diskon Jasa 10% Aktif
              </span>
              <button
                onClick={() => navigate('/customer/settings')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-colors cursor-pointer"
                title="Kelola Profil & Pengaturan Akun"
              >
                <Settings className="w-3.5 h-3.5 text-sky-200" />
                <span>Pengaturan Akun</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Halo, {user?.nama || user?.name || 'Pelanggan Setia'}
            </h1>

            <p className="text-sm sm:text-base text-blue-50 leading-relaxed">
              Selamat datang di portal servis resmi CV. Nara Teknindotama. Nikmati <strong className="text-white font-bold">diskon member 10% untuk seluruh biaya jasa</strong>, jaminan <strong className="text-white font-bold">garansi pengerjaan 14/30/45 hari</strong>, serta pemantauan unit AC berkala Anda.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-sky-100 pt-1">
              <span>WhatsApp: <strong className="text-white">{user?.kontak || '0813-8529-3137'}</strong></span>
              <span>&bull;</span>
              <span>Email: <strong className="text-white">{user?.email}</strong></span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <Button
              onClick={() => navigate('/booking')}
              className="bg-white hover:bg-sky-50 text-blue-700 font-black rounded-2xl h-12 px-6 shadow-lg cursor-pointer flex items-center justify-center gap-2 text-sm transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Booking Service (Diskon 10%)</span>
            </Button>
            <Button
              onClick={() => navigate('/customer/ac-units')}
              variant="outline"
              className="bg-white/15 hover:bg-white/25 text-white border-white/30 font-bold rounded-2xl h-11 px-5 cursor-pointer flex items-center justify-center gap-2 text-xs backdrop-blur-sm transition-all"
            >
              <Wind className="w-4 h-4 text-sky-200" />
              <span>Daftarkan Unit AC Baru</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          onClick={() => navigate('/customer/history')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Servis</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
              {data?.history_count || 0}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <span>Servis selesai</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          onClick={() => navigate('/customer/ac-units')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Unit AC</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wind className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">
              {data?.ac_units_count || 0}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <span>Unit terdaftar</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          onClick={handleOpenNotifications}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-amber-200 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Notifikasi</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center relative">
              <Bell className="w-5 h-5" />
              {(data?.unread_notifications || 0) > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </div>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-black text-amber-700">
              {data?.unread_notifications || 0}
            </p>
            <p className="text-xs text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
              <span>Belum dibaca</span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          onClick={() => navigate('/booking')}
          className="bg-gradient-to-br from-blue-50 to-sky-50/70 p-5 rounded-2xl border border-blue-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Benefit Member</span>
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-black text-blue-900">10% OFF</p>
            <p className="text-xs text-blue-700 font-medium mt-0.5 flex items-center gap-1">
              <span>Diskon jasa otomatis</span>
              <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
            </p>
          </div>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 rounded-3xl border-slate-200/80 shadow-xs overflow-hidden bg-white">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 text-sm tracking-tight">Jadwal Servis Aktif &amp; Mendatang</h2>
              </div>
            </div>
            {activeBooking && (
              <span className="text-xs text-slate-500 font-medium">
                {data?.active_bookings?.length || 1} Servis Aktif
              </span>
            )}
          </div>

          <CardContent className="p-6">
            {activeBooking ? (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-sky-50/80 to-blue-50/40 border border-sky-100">
                  <div>
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Layanan Terpilih</span>
                    <h3 className="font-black text-lg sm:text-xl text-slate-900">
                      {activeBooking.nama_layanan || activeBooking.layanan?.nama_layanan || 'Service AC'}
                    </h3>
                  </div>
                  <div>{getStatusBadge(activeBooking.status)}</div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-slate-500 shrink-0">Kode Booking:</span>
                    <code className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 truncate max-w-[200px] sm:max-w-xs">
                      {activeBooking.kode_booking}
                    </code>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyCode(activeBooking.kode_booking)}
                    className="h-8 px-2.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Kode</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold uppercase tracking-wider">Jadwal Servis</span>
                    </div>
                    <p className="font-bold text-slate-800 text-xs sm:text-sm mt-0.5">
                      {formatIndonesianDate(activeBooking.jadwal_mulai)}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                      <UserCheck className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold uppercase tracking-wider">Teknisi Bertugas</span>
                    </div>
                    {activeBooking.teknisi_nama ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                          {activeBooking.teknisi_nama.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs sm:text-sm">{activeBooking.teknisi_nama}</p>
                          <span className="text-[10px] text-emerald-600 font-semibold">Teknisi Bersertifikat Nara</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-slate-700 text-xs">Sedang Diproses Dispatcher</p>
                        <p className="text-[10px] text-slate-500">Teknisi segera dialokasikan</p>
                      </div>
                    )}
                  </div>

                  {activeBooking.alamat && (
                    <div className="col-span-1 sm:col-span-2 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center gap-2 text-slate-500 mb-1">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold uppercase tracking-wider">Lokasi Pengerjaan</span>
                      </div>
                      <p className="text-xs text-slate-700 line-clamp-2">{activeBooking.alamat}</p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/status/${activeBooking.kode_booking}`)}
                    className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    <span>Lihat E-Invoice</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => navigate(`/status/${activeBooking.kode_booking}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5 px-4"
                  >
                    <span>Lacak Status Real-Time</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-2xs">
                  <CalendarCheck className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-slate-900">Belum Ada Jadwal Servis Aktif</h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
                  AC Anda sudah mulai kurang dingin atau berdebu? Jadwalkan perawatan rutin sekarang dan nikmati potongan diskon member 10%.
                </p>
                <Button
                  onClick={() => navigate('/booking')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs h-10 px-5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>Jadwalkan Servis Sekarang</span>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          <Card className="rounded-3xl border-slate-200/80 shadow-xs overflow-hidden bg-white">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-100/80 text-sky-700 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <h2 className="font-black text-slate-900 text-sm tracking-tight">Akses Cepat &amp; Layanan</h2>
            </div>
            <CardContent className="p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigate('/customer/ac-units')}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50/80 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-200 transition-all cursor-pointer group text-center"
                >
                  <div className="w-11 h-11 rounded-2xl bg-white text-blue-600 flex items-center justify-center mb-2 shadow-2xs border border-slate-100">
                    <Wind className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-slate-900 text-xs">Unit AC Saya</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Kelola &amp; pantau PK</p>
                </button>

                <button
                  onClick={() => navigate('/customer/history')}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50/80 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-200 transition-all cursor-pointer group text-center"
                >
                  <div className="w-11 h-11 rounded-2xl bg-white text-blue-600 flex items-center justify-center mb-2 shadow-2xs border border-slate-100">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-slate-900 text-xs">Riwayat Servis</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Faktur &amp; garansi</p>
                </button>

                <button
                  onClick={() => navigate('/customer/settings')}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50/80 hover:bg-blue-50 border border-slate-200/70 hover:border-blue-200 transition-all cursor-pointer group text-center"
                >
                  <div className="w-11 h-11 rounded-2xl bg-white text-blue-600 flex items-center justify-center mb-2 shadow-2xs border border-slate-100">
                    <Settings className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-slate-900 text-xs">Pengaturan Akun</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Profil, sandi &amp; WA</p>
                </button>

                <button
                  onClick={() => setShowWarrantyModal(true)}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50/80 hover:bg-emerald-50 border border-slate-200/70 hover:border-emerald-200 transition-all cursor-pointer group text-center"
                >
                  <div className="w-11 h-11 rounded-2xl bg-white text-emerald-600 flex items-center justify-center mb-2 shadow-2xs border border-slate-100">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-slate-900 text-xs">Klaim Garansi</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">14 / 30 / 45 Hari</p>
                </button>
              </div>

              <a
                href={buildWhatsAppUrl(whatsappNumber, 'Halo Admin NARA AC, saya member ingin konsultasi mengenai servis AC')}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-between p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/80 text-emerald-900 transition-colors cursor-pointer group text-xs font-bold"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">Bantuan CS &amp; Konsultasi WhatsApp</p>
                    <p className="text-[10px] text-slate-500 font-medium">Respon cepat teknisi resmi NARA AC</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-600" />
              </a>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-slate-200/80 shadow-xs overflow-hidden bg-gradient-to-br from-slate-50 to-sky-50/50">
            <CardContent className="p-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Wind className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                    {data?.ac_units_count === 0 ? 'Daftarkan AC Anda Sekarang' : 'Pemeliharaan AC Terpantau'}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {data?.ac_units_count === 0
                      ? 'Daftarkan unit AC rumah/kantor untuk mendapatkan jadwal cuci otomatis setiap 3 bulan via WhatsApp.'
                      : `${data?.ac_units_count} unit AC Anda terdata rapi di sistem untuk riwayat servis & klaim garansi yang mudah.`}
                  </p>
                  <div className="pt-2">
                    <Button
                      variant="link"
                      onClick={() => navigate('/customer/ac-units')}
                      className="p-0 h-auto text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{data?.ac_units_count === 0 ? 'Daftar Unit AC Sekarang' : 'Kelola Unit AC Anda'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {showNotifModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">Notifikasi &amp; Pengingat</h3>
                    <p className="text-xs text-slate-500">Update status servis &amp; info akun</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotifModal(false)}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
                {loadingNotifs ? (
                  <div className="py-8 text-center text-xs text-slate-500">Memuat notifikasi...</div>
                ) : notifications.length === 0 ? (
                  <div className="py-8 text-center">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">Tidak ada notifikasi baru</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Semua info dan update servis sudah terpantau.</p>
                  </div>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleCustomerNotificationClick(item)}
                      className={cn(
                        'p-3.5 rounded-2xl border text-xs transition-all cursor-pointer',
                        item.is_read
                          ? 'bg-slate-50/60 border-slate-200/60 text-slate-600 hover:bg-slate-100/80 hover:border-slate-300'
                          : 'bg-blue-50/60 border-blue-200 text-slate-800 font-medium hover:bg-blue-100/60 hover:border-blue-300 shadow-2xs'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-black text-slate-900 text-xs">{item.title}</h4>
                        {!item.is_read ? (
                          <button
                            type="button"
                            onClick={(e) => handleMarkSingleRead(item.id, e)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-100/80 hover:bg-blue-200/80 px-2 py-0.5 rounded-full transition-colors cursor-pointer shrink-0"
                            title="Tandai sudah dibaca"
                          >
                            <Check className="w-3 h-3" />
                            <span>Tandai dibaca</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Sudah dibaca</span>
                        )}
                      </div>
                      <p className="text-slate-600 text-xs mt-1 leading-relaxed">{item.message}</p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : ''}</span>
                        <span className="font-semibold text-blue-600 flex items-center gap-0.5 hover:underline">
                          Buka detail →
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={loadingNotifs || notifications.length === 0}
                  className="text-xs text-slate-600 hover:text-slate-900 cursor-pointer font-bold"
                >
                  Tandai Semua Dibaca
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowNotifModal(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold px-4 cursor-pointer"
                >
                  Tutup
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWarrantyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">Garansi Servis Resmi (14 / 30 / 45 Hari)</h3>
                    <p className="text-xs text-slate-500">Jaminan kualitas CV. Nara Teknindotama</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWarrantyModal(false)}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs text-slate-600">
                <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900 leading-relaxed font-medium">
                  Setiap pekerjaan servis oleh teknisi NARA AC dilindungi garansi resmi (<strong>14 hari</strong> Cuci Standar, <strong>30 hari</strong> Cuci Core, <strong>45 hari</strong> Core + Freon) terhitung sejak servis selesai.
                </div>

                <div className="space-y-2">
                  <p className="font-bold text-slate-900">Cara Klaim Garansi Online:</p>
                  <ul className="space-y-1.5 list-disc pl-4 text-slate-600">
                    <li>Buka menu <strong>Riwayat Servis</strong> lalu pilih pesanan yang telah selesai.</li>
                    <li>Klik tombol <strong>Klaim Garansi</strong> (ulasan yang sudah pernah dikirim otomatis dikenali tanpa perlu mengisi ulang).</li>
                    <li>Teknisi akan dijadwalkan untuk kunjungan pemeriksaan gratis (Rp 0).</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWarrantyModal(false)}
                  className="rounded-xl text-xs font-bold cursor-pointer"
                >
                  Tutup
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowWarrantyModal(false);
                    navigate('/customer/history');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold px-4 cursor-pointer"
                >
                  Buka Riwayat &amp; Klaim Online
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

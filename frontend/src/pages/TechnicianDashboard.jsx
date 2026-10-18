import { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  MapPin, Clock, ArrowRight, User, 
  CheckCircle, History, ClipboardList, ChevronRight,
  Phone, Search, ShieldCheck, Bell, CheckCheck, Wrench, Calendar
} from 'lucide-react';
import { useToast } from '../components/ui/toast';
import { cn } from '../lib/utils';
import DashboardLayout from '../components/layout/DashboardLayout';
import NotificationDrawer from '../components/notifications/NotificationDrawer';

export default function TechnicianDashboard() {
  const { user, loading: authLoading, logout } = useContext(AuthContext);
  const { error: showError } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const handleOpenNotif = useCallback(() => setIsNotifOpen(true), []);
  const handleCloseNotif = useCallback(() => setIsNotifOpen(false), []);
  const [notifFilter, setNotifFilter] = useState('all');
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isMountedRef.current) return;
    try {
      if (!isSilent) setLoading(true);
      else setIsRefreshing(true);

      const [dashRes, jobsRes, notifsRes] = await Promise.all([
        api.get('/technician/dashboard').catch(() => null),
        api.get('/technician/jobs', { params: { limit: 100 } }).catch(() => null),
        api.get('/technician/notifications', { params: { limit: 50 } }).catch(() => null)
      ]);

      if (!isMountedRef.current) return;

      const dData = dashRes?.data || dashRes || null;
      if (dData) {
        setDashboardData(dData);
      }

      if (notifsRes?.data) {
        const notifList = notifsRes.data.data || [];
        setNotifications(Array.isArray(notifList) ? notifList : []);
        setUnreadNotifs(notifsRes.data.meta?.unread_count ?? notifList.filter(n => !n.is_read).length);
      }

      const rawJobs = jobsRes?.data?.data || jobsRes?.data || jobsRes || [];
      const jobList = Array.isArray(rawJobs) ? rawJobs : [];

      const existingIds = new Set(jobList.map(j => j.id));
      const merged = [...jobList];

      if (dData?.pekerjaan_hari_ini && Array.isArray(dData.pekerjaan_hari_ini)) {
        dData.pekerjaan_hari_ini.forEach(j => {
          if (!existingIds.has(j.id)) {
            merged.unshift(j);
            existingIds.add(j.id);
          }
        });
      }

      if (dData?.pekerjaan_mendatang && Array.isArray(dData.pekerjaan_mendatang)) {
        dData.pekerjaan_mendatang.forEach(j => {
          if (!existingIds.has(j.id)) {
            merged.push(j);
            existingIds.add(j.id);
          }
        });
      }

      setJobs(merged);
    } catch (err) {
      if (!isSilent) {
        showError('Gagal memuat pekerjaan: ' + (err.response?.data?.error?.message || err.message));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [showError]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'technician') {
      navigate('/login');
      return;
    }

    fetchData(false);

    // Fast 4-second real-time sync in background
    const interval = setInterval(() => {
      fetchData(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [user, authLoading, navigate, fetchData]);

  useEffect(() => {
    const handleSync = () => {
      fetchData(true);
    };
    const handleStorage = (e) => {
      if (e.key === 'nara_booking_sync_timestamp' || e.key === 'nara_ops_updated') {
        fetchData(true);
      }
    };
    const handleFocus = () => {
      fetchData(true);
    };
    const handleVisibility = () => {
      if (!document.hidden) {
        fetchData(true);
      }
    };

    window.addEventListener('nara-booking-updated', handleSync);
    window.addEventListener('nara-technician-sync', handleSync);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('nara-booking-updated', handleSync);
      window.removeEventListener('nara-technician-sync', handleSync);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchData]);

  const todayJobs = useMemo(() => {
    if (dashboardData?.pekerjaan_hari_ini && Array.isArray(dashboardData.pekerjaan_hari_ini)) {
      return dashboardData.pekerjaan_hari_ini;
    }
    return jobs.filter(job => {
      if (!job.jadwal_mulai) return false;
      const jobDate = new Date(job.jadwal_mulai).toDateString();
      const today = new Date().toDateString();
      return jobDate === today;
    });
  }, [dashboardData, jobs]);

  const upcomingJobs = useMemo(() => {
    if (dashboardData?.pekerjaan_mendatang && Array.isArray(dashboardData.pekerjaan_mendatang)) {
      return dashboardData.pekerjaan_mendatang;
    }
    return jobs.filter(job => {
      if (!job.jadwal_mulai) return false;
      const jobDate = new Date(job.jadwal_mulai).getTime();
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      return jobDate > todayEnd.getTime();
    });
  }, [dashboardData, jobs]);

  const completedJobs = useMemo(() => {
    return jobs.filter(job => job.status?.toLowerCase() === 'done');
  }, [jobs]);

  const inProgressJobs = useMemo(() => {
    return jobs.filter(job => job.status?.toLowerCase() === 'on process');
  }, [jobs]);

  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'scheduled': 
        return <Badge className="bg-amber-100 text-amber-800 font-bold border-amber-200">TERJADWAL</Badge>;
      case 'on process': 
        return <Badge className="bg-blue-100 text-blue-800 font-bold border-blue-200 animate-pulse">DIPROSES</Badge>;
      case 'done': 
        return <Badge className="bg-emerald-100 text-emerald-800 font-bold border-emerald-200">SELESAI</Badge>;
      default: 
        return <Badge className="bg-slate-100 text-slate-800 font-bold border-slate-200">{(status || '').toUpperCase()}</Badge>;
    }
  };

  const renderJobCard = (job) => (
    <Card key={job.id} className="shadow-sm hover:shadow-md border border-slate-100 rounded-2xl overflow-hidden transition-all bg-white">
      <div className="p-4 sm:p-6 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {getStatusBadge(job.status)}
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
              {job.kode_booking}
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {job.jadwal_mulai ? new Date(job.jadwal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-'}
          </span>
        </div>

        <h3 className="font-bold text-lg text-slate-900 mb-1">{job.nama_layanan || 'Servis AC'}</h3>

        <div className="mt-3 space-y-2 text-sm text-slate-600 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100/80">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="font-semibold text-slate-900">{job.nama_customer || job.nama || 'Pelanggan'}</span>
            {(job.kontak_customer || job.telepon) && (
              <a 
                href={`tel:${job.kontak_customer || job.telepon}`} 
                className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline"
                onClick={e => e.stopPropagation()}
              >
                <Phone className="w-3.5 h-3.5" /> Hubungi
              </a>
            )}
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2 text-xs sm:text-sm text-slate-600">{job.alamat || 'Alamat tidak dicantumkan'}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {job.jadwal_mulai ? new Date(job.jadwal_mulai).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) : ''}
          </div>
          <Link 
            to={`/technician/jobs/${job.id}`} 
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-sm transition-all"
          >
            {['scheduled', 'rescheduled', 'delayed'].includes(job.status) ? 'Mulai Kerja' : job.status === 'on process' ? 'Lanjutkan' : 'Detail'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </Card>
  );

  const currentPath = location.pathname.replace(/\/$/, '');

  const renderContent = () => {
    if (currentPath === '/technician/jobs') {
      const filteredJobs = jobs.filter(job => {
        const matchesStatus = statusFilter === 'all' || job.status?.toLowerCase() === statusFilter.toLowerCase();
        const matchesSearch = !searchQuery || 
          job.kode_booking?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.nama_customer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.nama_layanan?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.alamat?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      });

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Semua Tugas</h2>
              <p className="text-xs sm:text-sm text-slate-500">Kelola dan update status tiket pekerjaan Anda</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari kode, nama, alamat..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'Semua', count: jobs.length },
              { id: 'scheduled', label: 'Terjadwal', count: jobs.filter(j => j.status?.toLowerCase() === 'scheduled').length },
              { id: 'on process', label: 'Diproses', count: inProgressJobs.length },
              { id: 'done', label: 'Selesai', count: completedJobs.length }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border",
                  statusFilter === f.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          {filteredJobs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-100">
              <ClipboardList className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Tidak ada pekerjaan yang cocok</p>
              <p className="text-xs text-slate-500 mt-1">Coba ganti filter atau kata kunci pencarian</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredJobs.map(renderJobCard)}
            </div>
          )}
        </div>
      );
    }

    if (currentPath === '/technician/schedule') {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Jadwal Tugas</h2>
            <p className="text-xs sm:text-sm text-slate-500">Daftar agenda pekerjaan servis AC Anda</p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Hari Ini
              </h3>
              {todayJobs.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-2xl border border-slate-100 text-sm text-slate-500">
                  Tidak ada jadwal pekerjaan untuk hari ini.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {todayJobs.map(renderJobCard)}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Mendatang
              </h3>
              {upcomingJobs.length === 0 ? (
                <div className="p-6 text-center bg-white rounded-2xl border border-slate-100 text-sm text-slate-500">
                  Tidak ada jadwal mendatang yang tercatat.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingJobs.map(renderJobCard)}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (currentPath === '/technician/history') {
      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Riwayat Pekerjaan Selesai</h2>
            <p className="text-xs sm:text-sm text-slate-500">Daftar servis yang telah berhasil dikerjakan</p>
          </div>

          {completedJobs.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-100">
              <History className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Belum ada riwayat pekerjaan selesai</p>
              <p className="text-xs text-slate-500 mt-1">Selesaikan tiket pekerjaan untuk melihat rekap riwayat di sini</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {completedJobs.map(renderJobCard)}
            </div>
          )}
        </div>
      );
    }

    if (currentPath === '/technician/profile') {
      return (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-blue-500/20">
                {(user.nama || 'T').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{user.nama || 'Teknisi NARA'}</h2>
                <Badge className="bg-blue-100 text-blue-700 font-bold border-blue-200 mt-1">Teknisi Lapangan</Badge>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Email Akun</span>
                <span className="font-semibold text-slate-900">{user.email || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Total Pekerjaan</span>
                <span className="font-semibold text-slate-900">{jobs.length} Tugas</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-50">
                <span className="text-slate-500 font-medium">Tugas Selesai</span>
                <span className="font-semibold text-emerald-600">{completedJobs.length} Tiket</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500 font-medium">Status Akun</span>
                <span className="font-semibold text-blue-600 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Aktif
                </span>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100">
              <button
                onClick={logout}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold py-3 px-4 rounded-xl transition-colors text-sm"
              >
                Keluar dari Akun
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (currentPath === '/technician/notifications') {
      const filteredNotifs = notifFilter === 'unread' 
        ? notifications.filter(n => !n.is_read)
        : notifications;

      return (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Pusat Notifikasi
                {unreadNotifs > 0 && (
                  <span className="bg-rose-50 text-rose-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-rose-200">
                    {unreadNotifs} Baru
                  </span>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">Pemberitahuan penugasan tiket dan jadwal servis terbaru</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllRead}
                disabled={unreadNotifs === 0 || markingAllRead}
                className={cn(
                  "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                  unreadNotifs > 0
                    ? "bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 shadow-2xs cursor-pointer"
                    : "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                )}
              >
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                <span>{markingAllRead ? 'Memproses...' : 'Tandai Semua Dibaca'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
            <button
              onClick={() => setNotifFilter('all')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                notifFilter === 'all'
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              Semua ({notifications.length})
            </button>
            <button
              onClick={() => setNotifFilter('unread')}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                notifFilter === 'unread'
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              )}
            >
              Belum Dibaca
              {unreadNotifs > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-black",
                  notifFilter === 'unread' ? "bg-white text-blue-700" : "bg-rose-600 text-white"
                )}>
                  {unreadNotifs}
                </span>
              )}
            </button>
          </div>

          {filteredNotifs.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-bold text-base text-slate-800">
                {notifFilter === 'unread' ? 'Tidak Ada Notifikasi Baru' : 'Belum Ada Notifikasi'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {notifFilter === 'unread'
                  ? 'Semua notifikasi penugasan tiket dan sistem telah Anda baca.'
                  : 'Pemberitahuan penugasan pekerjaan dari admin akan muncul di sini secara real-time.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifs.map((notif) => {
                const targetUrl = notif.tautan || (notif.booking_id ? `/technician/jobs/${notif.booking_id}` : null);
                const isTask = notif.title?.toLowerCase().includes('tugas') || notif.type === 'assignment';
                
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif)}
                    className={cn(
                      "p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer relative group",
                      !notif.is_read 
                        ? "bg-blue-50/40 hover:bg-blue-50/70 border-blue-200 shadow-xs" 
                        : "bg-white hover:bg-slate-50 border-slate-100 shadow-2xs"
                    )}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105",
                        !notif.is_read
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      )}>
                        {isTask ? (
                          <Wrench className="w-5 h-5" />
                        ) : notif.type === 'schedule' ? (
                          <Calendar className="w-5 h-5" />
                        ) : (
                          <Bell className="w-5 h-5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <h4 className={cn(
                            "text-sm font-bold truncate",
                            !notif.is_read ? "text-slate-900 font-black" : "text-slate-700"
                          )}>
                            {notif.title}
                          </h4>
                          <span className="text-[11px] font-medium text-slate-500 shrink-0">
                            {formatNotifTime(notif.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed mb-3">
                          {notif.message}
                        </p>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100/60">
                          <div className="flex items-center gap-2">
                            {!notif.is_read && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                Belum Dibaca
                              </span>
                            )}
                          </div>

                          {targetUrl && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:text-blue-700 group-hover:underline">
                              Buka Tugas
                              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    const kpiHariIni = dashboardData?.ringkasan?.hari_ini ?? todayJobs.length;
    const kpiMendatang = dashboardData?.pekerjaan_mendatang?.length ?? upcomingJobs.length;
    const kpiBerjalan = dashboardData?.ringkasan?.berjalan ?? inProgressJobs.length;
    const kpiSelesai = dashboardData?.ringkasan?.selesai ?? completedJobs.length;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tugas Hari Ini</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{kpiHariIni}</span>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Tiket</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mendatang</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-amber-600">{kpiMendatang}</span>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">Jadwal</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sedang Proses</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-blue-600">{kpiBerjalan}</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">Aktif</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Selesai</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600">{kpiSelesai}</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Sukses</span>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                Tugas Hari Ini
              </h2>
            </div>
            <Link to="/technician/jobs" className="text-xs sm:text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
              Lihat Semua <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {todayJobs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-100">
              <CheckCircle className="w-12 h-12 text-blue-400 mx-auto mb-2" />
              <h3 className="font-bold text-base text-slate-900">Tidak Ada Tugas Hari Ini</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Anda tidak memiliki jadwal tiket untuk hari ini. Silakan periksa bagian tugas mendatang.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todayJobs.map(renderJobCard)}
            </div>
          )}
        </section>

        {upcomingJobs.length > 0 && (
          <section className="space-y-4 pt-2">
            <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Jadwal Mendatang
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingJobs.map(renderJobCard)}
            </div>
          </section>
        )}
      </div>
    );
  };

  const handleMarkAsRead = async (notif, e) => {
    if (e) e.stopPropagation();
    if (!notif.is_read) {
      try {
        await api.patch(`/technician/notifications/${notif.id}/read`);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        setUnreadNotifs(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark read', err);
      }
    }
    const target = notif.tautan || (notif.booking_id ? `/technician/jobs/${notif.booking_id}` : null);
    if (target) {
      navigate(target);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadNotifs === 0 || markingAllRead) return;
    try {
      setMarkingAllRead(true);
      await api.patch('/technician/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadNotifs(0);
    } catch (err) {
      showError('Gagal menandai semua notifikasi: ' + (err.response?.data?.error?.message || err.message));
    } finally {
      if (isMountedRef.current) {
        setMarkingAllRead(false);
      }
    }
  };

  const formatNotifTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'Baru saja';
      if (diffMin < 60) return `${diffMin} menit yang lalu`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours} jam yang lalu`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays} hari yang lalu`;
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <DashboardLayout 
      role="technician"
      unreadCount={unreadNotifs}
      onOpenNotif={handleOpenNotif}
    >
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="space-y-4">
            <div className="h-24 bg-slate-100 animate-pulse rounded-2xl"></div>
            <div className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>
          </div>
        ) : (
          renderContent()
        )}
      </div>

      <NotificationDrawer 
        isOpen={isNotifOpen}
        onClose={handleCloseNotif}
        role="technician"
        onRefreshCount={() => fetchData(true)}
      />
    </DashboardLayout>
  );
}

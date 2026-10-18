import { useState, useMemo, useCallback, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../AuthContext';
import api from '../../api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { cn } from '../../lib/utils';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Wrench, Calendar as CalendarIcon, AlertTriangle, CheckCircle, CheckCircle2, Clock, ArrowRight, X, Receipt, CreditCard, ShieldCheck, Search, Plus, BarChart3, TrendingUp, Users, DollarSign, Award, Layers, ChevronDown } from 'lucide-react';
import AdminCreateBookingModal from '../../components/admin/AdminCreateBookingModal';

export default function AdminHome({ bookings = [], technicians = [], loading = false, handleStatus: _handleStatus, handleAssign, isAdmin: _isAdmin, onBookingCreated }) {
  const navigate = useNavigate();
  const { user: _user } = useContext(AuthContext);

  const [searchToday, setSearchToday] = useState('');
  const [filterTodayStatus, setFilterTodayStatus] = useState('all'); // all | scheduled | on process | done | unassigned
  const [assigningId, setAssigningId] = useState(null);
  const [selectedTechForAssign, setSelectedTechForAssign] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const [trendPeriod, setTrendPeriod] = useState('7d'); // '7d' | '30d' | '90d' | '1y'
  const [apiTrendData, setApiTrendData] = useState(null);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [activeChartTab, setActiveChartTab] = useState('tren_booking'); // 'tren_booking' | 'top_customers' | 'top_services' | 'monthly_revenue' | 'top_technicians' | 'monthly_bookings'
  const [dashboardAnalytics, setDashboardAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isDateToday = (dInput) => {
    if (!dInput) return false;
    const d = new Date(dInput);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getDate() === now.getDate() &&
           d.getMonth() === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
  };
  
  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  const getAssignedTechnician = useCallback((b) => {
    if (!b) return null;
    if (b.teknisi && typeof b.teknisi === 'object' && b.teknisi.nama) {
      return { id: b.teknisi.id || b.teknisi_id, nama: b.teknisi.nama };
    }
    const techId = b.teknisi_id || (b.teknisi && typeof b.teknisi === 'object' ? b.teknisi.id : null);
    if (techId) {
      const found = technicians.find(t => t.id === Number(techId));
      if (found) return { id: found.id, nama: found.nama };
      return { id: Number(techId), nama: b.teknisi_nama || `Teknisi #${techId}` };
    }
    if (typeof b.teknisi === 'string' && b.teknisi.trim() !== '') {
      return { id: null, nama: b.teknisi };
    }
    if (b.teknisi_nama) {
      return { id: null, nama: b.teknisi_nama };
    }
    return null;
  }, [technicians]);

  const [todayBookingsData, setTodayBookingsData] = useState([]);
  const [_loadingToday, setLoadingToday] = useState(false);

  const fetchTodayBookings = useCallback(async () => {
    try {
      setLoadingToday(true);
      const todayStr = getLocalDateStr(new Date());
      const res = await api.get('/bookings', {
        params: { dari: todayStr, sampai: todayStr, limit: 100 }
      });
      const data = res?.data?.data || res?.data || res;
      if (Array.isArray(data)) {
        setTodayBookingsData(data);
      }
    } catch (err) {
      console.warn('Gagal memuat booking hari ini dari server:', err);
    } finally {
      setLoadingToday(false);
    }
  }, []);

  useEffect(() => {
    fetchTodayBookings();
  }, [fetchTodayBookings]);

  useEffect(() => {
    const handleUpdate = () => fetchTodayBookings();
    window.addEventListener('nara-booking-updated', handleUpdate);
    return () => window.removeEventListener('nara-booking-updated', handleUpdate);
  }, [fetchTodayBookings]);

  const todayBookings = useMemo(() => {
    if (todayBookingsData && todayBookingsData.length > 0) {
      return todayBookingsData;
    }
    return bookings.filter(b => b.jadwal_mulai && isDateToday(b.jadwal_mulai));
  }, [todayBookingsData, bookings]);

  const [actionTab, setActionTab] = useState('today');
  const [upcomingPending, setUpcomingPending] = useState([]);
  const [_loadingUpcoming, setLoadingUpcoming] = useState(false);

  const fetchUpcomingPending = useCallback(async () => {
    try {
      setLoadingUpcoming(true);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomStr = getLocalDateStr(tomorrow);
      const res = await api.get('/bookings', {
        params: { belum_ditugaskan: true, dari: tomStr, urut: 'terdekat', limit: 8 }
      });
      const data = res?.data?.data || res?.data || res;
      if (Array.isArray(data)) {
        setUpcomingPending(data);
      }
    } catch (e) {
      console.warn('Gagal memuat booking mendatang belum ditugaskan:', e);
    } finally {
      setLoadingUpcoming(false);
    }
  }, []);

  useEffect(() => {
    fetchUpcomingPending();
  }, [fetchUpcomingPending]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchUpcomingPending();
    };
    window.addEventListener('nara-booking-updated', handleUpdate);
    return () => window.removeEventListener('nara-booking-updated', handleUpdate);
  }, [fetchUpcomingPending]);

  const todayPending = useMemo(() => {
    return todayBookings
      .filter(b => (!getAssignedTechnician(b) && b.status === 'scheduled') || b.status === 'delayed')
      .sort((a, b) => new Date(a.jadwal_mulai).getTime() - new Date(b.jadwal_mulai).getTime());
  }, [todayBookings, getAssignedTechnician]);

  // Otomatis arahkan ke tab upcoming jika hari ini kosong tetapi ada antrean booking mendatang
  useEffect(() => {
    if (todayPending.length === 0 && upcomingPending.length > 0) {
      setActionTab('upcoming');
    }
  }, [todayPending.length, upcomingPending.length]);

  const actionRequired = useMemo(() => {
    return actionTab === 'today' ? todayPending : upcomingPending;
  }, [actionTab, todayPending, upcomingPending]);

  const formatSlotTime = (dtStr) => {
    if (!dtStr) return '-';
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatSlotBadge = (dtStr) => {
    if (!dtStr) return null;
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return null;
    const timeStr = formatSlotTime(dtStr);
    
    if (isDateToday(dtStr)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-700" />
          Hari Ini • {timeStr} WIB
        </span>
      );
    }
    
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    const isTomorrow = d.getDate() === tom.getDate() && d.getMonth() === tom.getMonth() && d.getFullYear() === tom.getFullYear();
    
    if (isTomorrow) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
          <CalendarIcon className="w-3 h-3 text-blue-600" />
          Besok ({d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}) • {timeStr} WIB
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <CalendarIcon className="w-3 h-3 text-slate-500" />
        {d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })} • {timeStr} WIB
      </span>
    );
  };

  const bookingStats = useMemo(() => {
    const counts = { scheduled: 0, 'on process': 0, done: 0, cancelled: 0, delayed: 0, rescheduled: 0 };
    let todayBookingsCount = todayBookings.length;
    let doneTodayCount = 0;
    let onProcessCount = 0;
    let pendingAssignCount = 0;
    let todayOmzet = 0;
    
    todayBookings.forEach(b => {
      if (b.status === 'done') doneTodayCount++;
      if (b.status === 'on process') onProcessCount++;
      if ((!getAssignedTechnician(b) && b.status === 'scheduled') || b.status === 'delayed') {
        pendingAssignCount++;
      }

      const unit = b.jumlah_unit || 1;
      const basePrice = b.layanan?.harga || b.harga || 75000;
      const subtotal = basePrice * unit;
      const isMember = Boolean(b.is_member || b.customer_is_member || b.customer?.has_account);
      const discount = b.diskon !== undefined && b.diskon !== null
        ? Number(b.diskon)
        : (isMember ? Math.round(subtotal * 0.10) : 0);
      todayOmzet += (b.total_biaya !== undefined && b.total_biaya !== null ? Number(b.total_biaya) : (subtotal - discount));

      if (counts[b.status] !== undefined) counts[b.status]++;
    });
    
    return {
      todayBookings: todayBookingsCount,
      onProcess: onProcessCount,
      doneToday: doneTodayCount,
      pendingAssign: pendingAssignCount,
      todayOmzet,
      counts
    };
  }, [todayBookings, getAssignedTechnician]);

  const filteredTodayBookings = useMemo(() => {
    return todayBookings.filter(b => {
      const q = searchToday.toLowerCase();
      const matchSearch = 
        !searchToday ||
        (b.kode_booking && b.kode_booking.toLowerCase().includes(q)) ||
        (b.customer?.nama && b.customer.nama.toLowerCase().includes(q)) ||
        (b.nama && b.nama.toLowerCase().includes(q)) ||
        (b.teknisi?.nama && b.teknisi.nama.toLowerCase().includes(q)) ||
        (b.layanan?.nama_layanan && b.layanan.nama_layanan.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterTodayStatus === 'unassigned') {
        return !getAssignedTechnician(b) && b.status !== 'cancelled';
      }
      if (filterTodayStatus !== 'all') {
        return b.status === filterTodayStatus;
      }
      return true;
    });
  }, [todayBookings, searchToday, filterTodayStatus, getAssignedTechnician]);

  const statusData = useMemo(() => {
    const counts = bookingStats.counts;
    return [
      { name: 'Selesai', value: counts['done'], color: '#10b981' },       // emerald-500
      { name: 'On Process', value: counts['on process'], color: '#2563eb' }, // blue-600
      { name: 'Terjadwal', value: counts['scheduled'], color: '#f59e0b' },   // amber-500
      { name: 'Tertunda', value: counts['delayed'] + counts['rescheduled'], color: '#f97316' }, // orange-500
      { name: 'Batal', value: counts['cancelled'], color: '#ef4444' },       // red-500
    ].filter(d => d.value > 0);
  }, [bookingStats]);

  const fetchTrends = useCallback(async (period) => {
    try {
      setLoadingTrends(true);
      const res = await api.get('/analytics/trends', { params: { period } });
      const data = res?.data || res;
      if (Array.isArray(data)) {
        setApiTrendData(data);
      }
    } catch (err) {
      console.warn('Gagal memuat tren dari server, fallback ke perhitungan lokal:', err);
    } finally {
      setLoadingTrends(false);
    }
  }, []);

  const fetchDashboardAnalytics = useCallback(async (period = '7d') => {
    try {
      setLoadingAnalytics(true);
      const res = await api.get('/analytics/dashboard-views', {
        params: { period }
      });
      const data = res?.data?.data || res?.data || res;
      if (data) {
        setDashboardAnalytics(data);
      }
    } catch (err) {
      console.warn('Gagal memuat analitik dashboard:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  useEffect(() => {
    fetchTrends(trendPeriod);
    fetchDashboardAnalytics(trendPeriod);
  }, [trendPeriod, fetchTrends, fetchDashboardAnalytics]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchTrends(trendPeriod);
      fetchDashboardAnalytics(trendPeriod);
    };
    window.addEventListener('nara-booking-updated', handleUpdate);
    return () => window.removeEventListener('nara-booking-updated', handleUpdate);
  }, [trendPeriod, fetchTrends, fetchDashboardAnalytics]);

  const periodOptions = useMemo(() => [
    { key: '7d', label: '7 Hari', subtitle: 'Performa operasional 7 hari kalender terakhir' },
    { key: '30d', label: '1 Bulan', subtitle: 'Performa operasional 30 hari kalender terakhir' },
    { key: '90d', label: '3 Bulan', subtitle: 'Performa operasional 3 bulan terakhir (agregasi mingguan)' },
    { key: '1y', label: '1 Tahun', subtitle: 'Tren performa tahunan 2026 (Januari - Desember)' },
  ], []);

  const currentPeriodConfig = useMemo(() => {
    return periodOptions.find(p => p.key === trendPeriod) || periodOptions[0];
  }, [periodOptions, trendPeriod]);

  const trendData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateStr(d);
      const dayBookings = bookings.filter(b => b.jadwal_mulai && b.jadwal_mulai.startsWith(dateStr));
      data.push({
        date: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        total: dayBookings.length,
        selesai: dayBookings.filter(b => b.status === 'done').length
      });
    }
    return data;
  }, [bookings]);

  const activeTrendData = useMemo(() => {
    if (apiTrendData && apiTrendData.length > 0) {
      return apiTrendData;
    }
    return trendData;
  }, [apiTrendData, trendData]);

  const topCustomersData = useMemo(() => {
    const list = dashboardAnalytics?.topCustomers || [];
    return list.map(c => {
      let displayName = c.nama || '';
      displayName = displayName.replace(/\(CUST-\d+\)/, '').replace('Bpk/Ibu ', '').trim();
      if (displayName.length > 15) displayName = displayName.slice(0, 13) + '...';
      return {
        name: displayName,
        fullName: c.nama,
        kode: c.kode_pelanggan || '-',
        total: c.total_transaksi || 0,
        belanja: c.total_belanja || 0,
        segmen: c.segmen_rfm || 'Reguler'
      };
    });
  }, [dashboardAnalytics]);

  const topServicesData = useMemo(() => {
    const list = dashboardAnalytics?.topServices || [];
    return list.map(s => {
      let displayName = s.nama || '';
      if (displayName.length > 18) displayName = displayName.slice(0, 16) + '...';
      return {
        name: displayName,
        fullName: s.nama,
        total: s.total_pesanan || 0,
        revenue: s.total_revenue || 0,
        kategori: s.kategori || 'Servis'
      };
    });
  }, [dashboardAnalytics]);

  const monthlyRevenueData = useMemo(() => {
    const list = dashboardAnalytics?.monthlyRevenue || [];
    return list.map(m => ({
      date: m.bulan_label || m.periode,
      revenue: m.revenue || 0,
      total: m.total_transaksi || 0
    }));
  }, [dashboardAnalytics]);

  const topTechniciansData = useMemo(() => {
    const list = dashboardAnalytics?.topTechnicians || [];
    return list.map(t => ({
      name: t.nama || 'Teknisi',
      fullName: t.nama || 'Teknisi',
      selesai: t.selesai || 0,
      total_tugas: t.total_tugas || 0,
      kontak: t.kontak || '-'
    }));
  }, [dashboardAnalytics]);

  const monthlyBookingsData = useMemo(() => {
    const list = dashboardAnalytics?.monthlyBookings || [];
    return list.map(m => ({
      date: m.bulan_label || m.periode,
      total: m.total_booking || 0,
      selesai: m.selesai || 0,
      aktif: m.aktif || 0,
      batal: m.batal || 0
    }));
  }, [dashboardAnalytics]);

  const chartViewConfigs = useMemo(() => ({
    tren_booking: {
      title: 'Tren Kunjungan Servis & Penyelesaian',
      subtitle: currentPeriodConfig.subtitle,
      badge: 'Operasional Harian',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200'
    },
    top_customers: {
      title: 'Top 10 Transaksi Customer Terbanyak',
      subtitle: `Peringkat 10 pelanggan teratas berdasarkan jumlah order & belanja (${currentPeriodConfig.label})`,
      badge: 'Analisis Pelanggan',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    },
    top_services: {
      title: 'Top 10 Layanan Servis Terbanyak',
      subtitle: `Paket servis AC paling banyak dipesan pelanggan (${currentPeriodConfig.label})`,
      badge: 'Layanan Terfavorit',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200'
    },
    monthly_revenue: {
      title: 'Tren Revenue / Pendapatan',
      subtitle: `Akumulasi omset pendapatan servis AC riil yang telah selesai & terbayar (${currentPeriodConfig.label})`,
      badge: 'Keuangan & Omset',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    },
    top_technicians: {
      title: 'Top 10 Teknisi dengan Pengerjaan Terbanyak',
      subtitle: `Penyelesaian order kerja servis AC oleh tim teknisi lapangan (${currentPeriodConfig.label})`,
      badge: 'Produktivitas Teknisi',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200'
    },
    monthly_bookings: {
      title: 'Booking Terjadwal Customer',
      subtitle: `Historis tren volume order servis yang dijadwalkan (${currentPeriodConfig.label})`,
      badge: 'Tren Periode',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200'
    }
  }), [currentPeriodConfig]);

  const techWorkload = useMemo(() => {
    const workload = {};
    technicians.forEach(t => {
      workload[t.id] = {
        id: t.id,
        name: t.nama || 'Teknisi',
        shortName: (t.nama || '').split(' ')[0] || 'Teknisi',
        jobs: 0,
        activeTotal: 0,
        maxJobs: 4 // Kapasitas optimal harian per teknisi
      };
    });

    bookings.forEach(b => {
      const assigned = getAssignedTechnician(b);
      if (assigned && assigned.id && workload[assigned.id]) {
        if (b.status !== 'cancelled' && b.status !== 'done') {
          workload[assigned.id].activeTotal++;
        }
      }
    });

    todayBookings.forEach(b => {
      const assigned = getAssignedTechnician(b);
      if (assigned && assigned.id && workload[assigned.id]) {
        if (b.status !== 'cancelled') {
          workload[assigned.id].jobs++;
        }
      }
    });

    return Object.values(workload).sort((a, b) => b.jobs - a.jobs || b.activeTotal - a.activeTotal);
  }, [todayBookings, bookings, technicians, getAssignedTechnician]);

  const handleQuickAssignSubmit = async (bookingId) => {
    if (!selectedTechForAssign) return;
    const techId = Number(selectedTechForAssign);
    setAssigningId(null);
    setSelectedTechForAssign('');
    await handleAssign(bookingId, techId);
    if (onBookingCreated) {
      onBookingCreated();
    }
    window.dispatchEvent(new CustomEvent('nara-booking-updated'));
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 bg-slate-50/60 relative min-w-0 font-sans">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Dashboard Operasional
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantauan jadwal servis, performa operasional, dan alokasi teknisi: <strong className="text-slate-700 font-bold">{todayFormatted}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => setIsBookingModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl h-10 px-4 cursor-pointer shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all hover:shadow active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Booking Baru</span>
          </Button>

          <Button
            onClick={() => navigate('/admin/invoices')}
            variant="outline"
            className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200 font-bold text-xs sm:text-sm rounded-xl h-10 px-4 cursor-pointer flex items-center gap-2 transition-all shadow-2xs whitespace-nowrap"
          >
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>E-Invoice</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        
        <div 
          onClick={() => navigate('/admin/schedule')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Booking Hari Ini</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {bookingStats.todayBookings} <span className="text-xs font-semibold text-slate-500">Tiket</span>
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {bookingStats.todayBookings > 0 
                ? "Jadwal servis hari ini" 
                : (upcomingPending.length > 0 
                    ? `0 hari ini • ${upcomingPending.length} terjadwal besok` 
                    : "Jadwal servis terdaftar")}
            </p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/admin/bookings')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">On Process</span>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-sky-600 tracking-tight">
              {bookingStats.onProcess} <span className="text-xs font-semibold text-slate-500">Tiket</span>
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Sedang dikerjakan teknisi
            </p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/admin/bookings')}
          className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Selesai Hari Ini</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {bookingStats.doneToday} <span className="text-xs font-semibold text-slate-500">Tiket</span>
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Pengerjaan tuntas & beres
            </p>
          </div>
        </div>

        <div 
          onClick={() => {
            if (bookingStats.pendingAssign > 0) {
              setFilterTodayStatus('unassigned');
              setActionTab('today');
              const el = document.getElementById('action-center-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } else if (upcomingPending.length > 0) {
              setActionTab('upcoming');
              const el = document.getElementById('action-center-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            } else {
              navigate('/admin/bookings');
            }
          }}
          className={cn(
            "p-5 rounded-3xl border shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between bg-white",
            bookingStats.pendingAssign > 0 
              ? "border-rose-300 ring-1 ring-rose-200" 
              : (upcomingPending.length > 0 
                  ? "border-amber-300 ring-1 ring-amber-200" 
                  : "border-slate-200/80")
          )}
        >
          <div className="flex justify-between items-start mb-3">
            <span className={cn(
              "text-xs font-bold uppercase tracking-wider",
              bookingStats.pendingAssign > 0 
                ? "text-rose-600" 
                : (upcomingPending.length > 0 ? "text-amber-600" : "text-slate-500")
            )}>
              Belum Ditugaskan
            </span>
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center font-bold transition-colors",
              bookingStats.pendingAssign > 0 
                ? "bg-rose-100 text-rose-600" 
                : (upcomingPending.length > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")
            )}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className={cn(
              "text-2xl sm:text-3xl font-black tracking-tight",
              bookingStats.pendingAssign > 0 
                ? "text-rose-600" 
                : (upcomingPending.length > 0 ? "text-amber-700" : "text-slate-900")
            )}>
              {bookingStats.pendingAssign + upcomingPending.length} <span className="text-xs font-semibold text-slate-500">Tiket</span>
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {bookingStats.pendingAssign > 0 
                ? `${bookingStats.pendingAssign} tiket hari ini perlu teknisi!` 
                : (upcomingPending.length > 0 
                    ? `${upcomingPending.length} tiket jadwal mendatang perlu alokasi` 
                    : "Semua tiket bertugas")}
            </p>
          </div>
        </div>

        <div 
          onClick={() => navigate('/admin/invoices')}
          className="col-span-2 sm:col-span-1 lg:col-span-1 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Estimasi Nilai Servis</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
              Rp {bookingStats.todayOmzet.toLocaleString('id-ID')}
            </p>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Akumulasi tiket hari ini
            </p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0 items-stretch">
        
        <div className="lg:col-span-7 bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-w-0">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0 sm:pr-4">
                <div className="flex items-center gap-2.5 flex-wrap mb-1">
                  <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                    {chartViewConfigs[activeChartTab]?.title || 'Tren Kunjungan Servis'}
                  </h2>
                  <span className={cn(
                    "text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border",
                    chartViewConfigs[activeChartTab]?.badgeColor || "bg-blue-50 text-blue-700 border-blue-200"
                  )}>
                    {chartViewConfigs[activeChartTab]?.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  {chartViewConfigs[activeChartTab]?.subtitle}
                </p>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                {/* Dropdown Pemilih Tampilan Grafik (Tanpa Penomoran & Tanpa Emoji) */}
                <div className="relative inline-flex items-center w-full sm:w-auto">
                  <select
                    value={activeChartTab}
                    onChange={(e) => setActiveChartTab(e.target.value)}
                    className="appearance-none bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 text-xs sm:text-sm font-bold py-2 pl-3.5 pr-9 rounded-2xl shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer min-w-[220px]"
                  >
                    <option value="tren_booking">Tren Booking (Default)</option>
                    <option value="top_customers">Top 10 Transaksi Customer</option>
                    <option value="top_services">Top 10 Layanan Terbanyak</option>
                    <option value="monthly_revenue">Revenue per Periode</option>
                    <option value="top_technicians">Top 10 Teknisi Terbanyak</option>
                    <option value="monthly_bookings">Booking Terjadwal per Periode</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
                </div>

                {/* Filter Waktu: 7 Hari, 1 Bulan, 3 Bulan, 1 Tahun (Di bawah Dropdown) */}
                <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 shadow-2xs">
                  {periodOptions.map((opt) => {
                    const isActive = trendPeriod === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setTrendPeriod(opt.key)}
                        className={cn(
                          "px-2.5 py-1 text-xs rounded-lg transition-all font-semibold",
                          isActive
                            ? "bg-white text-blue-600 shadow-xs font-bold"
                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sub-bar indikator periode & legend grafis */}
            <div className="flex items-center justify-between text-xs pb-2 mb-2 border-b border-slate-100">
              <span className="text-[11px] font-medium text-slate-400">
                Periode data: <strong className="text-slate-700">{currentPeriodConfig.label}</strong>
              </span>
              <div className="flex items-center gap-3">
                {activeChartTab === 'tren_booking' && (
                  <>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <span>Total</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Selesai</span>
                    </span>
                  </>
                )}
                {activeChartTab === 'top_customers' && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                    <Users className="w-3.5 h-3.5" />
                    <span>Total Transaksi & Belanja</span>
                  </span>
                )}
                {activeChartTab === 'top_services' && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-sky-700">
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Total Pesanan Layanan</span>
                  </span>
                )}
                {activeChartTab === 'monthly_revenue' && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Akumulasi Omset Selesai (IDR)</span>
                  </span>
                )}
                {activeChartTab === 'top_technicians' && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-purple-700">
                    <Award className="w-3.5 h-3.5" />
                    <span>Pengerjaan Selesai</span>
                  </span>
                )}
                {activeChartTab === 'monthly_bookings' && (
                  <>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span>Total Booking</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span>Selesai</span>
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className={cn("h-[250px] sm:h-[270px] w-full min-w-0 transition-opacity duration-200", (loadingTrends || loadingAnalytics) ? "opacity-60" : "opacity-100")}>
              <ResponsiveContainer width="100%" height="100%">
                {activeChartTab === 'tren_booking' && (
                  <AreaChart data={activeTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="naraTotalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="naraDoneGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                      dx={-10} 
                    />
                    <RTooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: '1px solid #e2e8f0', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                        padding: '12px',
                        fontSize: '12px',
                        fontWeight: 700
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      name="Total Booking" 
                      dataKey="total" 
                      stroke="#2563eb" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#naraTotalGrad)" 
                      dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 6 }} 
                    />
                    <Area 
                      type="monotone" 
                      name="Selesai" 
                      dataKey="selesai" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#naraDoneGrad)" 
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                    />
                  </AreaChart>
                )}

                {activeChartTab === 'top_customers' && (
                  <BarChart data={topCustomersData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                      dx={-10} 
                    />
                    <RTooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-200 text-xs min-w-[200px]">
                            <p className="font-bold text-slate-900 text-sm">{d.fullName}</p>
                            <p className="text-slate-500 font-medium text-[11px] mb-2">
                              ID: {d.kode} • Segmen: <span className="font-semibold text-blue-600">{d.segmen}</span>
                            </p>
                            <div className="space-y-1.5 pt-1.5 border-t border-slate-100 font-medium">
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-600">Total Transaksi:</span>
                                <span className="font-bold text-blue-600">{d.total} order</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-600">Akumulasi Belanja:</span>
                                <span className="font-bold text-emerald-600">Rp {Number(d.belanja || 0).toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="total" name="Total Transaksi" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}

                {activeChartTab === 'top_services' && (
                  <BarChart data={topServicesData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                      dx={-10} 
                    />
                    <RTooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-200 text-xs min-w-[200px]">
                            <p className="font-bold text-slate-900 text-sm">{d.fullName}</p>
                            <p className="text-slate-500 font-medium text-[11px] mb-2">
                              Kategori: <span className="font-semibold text-sky-600">{d.kategori}</span>
                            </p>
                            <div className="space-y-1.5 pt-1.5 border-t border-slate-100 font-medium">
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-600">Total Pesanan:</span>
                                <span className="font-bold text-sky-600">{d.total} pengerjaan</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-600">Total Revenue:</span>
                                <span className="font-bold text-emerald-600">Rp {Number(d.revenue || 0).toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="total" name="Total Pesanan" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}

                {activeChartTab === 'monthly_revenue' && (
                  <AreaChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="naraRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                      tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(0)}Jt`}
                      dx={-5} 
                    />
                    <RTooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-200 text-xs min-w-[200px]">
                            <p className="font-bold text-slate-900 text-sm">{d.date}</p>
                            <div className="space-y-1.5 mt-2 pt-1.5 border-t border-slate-100 font-medium">
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-600">Total Revenue:</span>
                                <span className="font-bold text-emerald-600">Rp {Number(d.revenue || 0).toLocaleString('id-ID')}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-600">Order Selesai:</span>
                                <span className="font-bold text-slate-800">{d.total} transaksi</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area 
                      type="monotone" 
                      name="Revenue" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#naraRevGrad)" 
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 6 }} 
                    />
                  </AreaChart>
                )}

                {activeChartTab === 'top_technicians' && (
                  <BarChart data={topTechniciansData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                      dx={-10} 
                    />
                    <RTooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-200 text-xs min-w-[200px]">
                            <p className="font-bold text-slate-900 text-sm">{d.fullName}</p>
                            <p className="text-slate-500 font-medium text-[11px] mb-2">Kontak: {d.kontak}</p>
                            <div className="space-y-1.5 pt-1.5 border-t border-slate-100 font-medium">
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-600">Servis Selesai:</span>
                                <span className="font-bold text-purple-600">{d.selesai} pengerjaan</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-600">Total Penugasan:</span>
                                <span className="font-bold text-slate-800">{d.total_tugas} tiket</span>
                              </div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="selesai" name="Servis Selesai" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}

                {activeChartTab === 'monthly_bookings' && (
                  <AreaChart data={monthlyBookingsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="naraBookGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="naraDoneMonthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} 
                      dx={-10} 
                    />
                    <RTooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-200 text-xs min-w-[200px]">
                            <p className="font-bold text-slate-900 text-sm">{d.date}</p>
                            <div className="space-y-1.5 mt-2 pt-1.5 border-t border-slate-100 font-medium">
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-600">Total Terjadwal:</span>
                                <span className="font-bold text-amber-600">{d.total} booking</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span className="text-slate-600">Selesai Beres:</span>
                                <span className="font-bold text-emerald-600">{d.selesai} order</span>
                              </div>
                              {d.aktif > 0 && (
                                <div className="flex justify-between gap-4">
                                  <span className="text-slate-600">Masih Berjalan:</span>
                                  <span className="font-bold text-blue-600">{d.aktif} order</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area 
                      type="monotone" 
                      name="Total Booking" 
                      dataKey="total" 
                      stroke="#f59e0b" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#naraBookGrad)" 
                      dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 6 }} 
                    />
                    <Area 
                      type="monotone" 
                      name="Selesai" 
                      dataKey="selesai" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#naraDoneMonthGrad)" 
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} 
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Kapasitas Teknisi Hari Ini
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Beban alokasi tugas per teknisi
                </p>
              </div>
              <Button 
                size="sm"
                variant="ghost"
                onClick={() => navigate('/admin/technicians')}
                className="text-xs text-blue-600 font-bold hover:bg-blue-50 rounded-xl h-8 px-2.5 cursor-pointer"
              >
                Lihat Semua
              </Button>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[210px] pr-1">
              {techWorkload.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-semibold">
                  Belum ada data teknisi terdaftar.
                </div>
              ) : (
                techWorkload.slice(0, 5).map(tech => {
                  const pct = Math.min(100, Math.round((tech.jobs / tech.maxJobs) * 100));
                  return (
                    <div key={tech.id} className="space-y-1.5 p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 border border-blue-100">
                            {tech.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-800">{tech.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-slate-600">
                            {tech.jobs} / {tech.maxJobs} Hari Ini
                          </span>
                          {tech.activeTotal > 0 && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200/60" title={`${tech.activeTotal} total booking aktif yang ditangani ${tech.name}`}>
                              {tech.activeTotal} Aktif
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            tech.jobs === 0 ? "bg-slate-300" :
                            tech.jobs >= tech.maxJobs ? "bg-rose-500" :
                            tech.jobs >= 2 ? "bg-blue-600" : "bg-emerald-500"
                          )}
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between mt-3">
            <span>Standar kuota: Maks. 4 job/hari</span>
            <span className="text-blue-600 font-bold">SOP NARA</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-w-0 items-stretch">
        
        <div className="lg:col-span-5 bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-w-0">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Status Distribusi Tiket
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Proporsi pengerjaan aktif hari ini
            </p>
          </div>

          <div className="h-[210px] w-full relative flex items-center justify-center my-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={statusData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={58} 
                  outerRadius={82} 
                  paddingAngle={4} 
                  dataKey="value" 
                  cornerRadius={6}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RTooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '11px',
                    fontWeight: 700 
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute text-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 leading-none block">
                {todayBookings.length}
              </span>
              <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                Hari Ini
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center pt-3 border-t border-slate-100">
            {statusData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200/70 text-xs font-bold text-slate-700">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span>{d.name}</span>
                <span className="text-slate-500 font-mono">({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        <div id="action-center-section" className="lg:col-span-7 bg-white p-5 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between min-w-0 scroll-mt-20">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "p-2 rounded-xl",
                  todayPending.length > 0 
                    ? "bg-rose-50 text-rose-600" 
                    : (upcomingPending.length > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600")
                )}>
                  {todayPending.length > 0 || upcomingPending.length > 0 ? <AlertTriangle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Pusat Tindakan & Perhatian</h3>
                  <p className="text-xs text-slate-500">Status alokasi penugasan dan antrian prioritas</p>
                </div>
              </div>
              <Badge className={cn(
                "text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border",
                todayPending.length > 0 
                  ? "bg-rose-50 text-rose-700 border-rose-200" 
                  : (upcomingPending.length > 0
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200")
              )}>
                {todayPending.length > 0 
                  ? `${todayPending.length} Hari Ini Perlu Alokasi` 
                  : (upcomingPending.length > 0
                      ? `${upcomingPending.length} Jadwal Mendatang Perlu Alokasi`
                      : 'Hari Ini Terkendali ✓')}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl mb-3.5">
              <button
                type="button"
                onClick={() => setActionTab('today')}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  actionTab === 'today'
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <span>Hari Ini</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                  todayPending.length > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600"
                )}>
                  {todayPending.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActionTab('upcoming')}
                className={cn(
                  "flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  actionTab === 'upcoming'
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <span>Jadwal Mendatang</span>
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold",
                  upcomingPending.length > 0 ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"
                )}>
                  {upcomingPending.length}
                </span>
              </button>
            </div>

            {actionRequired.length === 0 ? (
              <div className="py-7 px-4 text-center bg-slate-50/60 rounded-2xl border border-slate-100 flex flex-col items-center justify-center my-auto">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2.5 border",
                  actionTab === 'today' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                )}>
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">
                  {actionTab === 'today' ? 'Seluruh Jadwal Hari Ini Terkendali' : 'Belum Ada Antrean Mendatang'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                  {actionTab === 'today'
                    ? `Tidak ada tiket tertunda atau tanpa teknisi untuk hari ini. Seluruh ${bookingStats.todayBookings} tiket servis telah ditugaskan secara optimal.`
                    : 'Semua tiket servis untuk jadwal berikutnya sudah memiliki alokasi teknisi.'}
                </p>
                {actionTab === 'today' && upcomingPending.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActionTab('upcoming')}
                    className="mt-3.5 h-8 text-xs font-bold text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-xl cursor-pointer"
                  >
                    Lihat {upcomingPending.length} Antrean Jadwal Mendatang →
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[250px] pr-1">
                {actionRequired.map(b => (
                  <div key={b.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-200 transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-100">
                          {b.kode_booking}
                        </span>
                        {formatSlotBadge(b.jadwal_mulai)}
                      </div>
                      <span className={cn(
                        "text-xs px-2.5 py-0.5 rounded-full font-bold",
                        b.status === 'delayed' ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                      )}>
                        {b.status === 'delayed' ? 'Tertunda' : 'Belum Ditugaskan'}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {b.customer?.nama || b.nama || 'Pelanggan'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {b.layanan?.nama_layanan || b.nama_layanan || 'Servis AC'} • {b.jumlah_unit || 1} Unit
                        </p>
                      </div>
                      {b.alamat && (
                        <p className="text-[11px] text-slate-400 text-right truncate max-w-[160px]" title={b.alamat}>
                          {b.alamat}
                        </p>
                      )}
                    </div>

                    {assigningId === b.id ? (
                      <div className="mt-1 flex items-center gap-1.5 animate-in fade-in">
                        <select
                          id={`quick-assign-tech-${b.id}`}
                          name="teknisi_id"
                          value={selectedTechForAssign}
                          onChange={(e) => setSelectedTechForAssign(e.target.value)}
                          className="flex-1 rounded-xl border border-blue-200 bg-white h-8 text-xs px-2 font-medium"
                        >
                          <option value="">Pilih Teknisi...</option>
                          {technicians.map(t => (
                            <option key={t.id} value={t.id}>{t.nama}</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          onClick={() => handleQuickAssignSubmit(b.id)}
                          disabled={!selectedTechForAssign}
                          className="h-8 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          OK
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setAssigningId(null)}
                          className="h-8 px-2 text-slate-500 hover:text-slate-700 rounded-xl"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/50">
                        <button
                          type="button"
                          onClick={() => setAssigningId(b.id)}
                          className="text-xs text-blue-600 font-bold hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>Tugaskan Sekarang</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/admin/schedule')}
                          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-0.5 cursor-pointer"
                        >
                          <span>Jadwal</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between mt-3">
            <span>Prioritas pengerjaan otomatis</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/schedule')}
              className="h-6 px-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
            >
              Buka Kalender Jadwal →
            </Button>
          </div>
        </div>

      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
        
        <div className="p-5 sm:p-7 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Operasi Hari Ini ({todayBookings.length} Tiket)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {todayFormatted}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Jadwal kunjungan teknisi lapangan yang diagendakan pada hari ini
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                id="search-today-booking"
                name="search_today_booking"
                type="text"
                value={searchToday}
                onChange={(e) => setSearchToday(e.target.value)}
                placeholder="Cari tiket, pelanggan, layanan..."
                aria-label="Cari booking hari ini"
                className="h-9 pl-8 text-xs rounded-xl border-slate-200 bg-white w-48 sm:w-60 font-medium"
              />
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterTodayStatus('all')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  filterTodayStatus === 'all' ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setFilterTodayStatus('scheduled')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  filterTodayStatus === 'scheduled' ? "bg-amber-500 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Jadwal
              </button>
              <button
                type="button"
                onClick={() => setFilterTodayStatus('on process')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  filterTodayStatus === 'on process' ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Proses
              </button>
              <button
                type="button"
                onClick={() => setFilterTodayStatus('done')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  filterTodayStatus === 'done' ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Selesai
              </button>
              <button
                type="button"
                onClick={() => setFilterTodayStatus('unassigned')}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                  filterTodayStatus === 'unassigned' ? "bg-rose-600 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                Belum Ditugaskan
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-bold flex flex-col items-center gap-2">
            <Clock className="w-7 h-7 animate-spin text-blue-600" />
            <span>Memperbarui data operasi...</span>
          </div>
        ) : filteredTodayBookings.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">Tidak ada jadwal operasi untuk hari ini ({todayFormatted}).</p>
            <p className="text-xs text-slate-500 mt-0.5">Operasional servis aktif sesuai jadwal pemesanan pelanggan.</p>
            {upcomingPending.length > 0 && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
                <span className="text-xs font-semibold text-slate-600">
                  Ada {upcomingPending.length} booking menunggu alokasi teknisi untuk jadwal besok / mendatang:
                </span>
                <Button
                  size="sm"
                  onClick={() => navigate('/admin/bookings')}
                  className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs cursor-pointer"
                >
                  Buka Manajemen Booking ({upcomingPending.length} Tiket) →
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Mobile / Tablet Card View */}
            <div className="block lg:hidden divide-y divide-slate-100">
              {filteredTodayBookings.map(b => {
                const assignedTech = getAssignedTechnician(b);
                return (
                  <div key={b.id} className="p-4 space-y-3 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>{b.jadwal_mulai ? new Date(b.jadwal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-'}</span>
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {b.kode_booking}
                        </span>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 text-xs font-black uppercase tracking-wider rounded-full border",
                        b.status === 'scheduled' ? "bg-amber-50 text-amber-700 border-amber-200" :
                        b.status === 'on process' ? "bg-blue-50 text-blue-700 border-blue-200" :
                        b.status === 'done' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        b.status === 'delayed' ? "bg-orange-50 text-orange-700 border-orange-200" :
                        b.status === 'cancelled' ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700"
                      )}>
                        {b.status}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{b.customer?.nama || b.nama || 'Pelanggan'}</p>
                        <p className="text-xs text-slate-500 font-medium">
                          {b.layanan?.nama || b.layanan?.nama_layanan || b.nama_layanan || 'Cuci AC Standard'} • {b.jumlah_unit || 1} Unit
                        </p>
                        {b.alamat && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5" title={b.alamat}>
                            {b.alamat}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        {assignedTech ? (
                          <>
                            <Wrench className="w-3.5 h-3.5 text-blue-600" />
                            <span>{assignedTech.nama}</span>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600">
                            <AlertTriangle className="w-3.5 h-3.5" /> Belum Ditugaskan
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate('/admin/invoices')}
                          className="h-7.5 px-2 text-xs font-bold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate('/admin/bookings')}
                          className="h-7.5 px-3 text-xs font-bold border-slate-200 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        >
                          Detail
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-white text-slate-500 font-bold uppercase tracking-wider text-xs">
                    <th className="py-3 px-6">Waktu Kunjungan</th>
                    <th className="py-3 px-6">Kode Tiket</th>
                    <th className="py-3 px-6">Pelanggan & Lokasi</th>
                    <th className="py-3 px-6">Paket Servis</th>
                    <th className="py-3 px-6">Status Pengerjaan</th>
                    <th className="py-3 px-6">Teknisi Bertugas</th>
                    <th className="py-3 px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {filteredTodayBookings.map(b => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      <td className="py-3.5 px-6 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          <span>
                            {b.jadwal_mulai ? new Date(b.jadwal_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '-'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {b.kode_booking}
                        </span>
                      </td>

                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {(b.customer?.nama || b.nama || 'P').charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{b.customer?.nama || b.nama || 'Pelanggan'}</p>
                            <p className="text-xs text-slate-500 truncate max-w-xs">{b.alamat || '-'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <p className="font-bold text-slate-900 text-xs">
                          {b.layanan?.nama || b.layanan?.nama_layanan || b.nama_layanan || 'Cuci AC Standard'}
                        </p>
                        <span className="text-xs font-semibold text-slate-500">
                          {b.jumlah_unit || 1} Unit
                        </span>
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <span className={cn(
                          "px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-full border",
                          b.status === 'scheduled' ? "bg-amber-50 text-amber-700 border-amber-200" :
                          b.status === 'on process' ? "bg-blue-50 text-blue-700 border-blue-200" :
                          b.status === 'done' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          b.status === 'delayed' ? "bg-orange-50 text-orange-700 border-orange-200" :
                          b.status === 'cancelled' ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700"
                        )}>
                          {b.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap">
                        {(() => {
                          const assignedTech = getAssignedTechnician(b);
                          if (assignedTech) {
                            return (
                              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                <Wrench className="w-3.5 h-3.5 text-blue-500" />
                                <span>{assignedTech.nama}</span>
                              </div>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                              <AlertTriangle className="w-3 h-3" /> Belum Ditugaskan
                            </span>
                          );
                        })()}
                      </td>

                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/admin/invoices`)}
                            className="rounded-xl text-xs font-bold h-8 px-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate('/admin/bookings')}
                            className="rounded-xl text-xs font-bold h-8 px-2.5 border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Detail
                          </Button>
                        </div>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>

      <AdminCreateBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        technicians={technicians}
        onBookingSuccess={(newBooking) => {
          if (onBookingCreated) {
            onBookingCreated(newBooking);
          }
        }}
      />

    </div>
  );
}

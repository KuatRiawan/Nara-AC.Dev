import { useContext, useEffect, useState, useCallback } from 'react';
import { Routes, Route, Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthContext } from '../../AuthContext';
import { LogOut, Loader2, LayoutDashboard, Wrench, History, Settings, Bell, Globe, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';
import CompanyLogo from '../../components/CompanyLogo';
import { Button } from '../../components/ui/button';
import Breadcrumb from '../../components/ui/Breadcrumb';
import CustomerDashboard from './CustomerDashboard';
import CustomerAcUnits from './CustomerAcUnits';
import CustomerHistory from './CustomerHistory';
import CustomerProfile from './CustomerProfile';
import LogoutConfirmationDialog from '../../components/ui/LogoutConfirmation';
import api from '../../api';

export default function CustomerPortal() {
  const { user, loading: authLoading, confirmLogout, cancelLogout, executeLogout, showLogoutConfirm, isLoggingOut } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.get('/customer/notifications?unread=true&limit=1');
      const total = res?.meta?.total ?? res?.data?.meta?.total ?? (Array.isArray(res?.data) ? res.data.length : 0);
      setUnreadNotifs(total);
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 5000);
    const handleSync = () => fetchUnread();

    window.addEventListener('focus', handleSync);
    window.addEventListener('nara-booking-created', handleSync);
    window.addEventListener('nara-booking-updated', handleSync);
    window.addEventListener('nara-notification-updated', handleSync);
    const handleStorage = (e) => {
      if (e.key === 'nara_booking_sync_timestamp' || e.key === 'nara_notification_sync') {
        fetchUnread();
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
  }, [fetchUnread]);

  useEffect(() => {
    const handleLogout = () => {
      navigate('/login');
    };
    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, [navigate]);

  if (authLoading) return null;

  if (!user || user.role !== 'customer') {
    return <Navigate to="/login" replace />;
  }

  const navItems = [
    { path: '/customer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/customer/ac-units', label: 'Unit AC Saya', icon: Wrench },
    { path: '/customer/history', label: 'Riwayat Servis', icon: History },
    { path: '/customer/settings', label: 'Pengaturan', icon: Settings },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  const getCustomerBreadcrumbItems = () => {
    const path = location.pathname;
    if (path === '/customer/dashboard' || path === '/customer') {
      return [{ label: 'Beranda', to: '/customer/dashboard' }];
    }
    if (path.startsWith('/customer/ac-units')) {
      return [
        { label: 'Beranda', to: '/customer/dashboard' },
        { label: 'Unit AC Saya', to: '/customer/ac-units' }
      ];
    }
    if (path.startsWith('/customer/history')) {
      return [
        { label: 'Beranda', to: '/customer/dashboard' },
        { label: 'Riwayat Servis', to: '/customer/history' }
      ];
    }
    if (path.startsWith('/customer/settings') || path.startsWith('/customer/profile')) {
      return [
        { label: 'Beranda', to: '/customer/dashboard' },
        { label: 'Pengaturan Akun & Profil', to: '/customer/settings' }
      ];
    }
    return [{ label: 'Beranda', to: '/customer/dashboard' }];
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 selection:bg-blue-600 selection:text-white">
        <a href="#main-content" className="sr-only focus:not-sr-only absolute top-0 left-0 z-50 p-4 bg-blue-600 text-white font-bold rounded-br-xl text-sm hover:bg-blue-700 transition-colors">
          Lewati ke Konten Utama
        </a>
        
        <nav className="bg-white/90 backdrop-blur-md border-b border-sky-100/80 sticky top-0 z-40 transition-all animate-in slide-in-from-top-4 duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 sm:h-[72px]">
              <div className="flex items-center gap-6">
                <Link to="/customer/dashboard" className="flex items-center hover:opacity-90 transition-opacity">
                  <CompanyLogo iconSize="h-7 sm:h-8" />
                </Link>

                <div className="hidden md:flex md:items-center md:gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                          active
                            ? "text-blue-700 bg-blue-50 border border-blue-200 shadow-2xs"
                            : "text-slate-600 hover:text-blue-600 hover:bg-sky-50"
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon className={cn("w-4 h-4", active ? "text-blue-600" : "text-slate-500")} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200/90 bg-sky-50/70 hover:bg-sky-100 text-sky-800 hover:text-blue-700 text-xs font-bold transition-all duration-200 shadow-2xs hover:shadow-xs group cursor-pointer mr-0.5"
                  title="Buka Website Publik NARA AC di tab baru"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-600 transition-transform group-hover:rotate-12" />
                  <span>Lihat Website</span>
                  <ExternalLink className="w-3 h-3 text-sky-600/70 ml-0.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    if (location.pathname.startsWith('/customer/dashboard')) {
                      window.dispatchEvent(new CustomEvent('nara-open-customer-notifs'));
                    } else {
                      navigate('/customer/dashboard?notif=1');
                    }
                  }}
                  className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/60 shadow-2xs group"
                  aria-label={unreadNotifs > 0 ? `Notifikasi (${unreadNotifs} belum dibaca)` : "Notifikasi"}
                  title={unreadNotifs > 0 ? `Notifikasi (${unreadNotifs} belum dibaca)` : "Notifikasi"}
                >
                  <Bell className="w-4 h-4 transition-transform group-hover:scale-105" />
                  {unreadNotifs > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-black rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border-2 border-white shadow-xs">
                      {unreadNotifs > 99 ? '99+' : unreadNotifs}
                    </span>
                  )}
                </button>

                <Link
                  to="/customer/settings"
                  className="hidden sm:flex items-center gap-2.5 p-1.5 pr-2.5 rounded-2xl hover:bg-slate-100/80 transition-colors group cursor-pointer"
                  title="Buka Pengaturan Akun & Profil"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs group-hover:scale-105 transition-transform">
                    {(user?.nama || user?.name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{user?.nama || user?.name || 'Pelanggan'}</p>
                    <p className="text-xs text-slate-500 font-medium">Pengaturan Akun</p>
                  </div>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={confirmLogout}
                  disabled={isLoggingOut}
                  className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50 transition-colors"
                >
                  {isLoggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">Keluar</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="md:hidden border-t border-sky-100/60 bg-white/80">
            <div className="max-w-7xl mx-auto px-2">
              <div className="grid grid-cols-4 gap-1 py-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-xl transition-all min-h-[46px]",
                        active
                          ? "text-blue-700 font-bold"
                          : "text-slate-500 hover:text-slate-800 font-medium"
                      )}
                      aria-current={active ? "page" : undefined}
                    >
                      <div className={cn(
                        "p-1.5 rounded-xl transition-all",
                        active ? "bg-blue-50 text-blue-600" : "text-slate-500"
                      )}>
                        <Icon className="w-5 h-5 shrink-0" />
                      </div>
                      <span className="text-xs leading-tight tracking-tight truncate max-w-full text-center">
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Breadcrumb items={getCustomerBreadcrumbItems()} />
              <Routes>
                <Route index element={<Navigate to="/customer/dashboard" replace />} />
                <Route path="dashboard" element={<CustomerDashboard />} />
                <Route path="ac-units" element={<CustomerAcUnits />} />
                <Route path="history" element={<CustomerHistory />} />
                <Route path="settings" element={<CustomerProfile />} />
                <Route path="profile" element={<Navigate to="/customer/settings" replace />} />
                <Route path="*" element={<Navigate to="/customer/dashboard" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>

        <footer className="bg-white border-t border-slate-200/80 py-5 text-xs text-slate-500 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="font-medium text-slate-600">© 2026 CV. Nara Teknindotama. Seluruh hak cipta dilindungi.</p>
            <div className="flex items-center gap-3 font-medium">
              <Link to="/terms" className="hover:text-blue-600 transition-colors">
                Syarat &amp; Ketentuan
              </Link>
              <span className="text-slate-300">&bull;</span>
              <Link to="/privacy" className="hover:text-blue-600 transition-colors">
                Kebijakan Privasi
              </Link>
            </div>
          </div>
        </footer>
      </div>

      <LogoutConfirmationDialog
        isOpen={showLogoutConfirm}
        onConfirm={executeLogout}
        onCancel={cancelLogout}
        message="Apakah Anda yakin ingin mengakhiri sesi sekarang?"
      />
    </>
  );
}

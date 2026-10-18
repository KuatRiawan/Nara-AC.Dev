import { useContext, useEffect, useState, useCallback } from 'react';
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthContext } from '../../AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import NotificationDrawer from '../../components/notifications/NotificationDrawer';
import CustomerDashboard from './CustomerDashboard';
import CustomerAcUnits from './CustomerAcUnits';
import CustomerHistory from './CustomerHistory';
import CustomerProfile from './CustomerProfile';
import api from '../../api';

export default function CustomerPortal() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

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

    const handleOpenDrawer = () => setIsNotifOpen(true);
    window.addEventListener('nara-open-customer-notifs', handleOpenDrawer);

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
      window.removeEventListener('nara-open-customer-notifs', handleOpenDrawer);
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

  const handleOpenNotif = useCallback(() => {
    setIsNotifOpen(true);
  }, []);

  const handleCloseNotif = useCallback(() => {
    setIsNotifOpen(false);
    if (location.search.includes('notif') || location.search.includes('modal=')) {
      const sp = new URLSearchParams(location.search);
      sp.delete('notif');
      sp.delete('modal');
      const clean = sp.toString();
      navigate(location.pathname + (clean ? `?${clean}` : ''), { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  return (
    <DashboardLayout
      role="customer"
      onOpenNotif={handleOpenNotif}
      unreadCount={unreadNotifs}
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            <Routes>
              <Route index element={<Navigate to="/customer/dashboard" replace />} />
              <Route path="dashboard" element={<CustomerDashboard onOpenNotif={handleOpenNotif} />} />
              <Route path="ac-units" element={<CustomerAcUnits />} />
              <Route path="history" element={<CustomerHistory />} />
              <Route path="settings" element={<CustomerProfile />} />
              <Route path="profile" element={<Navigate to="/customer/settings" replace />} />
              <Route path="*" element={<Navigate to="/customer/dashboard" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>

      <NotificationDrawer 
        isOpen={isNotifOpen}
        onClose={handleCloseNotif}
        role="customer"
        onRefreshCount={fetchUnread}
      />
    </DashboardLayout>
  );
}

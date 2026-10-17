import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

function isSafeInternalPath(path) {
  if (!path || typeof path !== 'string') return false;
  const trimmed = path.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return false;
  return true;
}

export function resolveContextualFallback(pathname, searchParams, user, explicitFallback) {
  const fromParam = searchParams?.get('from');
  if (isSafeInternalPath(fromParam)) return fromParam;

  if (searchParams?.get('ac_unit_id') && user?.role === 'customer') {
    return '/customer/ac-units';
  }

  if (isSafeInternalPath(explicitFallback) && explicitFallback !== '/') {
    return explicitFallback;
  }

  if (pathname.startsWith('/admin/')) {
    return '/admin';
  }
  if (pathname.startsWith('/technician/jobs/')) {
    return '/technician';
  }
  if (pathname.startsWith('/customer/') && pathname !== '/customer/dashboard') {
    return '/customer/dashboard';
  }

  if (user?.role === 'admin') {
    if (pathname.startsWith('/status')) return '/admin/bookings';
    return '/admin';
  }
  if (user?.role === 'technician') {
    return '/technician';
  }
  if (user?.role === 'customer') {
    if (pathname.startsWith('/status') || pathname.startsWith('/feedback')) return '/customer/history';
    if (pathname.startsWith('/booking')) return '/customer/dashboard';
    return '/customer/dashboard';
  }

  return isSafeInternalPath(explicitFallback) ? explicitFallback : '/';
}

export function useContextualBack(explicitFallback = '/') {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const fallbackPath = useMemo(() => {
    const stateFrom = location.state?.from;
    if (typeof stateFrom === 'string' && isSafeInternalPath(stateFrom)) {
      return stateFrom;
    }
    if (stateFrom && typeof stateFrom === 'object' && isSafeInternalPath(stateFrom.pathname)) {
      return `${stateFrom.pathname}${stateFrom.search || ''}`;
    }
    return resolveContextualFallback(location.pathname, searchParams, user, explicitFallback);
  }, [location.pathname, location.state, searchParams, user, explicitFallback]);

  const fallbackLabel = useMemo(() => {
    if (fallbackPath.startsWith('/customer/ac-units')) return 'Kembali ke Unit AC Saya';
    if (fallbackPath.startsWith('/customer/history')) return 'Kembali ke Riwayat Servis';
    if (fallbackPath.startsWith('/customer')) return 'Kembali ke Dashboard Pelanggan';
    if (fallbackPath.startsWith('/admin/bookings')) return 'Kembali ke Daftar Booking';
    if (fallbackPath.startsWith('/admin')) return 'Kembali ke Dashboard Admin';
    if (fallbackPath.startsWith('/technician')) return 'Kembali ke Daftar Tugas';
    if (fallbackPath.startsWith('/status/')) return 'Kembali ke Status Tiket';
    if (fallbackPath.startsWith('/booking')) return 'Kembali ke Form Booking';
    return 'Kembali ke Beranda';
  }, [fallbackPath]);

  const goBack = useCallback((e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    const stateFrom = location.state?.from;
    if (typeof stateFrom === 'string' && isSafeInternalPath(stateFrom)) {
      navigate(stateFrom);
      return;
    }
    if (stateFrom && typeof stateFrom === 'object' && isSafeInternalPath(stateFrom.pathname)) {
      navigate(`${stateFrom.pathname}${stateFrom.search || ''}`);
      return;
    }
    const fromParam = searchParams.get('from');
    if (isSafeInternalPath(fromParam)) {
      navigate(fromParam);
      return;
    }
    const historyIdx = typeof window !== 'undefined' ? window.history?.state?.idx : 0;
    if (typeof historyIdx === 'number' && historyIdx > 0) {
      navigate(-1);
      return;
    }
    navigate(fallbackPath);
  }, [location.state, searchParams, navigate, fallbackPath]);

  const handler = useMemo(() => {
    const fn = (e) => goBack(e);
    fn.goBack = goBack;
    fn.fallbackPath = fallbackPath;
    fn.fallbackLabel = fallbackLabel;
    return fn;
  }, [goBack, fallbackPath, fallbackLabel]);

  return handler;
}

export default useContextualBack;

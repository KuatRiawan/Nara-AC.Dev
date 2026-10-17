import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setCsrfToken } from './api';

export const AuthContext = createContext({
  user: null,
  token: null,
  csrfToken: null,
  loading: false,
});

export function useAuth() {
  const context = useContext(AuthContext);
  return context || {};
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [csrfToken, setCsrfTokenState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    api.get('/auth/me')
      .then((res) => {
        if (!isMounted) return;
        const userData = res?.user || res?.data?.user || res;
        if (userData && userData.id) {
          setUser(userData);
          api.get('/auth/csrf-token')
            .then((csrfRes) => {
              if (!isMounted) return;
              setCsrfToken(csrfRes.csrfToken);
              setCsrfTokenState(csrfRes.csrfToken);
            })
            .catch(() => { /* CSRF token akan di-fetch ulang saat dibutuhkan */ });
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const handleExpired = () => {
      setToken(null);
      setUser(null);
      setCsrfToken(null);
      setCsrfTokenState(null);
    };
    window.addEventListener('auth-expired', handleExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('auth-expired', handleExpired);
    };
  }, []);

  const fetchCsrfToken = useCallback(async () => {
    try {
      const res = await api.get('/auth/csrf-token');
      setCsrfToken(res.csrfToken);
      setCsrfTokenState(res.csrfToken);
      return res.csrfToken;
    } catch (err) {
      console.warn('Failed to fetch CSRF token:', err);
      return null;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setUser(res.user);
    await fetchCsrfToken();
    return res;
  }, [fetchCsrfToken]);

  const staffLogin = useCallback(async (email, password) => {
    const res = await api.post('/auth/staff/login', { email, password });
    setUser(res.user);
    await fetchCsrfToken();
    return res;
  }, [fetchCsrfToken]);

  const requestCustomerOtp = useCallback(async (kontak) => {
    const res = await api.post('/auth/customer/request-otp', { kontak });
    return res;
  }, []);

  const verifyCustomerOtp = useCallback(async (kontak, otp) => {
    const res = await api.post('/auth/customer/verify-otp', { kontak, otp });
    setUser(res.user);
    await fetchCsrfToken();
    return res;
  }, [fetchCsrfToken]);

  const registerMember = useCallback(async (formData) => {
    const res = await api.post('/auth/register', formData);
    setUser(res.user);
    await fetchCsrfToken();
    return res;
  }, [fetchCsrfToken]);

  const confirmLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const cancelLogout = useCallback(() => {
    setShowLogoutConfirm(false);
  }, []);

  const executeLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      try {
        await api.post('/auth/logout');
      } catch (err) {
        console.warn('Logout endpoint gagal, melanjutkan logout lokal:', err);
      }
      setToken(null);
      setUser(null);
      setCsrfToken(null);       // clear module-level token di api.js
      setCsrfTokenState(null);  // clear state lokal
      window.dispatchEvent(new Event('auth-logout'));
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  }, []);

  const forceLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    setCsrfToken(null);
    setCsrfTokenState(null);
    setShowLogoutConfirm(false);
    window.dispatchEvent(new Event('auth-logout'));
  }, []);

  const logout = useCallback(() => {
    confirmLogout();
  }, [confirmLogout]);

  const updateUser = useCallback((updatedData) => {
    setUser(prev => ({ ...prev, ...updatedData }));
  }, []);

  const value = {
    user,
    token,
    csrfToken,
    loading,
    login,
    staffLogin,
    requestCustomerOtp,
    verifyCustomerOtp,
    registerMember,
    logout,
    confirmLogout,
    cancelLogout,
    executeLogout,
    forceLogout,
    fetchCsrfToken,
    updateUser,
    isLoggingOut,
    showLogoutConfirm,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

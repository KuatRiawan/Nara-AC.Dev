import axios from 'axios';

let csrfTokenValue = null;

export function setCsrfToken(token) {
  csrfTokenValue = token;
}

export function getCsrfToken() {
  return csrfTokenValue;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  timeout: 60000,
  withCredentials: true, // Enable credentials for cookies (HttpOnly)
});

let refreshingCsrfPromise = null;

async function refreshCsrfToken() {
  if (!refreshingCsrfPromise) {
    refreshingCsrfPromise = axios
      .get((import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1') + '/auth/csrf-token', {
        withCredentials: true,
      })
      .then((res) => {
        const token = res.data?.csrfToken;
        if (token) {
          csrfTokenValue = token;
        }
        return token;
      })
      .catch((err) => {
        csrfTokenValue = null;
        throw err;
      })
      .finally(() => {
        refreshingCsrfPromise = null;
      });
  }
  return refreshingCsrfPromise;
}

const PUBLIC_CSRF_EXEMPT_ROUTES = [
  '/auth/login',
  '/auth/staff/login',
  '/auth/register',
  '/auth/customer/',
  '/auth/csrf-token',
  '/public/',
  '/feedback',
  '/bookings',
  '/ai/',
];

function isPublicRoute(url = '') {
  return PUBLIC_CSRF_EXEMPT_ROUTES.some((route) => url.includes(route));
}

api.interceptors.request.use(async (config) => {
  const stateChangingMethods = ['post', 'put', 'patch', 'delete'];
  if (stateChangingMethods.includes(config.method?.toLowerCase())) {
    if (!csrfTokenValue && !isPublicRoute(config.url || '')) {
      try {
        await refreshCsrfToken();
      } catch {
        // Biarkan request lanjut, backend akan merespon jika diperlukan
      }
    }
    if (csrfTokenValue) {
      config.headers = config.headers || {};
      config.headers['X-CSRF-Token'] = csrfTokenValue;
    }
  }

  if (config.method === 'get') {
    config.params = config.params || {};
    config.params._t = Date.now();
  }

  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    const originalRequest = error.config;
    if (error.response) {
      if (error.response.status === 401) {
        document.cookie = 'nara_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        csrfTokenValue = null;
        window.dispatchEvent(new Event('auth-expired'));
      } else if (
        error.response.status === 403 &&
        error.response.data?.error?.code?.startsWith('CSRF_') &&
        originalRequest &&
        !originalRequest._csrfRetry
      ) {
        originalRequest._csrfRetry = true;
        try {
          const newToken = await refreshCsrfToken();
          if (newToken) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['X-CSRF-Token'] = newToken;
            return api(originalRequest);
          }
        } catch {
          // If refresh fails, fall through to reject
        }
      }
      return Promise.reject(error.response.data);
    }
    return Promise.reject({ error: { message: 'Network error atau server mati' } });
  }
);

export function apiWithCsrf(csrfToken) {
  const apiCsrf = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
    timeout: 60000,
    withCredentials: true,
  });

  apiCsrf.interceptors.request.use((config) => {
    
    const stateChangingMethods = ['post', 'put', 'patch', 'delete'];
    if (stateChangingMethods.includes(config.method?.toLowerCase()) && csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    if (config.method === 'get') {
      config.params = config.params || {};
      config.params._t = Date.now();
    }
    
    return config;
  });

  apiCsrf.interceptors.response.use(
    (response) => response.data,
    (error) => {
      if (axios.isCancel(error)) {
        return Promise.reject(error);
      }
      if (error.response) {
        if (error.response.status === 401) {
          document.cookie = 'nara_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
          window.dispatchEvent(new Event('auth-expired'));
        }
        return Promise.reject(error.response.data);
      }
      return Promise.reject({ error: { message: 'Network error atau server mati' } });
    }
  );

  return apiCsrf;
}

export default api;

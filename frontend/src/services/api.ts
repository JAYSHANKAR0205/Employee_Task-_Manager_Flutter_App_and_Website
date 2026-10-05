/**
 * @file api.ts
 * @description Centralized Axios HTTP Service Instance & Token Refresh Interceptor.
 * 
 * WORK OF THIS FILE:
 * - Instantiates the central Axios HTTP client configured with `withCredentials: true` to automatically include HTTP-Only auth cookies on all requests.
 * - Implements a response interceptor that catches 401 Unauthorized errors caused by expired `accessToken` cookies.
 * - Automatically triggers the `/api/auth/refresh-token` endpoint to issue new token cookies and transparently retries queued failed requests without logging the user out.
 * 
 * WHY IS IT IN THE FILE STRUCTURE:
 * - Decouples HTTP networking from UI components. Centralizing requests ensures consistent CORS headers, base URL handling, error interceptors, and cookie-based authentication handling across the entire app.
 */

import axios from 'axios';
import Cookies from 'js-cookie';

// Create a centralized Axios instance configured for HttpOnly Cookies
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Crucial for automatically sending and receiving HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Response Interceptor: Automatic Silent Token Refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const publicRoutes = ['/login', '/register', '/forgot-password', '/verify', '/complete-profile'];
    const isPublicRoute = publicRoutes.includes(window.location.pathname);

    // Do not attempt token refresh for login, register, forgot-password, or refresh-token requests
    if (
      originalRequest?.url?.includes('/login') ||
      originalRequest?.url?.includes('/register') ||
      originalRequest?.url?.includes('/refresh-token') ||
      originalRequest?.url?.includes('/google') ||
      (isPublicRoute && originalRequest?.url?.includes('/auth/me'))
    ) {
      return Promise.reject(error);
    }

    if (
      error.response &&
      (error.response.status === 403 || error.response.data?.code === 'USER_BLOCKED') &&
      (error.response.data?.code === 'USER_BLOCKED' || (typeof error.response.data?.error === 'string' && error.response.data?.error.toLowerCase().includes('block')))
    ) {
      Cookies.remove('cached_user_profile', { path: '/' });
      try { localStorage.clear(); } catch (e) {}
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?blocked=true';
      }
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh-token');
        processQueue();
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr);
        const publicRoutes = ['/login', '/register', '/forgot-password', '/verify', '/complete-profile'];
        if (!publicRoutes.includes(window.location.pathname)) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign sandboxed Vite WebSocket warning events so they do not trigger unhandled rejection overlays
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    if (msg.includes('WebSocket') || msg.includes('websocket') || msg.includes('vite')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (msg.includes('WebSocket') || msg.includes('websocket') || msg.includes('vite')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  // Prevent pinch-zoom gestures and double-tap zoom for PWA native feel
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      const target = e.target as HTMLElement;
      if (target && !['INPUT', 'TEXTAREA', 'SELECT', 'A', 'BUTTON'].includes(target.tagName)) {
        e.preventDefault();
      }
    }
    lastTouchEnd = now;
  }, { passive: false });

  // Global fetch interceptor to automatically attach authorization header
  const { fetch: originalFetch } = window;
  window.fetch = async (resource, config) => {
    const url = typeof resource === 'string'
      ? resource
      : resource instanceof URL
        ? resource.toString()
        : resource.url;

    if (url.startsWith('/api/') && !url.includes('/api/auth/')) {
      const newConfig = { ...(config || {}) };
      const headers = { ...(newConfig.headers || {}) } as Record<string, string>;

      // Clean up invalid Bearer null / Bearer undefined headers
      for (const k of Object.keys(headers)) {
        if (k.toLowerCase() === 'authorization') {
          const val = headers[k];
          if (!val || val === 'Bearer null' || val === 'Bearer undefined' || val === 'Bearer ') {
            delete headers[k];
          }
        }
      }

      const hasAuth = Object.keys(headers).some(k => k.toLowerCase() === 'authorization');
      const isProxyWithServiceAccount = url.startsWith('/api/calendar-proxy/') && headers['Authorization'] === 'Bearer service_account_active';

      if (!hasAuth || isProxyWithServiceAccount) {
        const adminToken = localStorage.getItem('admin_token');
        const clientToken = localStorage.getItem('client_token');

        const isAdminRoute = url.startsWith('/api/db/') || 
                             url.startsWith('/api/admin/') || 
                             url.startsWith('/api/financeiro/') || 
                             url.startsWith('/api/funcionarios') ||
                             url.startsWith('/api/folgas') ||
                             url.startsWith('/api/manutencoes') ||
                             url.startsWith('/api/mecanicos') ||
                             url.startsWith('/api/catalogo-epis') ||
                             url.startsWith('/api/epis') ||
                             url.startsWith('/api/whatsapp/') ||
                             url.startsWith('/api/config') ||
                             url.startsWith('/api/comercial/');

        const token = isAdminRoute ? adminToken : (adminToken || clientToken);
        if (token && token !== 'null' && token !== 'undefined') {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      newConfig.headers = headers;
      const response = await originalFetch(resource, newConfig);
      if (response.status === 401) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_username');
        localStorage.removeItem('client_token');
        localStorage.removeItem('client_data');
        localStorage.removeItem('client_data_cache');
        window.dispatchEvent(new CustomEvent('auth-expired'));
      }
      return response;
    }

    const response = await originalFetch(resource, config);
    if (response.status === 401 && !url.includes('/api/auth/')) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_username');
      localStorage.removeItem('client_token');
      localStorage.removeItem('client_data');
      localStorage.removeItem('client_data_cache');
      window.dispatchEvent(new CustomEvent('auth-expired'));
    }
    return response;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

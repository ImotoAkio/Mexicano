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

      const hasAuth = Object.keys(headers).some(k => k.toLowerCase() === 'authorization');
      const isProxyWithServiceAccount = url.startsWith('/api/calendar-proxy/') && headers['Authorization'] === 'Bearer service_account_active';

      if (!hasAuth || isProxyWithServiceAccount) {
        const adminToken = localStorage.getItem('admin_token');
        const clientToken = localStorage.getItem('client_token');
        const token = adminToken || clientToken;
        if (token) {
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
        window.location.reload();
      }
      return response;
    }

    const response = await originalFetch(resource, config);
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_username');
      localStorage.removeItem('client_token');
      localStorage.removeItem('client_data');
      window.location.reload();
    }
    return response;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

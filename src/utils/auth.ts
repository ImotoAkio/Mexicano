export const getAdminToken = () => {
  const token = localStorage.getItem('admin_token');
  if (!token) {
    if (window.location.pathname.startsWith('/admin') || window.location.pathname === '/') {
       window.location.href = '/login';
    }
    return null;
  }
  return token;
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAdminToken();
  if (!token) {
    throw new Error('Não autenticado');
  }
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };
  
  return fetch(url, { ...options, headers });
};

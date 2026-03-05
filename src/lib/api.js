// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Get the auth token from localStorage
const getAuthToken = () => localStorage.getItem('crm_token');

// Generic fetch wrapper with auth
export async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  // Handle 401 unauthorized - redirect to login
  if (response.status === 401) {
    const userData = localStorage.getItem('crm_user');
    const isClient = userData && JSON.parse(userData).role === 'client';
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    window.location.href = isClient ? '/merchant/login' : '/login';
    return { success: false, message: 'Session expired' };
  }

  const data = await response.json();

  // D.6 — Handle plan limit / feature gate responses
  if (response.status === 403 && data?.upgrade_required) {
    // Dispatch custom event so UpgradeModal can be shown globally
    window.dispatchEvent(new CustomEvent('plan-upgrade-required', { detail: data }));
    return { ...data, success: false };
  }

  return data;
}

// Convenience methods
export const api = {
  get: (endpoint) => apiFetch(endpoint, { method: 'GET' }),
  
  post: (endpoint, data) => apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  put: (endpoint, data) => apiFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  patch: (endpoint, data) => apiFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  delete: (endpoint) => apiFetch(endpoint, { method: 'DELETE' }),
};

export default api;


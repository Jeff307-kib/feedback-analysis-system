const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {}
    throw new Error(errorMessage);
  }

  return response.json();
};

export const authApi = {
  login: (data: any) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: any) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
};

export const plansApi = {
  getAll: () => apiFetch('/plans'),
  create: (data: any) => apiFetch('/plans', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => apiFetch(`/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch(`/plans/${id}`, { method: 'DELETE' }),
};

export const subscriptionsApi = {
  getMe: () => apiFetch('/subscriptions/me'),
  purchase: (planId: number) => apiFetch('/subscriptions/purchase', { method: 'POST', body: JSON.stringify({ planId }) }),
};

export const datasetsApi = {
  get: () => apiFetch('/datasets'),
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/datasets/upload', {
      method: 'POST',
      body: formData,
    });
  },
  delete: (id: number) => apiFetch(`/datasets/${id}`, { method: 'DELETE' }),
};

export const reportsApi = {
  getOverview: (datasetId: number) => apiFetch(`/reports/${datasetId}/overview`),
  getDrilldown: (datasetId: number, params: Record<string, string>) => {
    const searchParams = new URLSearchParams(params);
    return apiFetch(`/reports/${datasetId}/drilldown?${searchParams.toString()}`);
  }
};

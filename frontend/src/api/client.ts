import axios, { AxiosError } from 'axios';
import { ApiResponse, DashboardStats, ActivityDataPoint, Email, EmailStatus, User } from '../types';

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || envUrl.trim() === '') {
    return '/api';
  }
  let cleaned = envUrl.trim().replace(/\/+$/, '');
  // If the URL does not end with /api, append /api so endpoints map correctly
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }
  return cleaned;
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle unauthenticated 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('reachinbox_token');
      localStorage.removeItem('reachinbox_user');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const res = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', credentials);
    return res.data;
  },
  register: async (payload: { name: string; email: string; password: string }) => {
    const res = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', payload);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get<ApiResponse<User>>('/auth/me');
    return res.data;
  },
};

export const emailApi = {
  schedule: async (data: { recipient: string; subject: string; body: string; scheduledAt: string; timezone?: string }) => {
    const res = await api.post<ApiResponse<Email>>('/emails/schedule', data);
    return res.data;
  },
  getAll: async (params?: { page?: number; limit?: number; status?: EmailStatus; search?: string; sortBy?: string; sortOrder?: string }) => {
    const res = await api.get<ApiResponse<Email[]>>('/emails', { params });
    return res.data;
  },
  getScheduled: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await api.get<ApiResponse<Email[]>>('/emails/scheduled', { params });
    return res.data;
  },
  getSent: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await api.get<ApiResponse<Email[]>>('/emails/sent', { params });
    return res.data;
  },
  getFailed: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await api.get<ApiResponse<Email[]>>('/emails/failed', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get<ApiResponse<Email>>(`/emails/${id}`);
    return res.data;
  },
  update: async (id: string, data: { recipient?: string; subject?: string; body?: string; scheduledAt?: string }) => {
    const res = await api.put<ApiResponse<Email>>(`/emails/${id}`, data);
    return res.data;
  },
  cancel: async (id: string) => {
    const res = await api.delete<ApiResponse<Email>>(`/emails/${id}/cancel`);
    return res.data;
  },
  retry: async (id: string) => {
    const res = await api.post<ApiResponse<Email>>(`/emails/${id}/retry`);
    return res.data;
  },
};

export const dashboardApi = {
  getStats: async () => {
    const res = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats');
    return res.data;
  },
  getActivity: async (days = 7) => {
    const res = await api.get<ApiResponse<ActivityDataPoint[]>>(`/dashboard/activity?days=${days}`);
    return res.data;
  },
};

export default api;


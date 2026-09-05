import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE = '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const msg = error.response?.data?.message || error.message || 'An error occurred';
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (error.response?.status !== 404) {
      toast.error(msg);
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  refresh: (data) => api.post('/auth/refresh', data),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Mines
export const minesApi = {
  getAll: (params) => api.get('/mines', { params }),
  getById: (id) => api.get(`/mines/${id}`),
  getStats: (id) => api.get(`/mines/${id}/stats`),
  create: (data) => api.post('/mines', data),
  update: (id, data) => api.put(`/mines/${id}`, data),
  delete: (id) => api.delete(`/mines/${id}`),
};

// Violations
export const violationsApi = {
  getAll: (params) => api.get('/violations', { params }),
  getById: (id) => api.get(`/violations/${id}`),
  create: (data) => api.post('/violations', data),
  update: (id, data) => api.put(`/violations/${id}`, data),
  delete: (id) => api.delete(`/violations/${id}`),
  getCorrectiveActions: (params) => api.get('/violations/corrective-actions', { params }),
  createCorrectiveAction: (data) => api.post('/violations/corrective-actions', data),
  updateCorrectiveAction: (id, data) => api.put(`/violations/corrective-actions/${id}`, data),
};

// Incidents
export const incidentsApi = {
  getAll: (params) => api.get('/incidents', { params }),
  getById: (id) => api.get(`/incidents/${id}`),
  create: (data) => api.post('/incidents', data),
  update: (id, data) => api.put(`/incidents/${id}`, data),
  getStats: () => api.get('/incidents/stats'),
};

// Environment
export const environmentApi = {
  getReadings: (params) => api.get('/environment', { params }),
  createReading: (data) => api.post('/environment', data),
  getAlerts: () => api.get('/environment/alerts'),
  getDashboard: () => api.get('/environment/dashboard'),
  getTrends: (params) => api.get('/environment/trends', { params }),
  getLatestByMine: (id) => api.get(`/environment/mine/${id}/latest`),
};

// Inspections
export const inspectionsApi = {
  getAll: (params) => api.get('/inspections', { params }),
  getById: (id) => api.get(`/inspections/${id}`),
  create: (data) => api.post('/inspections', data),
  update: (id, data) => api.put(`/inspections/${id}`, data),
  saveChecklist: (data) => api.post('/inspections/checklist', data),
  getSchedule: (params) => api.get('/inspections/schedule', { params }),
};

// Documents
export const documentsApi = {
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, data) => api.put(`/documents/${id}`, data),
  delete: (id) => api.delete(`/documents/${id}`),
  getExpiryAlerts: () => api.get('/documents/expiry-alerts'),
  analyze: (id) => api.post(`/documents/${id}/analyze`),
};

// Notifications
export const notificationsApi = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/all/read'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// Analytics
export const analyticsApi = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getComplianceTrend: (params) => api.get('/analytics/compliance-trend', { params }),
  getMineRanking: () => api.get('/analytics/mine-ranking'),
  getViolationAnalytics: (params) => api.get('/analytics/violations', { params }),
  getProductionAnalytics: () => api.get('/analytics/production'),
  getAuditLogs: (params) => api.get('/analytics/audit-logs', { params }),
};

// Compliance
export const complianceApi = {
  getRecords: (params) => api.get('/compliance/records', { params }),
  create: (data) => api.post('/compliance/records', data),
  update: (id, data) => api.put(`/compliance/records/${id}`, data),
  getMineScore: (id) => api.get(`/compliance/mine/${id}/score`),
  runAiAssessment: (id) => api.post(`/compliance/mine/${id}/ai-assessment`),
  getRegulations: (params) => api.get('/compliance/regulations', { params }),
  createRegulation: (data) => api.post('/compliance/regulations', data),
};

// Reports
export const reportsApi = {
  downloadPDF: (params) => api.get('/reports/pdf', { params, responseType: 'blob' }),
  downloadExcel: (params) => api.get('/reports/excel', { params, responseType: 'blob' }),
};

// AI
export const aiApi = {
  chat: (data) => api.post('/ai/chat', data),
  getChatHistory: (sessionId) => api.get(`/ai/chat/${sessionId}`),
  getSessions: () => api.get('/ai/chat/sessions'),
  getRiskPrediction: (mineId) => api.get(`/ai/risk/${mineId}`),
  getUsers: () => api.get('/ai/users'),
  updateUser: (id, data) => api.put(`/ai/users/${id}`, data),
};

export default api;

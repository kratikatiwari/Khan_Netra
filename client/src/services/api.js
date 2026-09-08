import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * API base URL strategy:
 *   Dev:        Vite proxy forwards /api/v1 → http://localhost:5000/api/v1
 *               (set in vite.config.js — no CORS issue, no hardcoded IPs)
 *   Production: If API and frontend share the same origin, keep '/api/v1'.
 *               If API is on a different origin, set in client/.env.production:
 *                 VITE_API_URL=https://api.khannetra.yourdomain.in/api/v1
 */
const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (err) => Promise.reject(err));

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const status = err.response?.status;
    const msg    = err.response?.data?.message || err.message || 'An error occurred';
    const url    = err.config?.url || '';

    // Auth routes handle their own errors — don't double-toast
    const isAuthRoute = url.includes('/auth/');

    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if NOT on an auth page and NOT an auth API call
      if (!isAuthRoute && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (status === 429) {
      // Rate limit — show once, not doubled
      if (!isAuthRoute) toast.error('Too many requests. Please try again later.');
    } else if (status && status !== 404 && status !== 400 && status !== 403 && status !== 409) {
      // Only show toast for unexpected server errors; let auth/form components handle 400/403/409
      if (!isAuthRoute) toast.error(msg);
    }

    return Promise.reject(err);
  }
);

export const authApi = {
  login:               (d) => api.post('/auth/login', d),
  register:            (d) => api.post('/auth/register', d),
  verifyEmail:         (token) => api.get('/auth/verify-email', { params: { token } }),
  resendVerification:  (d) => api.post('/auth/resend-verification', d),
  getMe:               ()  => api.get('/auth/me'),
  refresh:             (d) => api.post('/auth/refresh', d),
  updateProfile:       (d) => api.put('/auth/profile', d),
  changePassword:      (d) => api.put('/auth/change-password', d),
};

export const minesApi = {
  getAll:   (p)     => api.get('/mines', { params: p }),
  getById:  (id)    => api.get(`/mines/${id}`),
  getStats: (id)    => api.get(`/mines/${id}/stats`),
  create:   (d)     => api.post('/mines', d),
  update:   (id, d) => api.put(`/mines/${id}`, d),
  delete:   (id)    => api.delete(`/mines/${id}`),
};

export const violationsApi = {
  getAll:                 (p)      => api.get('/violations', { params: p }),
  getById:                (id)     => api.get(`/violations/${id}`),
  create:                 (d)      => api.post('/violations', d),
  update:                 (id, d)  => api.put(`/violations/${id}`, d),
  delete:                 (id)     => api.delete(`/violations/${id}`),
  getCorrectiveActions:   (p)      => api.get('/violations/corrective-actions', { params: p }),
  createCorrectiveAction: (d)      => api.post('/violations/corrective-actions', d),
  updateCorrectiveAction: (id, d)  => api.put(`/violations/corrective-actions/${id}`, d),
};

export const incidentsApi = {
  getAll:   (p)     => api.get('/incidents', { params: p }),
  getById:  (id)    => api.get(`/incidents/${id}`),
  create:   (d)     => api.post('/incidents', d),
  update:   (id, d) => api.put(`/incidents/${id}`, d),
  getStats: ()      => api.get('/incidents/stats'),
};

export const environmentApi = {
  getReadings:     (p)  => api.get('/environment', { params: p }),
  createReading:   (d)  => api.post('/environment', d),
  getAlerts:       ()   => api.get('/environment/alerts'),
  getDashboard:    ()   => api.get('/environment/dashboard'),
  getTrends:       (p)  => api.get('/environment/trends', { params: p }),
  getLatestByMine: (id) => api.get(`/environment/mine/${id}/latest`),
};

export const inspectionsApi = {
  getAll:        (p)     => api.get('/inspections', { params: p }),
  getById:       (id)    => api.get(`/inspections/${id}`),
  create:        (d)     => api.post('/inspections', d),
  update:        (id, d) => api.put(`/inspections/${id}`, d),
  saveChecklist: (d)     => api.post('/inspections/checklist', d),
  getSchedule:   (p)     => api.get('/inspections/schedule', { params: p }),
};

export const documentsApi = {
  getAll:          (p)     => api.get('/documents', { params: p }),
  getById:         (id)    => api.get(`/documents/${id}`),
  upload:          (fd)    => api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:          (id, d) => api.put(`/documents/${id}`, d),
  delete:          (id)    => api.delete(`/documents/${id}`),
  getExpiryAlerts: ()      => api.get('/documents/expiry-alerts'),
  analyze:         (id)    => api.post(`/documents/${id}/analyze`),
};

export const notificationsApi = {
  getAll:        (p)  => api.get('/notifications', { params: p }),
  getUnreadCount:()   => api.get('/notifications/unread-count'),
  markRead:      (id) => api.put(`/notifications/${id}/read`),
  markAllRead:   ()   => api.put('/notifications/all/read'),
  delete:        (id) => api.delete(`/notifications/${id}`),
};

export const analyticsApi = {
  getDashboard:         ()  => api.get('/analytics/dashboard'),
  getComplianceTrend:   (p) => api.get('/analytics/compliance-trend', { params: p }),
  getMineRanking:       ()  => api.get('/analytics/mine-ranking'),
  getViolationAnalytics:(p) => api.get('/analytics/violations', { params: p }),
  getProductionAnalytics:() => api.get('/analytics/production'),
  getAuditLogs:         (p) => api.get('/analytics/audit-logs', { params: p }),
};

export const complianceApi = {
  getRecords:       (p)     => api.get('/compliance/records', { params: p }),
  create:           (d)     => api.post('/compliance/records', d),
  update:           (id, d) => api.put(`/compliance/records/${id}`, d),
  getMineScore:     (id)    => api.get(`/compliance/mine/${id}/score`),
  runAiAssessment:  (id)    => api.post(`/compliance/mine/${id}/ai-assessment`),
  getRegulations:   (p)     => api.get('/compliance/regulations', { params: p }),
  createRegulation: (d)     => api.post('/compliance/regulations', d),
};

export const reportsApi = {
  downloadPDF:   (p) => api.get('/reports/pdf',   { params: p, responseType: 'blob' }),
  downloadExcel: (p) => api.get('/reports/excel', { params: p, responseType: 'blob' }),
};

export const aiApi = {
  getStatus:         ()       => api.get('/ai/status'),
  chat:              (d)      => api.post('/ai/chat', d),
  getSessions:       ()       => api.get('/ai/chat/sessions'),
  getChatHistory:    (sid)    => api.get(`/ai/chat/${sid}`),
  deleteSession:     (sid)    => api.delete(`/ai/chat/${sid}`),
  clearSession:      (sid)    => api.delete(`/ai/chat/${sid}/clear`),
  getRiskPrediction: (id)     => api.get(`/ai/risk/${id}`),
  getUsers:          ()       => api.get('/ai/users'),
  updateUser:        (id, d)  => api.put(`/ai/users/${id}`, d),
};

// ── NEW: AI Safety Vision ─────────────────────────────────────────────────────
export const visionApi = {
  health:       ()   => api.get('/vision/health'),
  ppeReference: ()   => api.get('/vision/ppe-reference'),
  /**
   * Detect PPE in an image file.
   * @param {File}   imageFile
   * @param {object} opts  { mine_type, mine_id, location, min_confidence }
   */
  detect: (imageFile, opts = {}) => {
    const fd = new FormData();
    fd.append('image', imageFile);
    if (opts.mine_type)       fd.append('mine_type',       opts.mine_type);
    if (opts.mine_id)         fd.append('mine_id',         opts.mine_id);
    if (opts.location)        fd.append('location',        opts.location);
    if (opts.min_confidence)  fd.append('min_confidence',  String(opts.min_confidence));
    return api.post('/vision/detect', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 45000,
    });
  },
};

// ── Contractors ───────────────────────────────────────────────────────────────
export const contractorsApi = {
  getAll:   (p)     => api.get('/contractors', { params: p }),
  getById:  (id)    => api.get(`/contractors/${id}`),
  getStats: (p)     => api.get('/contractors/stats', { params: p }),
  create:   (d)     => api.post('/contractors', d),
  update:   (id, d) => api.put(`/contractors/${id}`, d),
  delete:   (id)    => api.delete(`/contractors/${id}`),
};

// ── Field Reports ─────────────────────────────────────────────────────────────
export const fieldReportsApi = {
  getAll:   (p)     => api.get('/field-reports', { params: p }),
  getById:  (id)    => api.get(`/field-reports/${id}`),
  getMap:   (p)     => api.get('/field-reports/map', { params: p }),
  create:   (fd)    => api.post('/field-reports', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:   (id, d) => api.put(`/field-reports/${id}`, d),
};

// ── Compliance Deadlines ──────────────────────────────────────────────────────
export const deadlinesApi = {
  getAll:     (p)     => api.get('/deadlines', { params: p }),
  getOverdue: (p)     => api.get('/deadlines/overdue', { params: p }),
  getUpcoming:(p)     => api.get('/deadlines/upcoming', { params: p }),
  create:     (d)     => api.post('/deadlines', d),
  update:     (id, d) => api.put(`/deadlines/${id}`, d),
};

// ── Risk Dashboard ────────────────────────────────────────────────────────────
export const riskApi = {
  getHighRisk:  ()  => api.get('/risk/high-risk'),
  getRoleBased: ()  => api.get('/risk/role-based'),
  getGis:       (p) => api.get('/risk/gis', { params: p }),
};

export default api;

// ── OCR Document Extractor ────────────────────────────────────────────────────
export const ocrApi = {
  health:  () => api.get('/ocr/health'),
  extract: (formData) => api.post('/ocr/extract', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  }),
};

// ── Disaster Alert System ─────────────────────────────────────────────────────
export const disasterApi = {
  getActive:    ()         => api.get('/disaster/active'),
  getAlerts:    (p)        => api.get('/disaster/alerts',  { params: p }),
  getHistory:   (p)        => api.get('/disaster/history', { params: p }),
  getStats:     ()         => api.get('/disaster/stats'),
  acknowledge:  (id)       => api.post(`/disaster/acknowledge/${id}`),
  resolve:      (id, data) => api.post(`/disaster/resolve/${id}`, data),
  createTest:   ()         => api.post('/disaster/test'),
  pollNow:      ()         => api.post('/disaster/poll'),
};

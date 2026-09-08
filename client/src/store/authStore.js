import { create } from 'zustand';
import { authApi } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,

  login: async (credentials) => {
    set({ loading: true });
    try {
      const res = await authApi.login(credentials);
      const { user, token } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, loading: false });
      return { success: true };
    } catch (err) {
      set({ loading: false });
      const data   = err.response?.data || {};
      const status = err.response?.status;
      return {
        success: false,
        message: status === 429
          ? 'Too many login attempts. Please wait 15 minutes and try again.'
          : (data.message || 'Sign in failed.'),
        code:   status === 429 ? 'RATE_LIMITED' : (data.code || null),
        status,
      };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    try {
      const res = await authApi.getMe();
      const user = res.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
    } catch {}
  },

  hasRole: (...roles) => {
    const user = get().user;
    return user && roles.includes(user.role);
  },

  canAccess: (requiredRoles) => {
    const user = get().user;
    if (!user) return false;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.includes(user.role);
  },
}));

export default useAuthStore;

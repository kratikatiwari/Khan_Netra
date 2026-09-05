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
      return { success: false, message: err.response?.data?.message || 'Login failed' };
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

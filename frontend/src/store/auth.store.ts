import { create } from 'zustand';

interface User {
  _id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  class?: string;
  section?: string;
  profileImage?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  init: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  setAuth: (user, token) => {
    localStorage.setItem('manexa_token', token);
    localStorage.setItem('manexa_user', JSON.stringify(user));
    set({ user, token, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('manexa_token');
    localStorage.removeItem('manexa_user');
    set({ user: null, token: null });
    window.location.href = '/login';
  },

  init: () => {
    const token = localStorage.getItem('manexa_token');
    const userStr = localStorage.getItem('manexa_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ user, token, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));

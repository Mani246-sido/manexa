import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('manexa_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('manexa_token');
      localStorage.removeItem('manexa_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/auth/change-password', data),
};

// Admin
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params?: object) => api.get('/admin/users', { params }),
  createUser: (data: object) => api.post('/admin/users', data),
  updateUser: (id: string, data: object) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
};

// Attendance
export const attendanceApi = {
  get: (params?: object) => api.get('/attendance', { params }),
  markManual: (data: object) => api.post('/attendance/manual', data),
  markBulk: (data: object) => api.post('/attendance/bulk', data),
  markByFace: (data: object) => api.post('/attendance/face', data),
  registerFace: (data: object) => api.post('/attendance/register-face', data),
  getSummary: (studentId: string) => api.get(`/attendance/summary/${studentId}`),
};

// Teacher
export const teacherApi = {
  getStudents: (params?: object) => api.get('/teachers/students', { params }),
};

// Dashboard analytics
export const dashboardApi = {
  getAnalytics: () => api.get('/dashboard/analytics'),
};

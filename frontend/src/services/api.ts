import axios from 'axios';
import { useAppStore } from '../store/useAppStore';

// Vite proxy redirige /api → http://localhost:3000/api (sin CORS)
const api = axios.create({ baseURL: '/api', timeout: 10000 });

api.interceptors.request.use(config => {
  const token = useAppStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    const message = err.response?.data?.error || 'Error de conexión';
    return Promise.reject(new Error(message));
  }
);

export default api;

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { PairingResponse } from '../types';

/**
 * URL del backend según entorno:
 *   - Emulador Android  → http://10.0.2.2:3000/api
 *   - Simulador iOS     → http://localhost:3000/api
 *   - Dispositivo físico → http://<IP-de-tu-PC>:3000/api
 */
const API_URL = 'http://10.0.2.2:3000/api';

const api = axios.create({ baseURL: API_URL, timeout: 10000 });

api.interceptors.request.use(async config => {
  const token = await SecureStore.getItemAsync('auth_token');
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

// ─── Servicios de IA ──────────────────────────────────────────────────────────
export const aiService = {
  /** Sugerencias de maridaje para un plato */
  getPairing: (itemId: string): Promise<PairingResponse> =>
    api.post('/ai/pairing', { itemId }).then(r => r.data),
};

export default api;

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

// ---------------------------------------------------------------------------
// AI Service helpers
// ---------------------------------------------------------------------------

export interface PairingSuggestion {
  id: string | null;
  name: string;
  price: number | null;
  category: string | null;
  reason: string;
}

export interface PairingResponse {
  item: { id: string; name: string };
  suggestions: PairingSuggestion[];
}

export interface ShiftSummaryResponse {
  summary: string;
  stats: Record<string, string | number>;
}

export interface DelayAlert {
  orderId: string;
  tableId: string;
  elapsedMinutes: number;
  threshold: number;
}

export interface DelayCheckResponse {
  alerts: DelayAlert[];
  message: string;
  avgHistoricalMinutes?: number;
}

export interface MenuRecommendation {
  id: string | null;
  name: string;
  price: number | null;
  category: string | null;
  reason: string;
}

export interface MenuRecommendationsResponse {
  recommendations: MenuRecommendation[];
  period: string;
  hour: number;
}

export const aiService = {
  getPairing: (itemId: string): Promise<PairingResponse> =>
    api.post('/ai/pairing', { itemId }).then(r => r.data),

  getShiftSummary: (): Promise<ShiftSummaryResponse> =>
    api.get('/ai/shift-summary').then(r => r.data),

  getDelayCheck: (): Promise<DelayCheckResponse> =>
    api.get('/ai/delay-check').then(r => r.data),

  getMenuRecommendations: (): Promise<MenuRecommendationsResponse> =>
    api.get('/ai/menu-recommendations').then(r => r.data),
};

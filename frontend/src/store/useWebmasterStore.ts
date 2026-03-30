import { create } from 'zustand';

export interface Tenant {
  id:                       string;
  slug:                     string;
  name:                     string;
  status:                   'active' | 'suspended' | 'trial';
  plan:                     string;
  admin_email:              string;
  dodo_customer_id:         string | null;
  dodo_subscription_id:     string | null;
  dodo_subscription_status: string | null;
  trial_ends_at:            string | null;
  created_at:               string;
}

interface WebmasterState {
  token:       string | null;
  webmaster:   { id: string; name: string; email: string } | null;
  tenants:     Tenant[];
  loading:     boolean;
  error:       string | null;

  login:              (email: string, password: string) => Promise<void>;
  logout:             () => void;
  fetchTenants:       () => Promise<void>;
  createTenant:       (data: { slug: string; name: string; admin_email: string; plan: string; country: string }) => Promise<unknown>;
  updateTenant:       (id: string, data: Partial<Pick<Tenant, 'name' | 'plan' | 'status'>>) => Promise<void>;
  suspendTenant:      (id: string) => Promise<void>;
  activateTenant:     (id: string) => Promise<void>;
  deleteTenant:       (id: string) => Promise<void>;
  clearError:         () => void;
}

const API_BASE = '/webmaster/api';

async function wmFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const useWebmasterStore = create<WebmasterState>((set, get) => ({
  token:     localStorage.getItem('wm_token'),
  webmaster: (() => { try { return JSON.parse(localStorage.getItem('wm_user') || 'null'); } catch { return null; } })(),
  tenants:   [],
  loading:   false,
  error:     null,

  async login(email, password) {
    set({ loading: true, error: null });
    try {
      const data = await wmFetch<{ token: string; webmaster: { id: string; name: string; email: string } }>(
        '/login',
        { method: 'POST', body: JSON.stringify({ email, password }) }
      );
      localStorage.setItem('wm_token', data.token);
      localStorage.setItem('wm_user', JSON.stringify(data.webmaster));
      set({ token: data.token, webmaster: data.webmaster, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  logout() {
    localStorage.removeItem('wm_token');
    localStorage.removeItem('wm_user');
    set({ token: null, webmaster: null, tenants: [] });
  },

  async fetchTenants() {
    set({ loading: true, error: null });
    try {
      const tenants = await wmFetch<Tenant[]>('/tenants', {}, get().token);
      set({ tenants, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  async createTenant(data) {
    const result = await wmFetch<any>(
      '/tenants',
      { method: 'POST', body: JSON.stringify(data) },
      get().token
    );
    set(s => ({ tenants: [result.tenant, ...s.tenants] }));
    return result;
  },

  async updateTenant(id, data) {
    const updated = await wmFetch<Tenant>(
      `/tenants/${id}`,
      { method: 'PATCH', body: JSON.stringify(data) },
      get().token
    );
    set(s => ({ tenants: s.tenants.map(t => t.id === id ? updated : t) }));
  },

  async suspendTenant(id) {
    const updated = await wmFetch<Tenant>(
      `/tenants/${id}/suspend`,
      { method: 'POST' },
      get().token
    );
    set(s => ({ tenants: s.tenants.map(t => t.id === id ? updated : t) }));
  },

  async activateTenant(id) {
    const updated = await wmFetch<Tenant>(
      `/tenants/${id}/activate`,
      { method: 'POST' },
      get().token
    );
    set(s => ({ tenants: s.tenants.map(t => t.id === id ? updated : t) }));
  },

  async deleteTenant(id) {
    await wmFetch(`/tenants/${id}`, { method: 'DELETE' }, get().token);
    set(s => ({ tenants: s.tenants.filter(t => t.id !== id) }));
  },

  clearError() {
    set({ error: null });
  },
}));

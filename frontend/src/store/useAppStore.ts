import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { User, Table, MenuItem, Order, OrderItemStatus } from '../types';

interface AppState {
  user: User | null;
  token: string | null;
  tables: Table[];
  menuItems: MenuItem[];
  currentOrder: Order | null;
  kitchenOrders: Order[];

  // flags separados por dominio
  orderLoading: boolean;
  menuLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;

  fetchTables: () => Promise<void>;
  fetchMenu: () => Promise<void>;

  fetchOrCreateOrder: (tableId: string) => Promise<void>;
  addOrderItem: (tableId: string, menuItemId: string, quantity: number, notes?: string) => Promise<void>;
  removeOrderItem: (orderId: string, itemId: string) => Promise<void>;
  sendOrderToKitchen: (orderId: string) => Promise<void>;
  requestBilling: (orderId: string) => Promise<void>;
  closeTable: (orderId: string) => Promise<void>;
  markDelivered: (orderId: string) => Promise<void>;

  updateOrderItemQuantity: (orderId: string, itemId: string, quantity: number) => Promise<void>;

  fetchKitchenOrders: () => Promise<void>;
  updateItemStatus: (itemId: string, status: OrderItemStatus) => Promise<void>;
  completeOrder: (orderId: string) => Promise<void>;

  clearError: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, _get) => ({
      user: null,
      token: null,
      tables: [],
      menuItems: [],
      currentOrder: null,
      kitchenOrders: [],
      orderLoading: false,
      menuLoading: false,
      error: null,

      clearError: () => set({ error: null }),

      login: async (email, password) => {
        set({ orderLoading: true, error: null });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          set({ user: data.user, token: data.token, orderLoading: false });
        } catch (err: any) {
          set({ error: err.message, orderLoading: false });
        }
      },

      logout: () => set({
        user: null, token: null, tables: [],
        menuItems: [], currentOrder: null, kitchenOrders: [],
        orderLoading: false, menuLoading: false,
      }),

      fetchTables: async () => {
        try {
          const { data } = await api.get('/tables');
          set({ tables: data });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      fetchMenu: async () => {
        if (_get().menuLoading) return; // evitar llamadas duplicadas
        set({ menuLoading: true });
        try {
          const { data } = await api.get('/menu');
          set({ menuItems: data, menuLoading: false });
        } catch (err: any) {
          set({ error: err.message, menuLoading: false });
        }
      },

      fetchOrCreateOrder: async tableId => {
        if (_get().currentOrder?.table_id !== tableId) {
          set({ currentOrder: null });
        }
        set({ orderLoading: true, error: null });
        try {
          const { data } = await api.get(`/orders/table/${tableId}`);
          set({ currentOrder: data, orderLoading: false });
        } catch {
          // Mesa libre: creación lazy, no crear nada aquí
          set({ orderLoading: false });
        }
      },

      addOrderItem: async (tableId, menuItemId, quantity, notes) => {
        set({ orderLoading: true });
        try {
          let orderId = _get().currentOrder?.id;

          if (!orderId) {
            const { data: newOrder } = await api.post('/orders', { table_id: tableId });
            set(s => ({
              currentOrder: newOrder,
              tables: s.tables.map(t => t.id === tableId ? { ...t, status: 'occupied' } : t),
            }));
            orderId = newOrder.id;
          }

          const wasServed = _get().currentOrder?.status === 'ready' && !!_get().currentOrder?.delivered_at;

          const { data } = await api.post(`/orders/${orderId}/items`, {
            menu_item_id: menuItemId,
            quantity,
            notes,
          });

          if (wasServed) {
            // El backend reseteó el pedido a 'open': re-fetch para sincronizar status
            const { data: refreshed } = await api.get(`/orders/${orderId}`);
            set(s => ({
              currentOrder: { ...refreshed, items: [...(refreshed.items ?? [])] },
              tables: s.tables.map(t => t.id === tableId ? { ...t, status: 'occupied' } : t),
              orderLoading: false,
            }));
          } else {
            set(s => ({
              currentOrder: s.currentOrder
                ? { ...s.currentOrder, items: [...(s.currentOrder.items ?? []), data] }
                : null,
              orderLoading: false,
            }));
          }
        } catch (err: any) {
          set({ error: err.message, orderLoading: false });
        }
      },

      updateOrderItemQuantity: async (orderId, itemId, quantity) => {
        try {
          const { data } = await api.patch(`/orders/${orderId}/items/${itemId}`, { quantity });
          set(s => ({
            currentOrder: s.currentOrder
              ? { ...s.currentOrder, items: s.currentOrder.items?.map(i => i.id === itemId ? { ...data } : i) }
              : null,
          }));
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      removeOrderItem: async (orderId, itemId) => {
        try {
          await api.delete(`/orders/${orderId}/items/${itemId}`);
          set(s => ({
            currentOrder: s.currentOrder
              ? { ...s.currentOrder, items: s.currentOrder.items?.filter(i => i.id !== itemId) }
              : null,
          }));
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      sendOrderToKitchen: async orderId => {
        set({ orderLoading: true });
        try {
          const { data } = await api.patch(`/orders/${orderId}/status`, { status: 'kitchen' });
          set({ currentOrder: data, orderLoading: false });
        } catch (err: any) {
          set({ error: err.message, orderLoading: false });
        }
      },

      requestBilling: async orderId => {
        set({ orderLoading: true });
        try {
          const { data } = await api.patch(`/orders/${orderId}/status`, { status: 'billing' });
          set(s => ({
            currentOrder: data,
            orderLoading: false,
            tables: s.tables.map(t => t.id === data.table_id ? { ...t, status: 'billing' } : t),
          }));
        } catch (err: any) {
          set({ error: err.message, orderLoading: false });
        }
      },

      closeTable: async orderId => {
        set({ orderLoading: true });
        try {
          const { data } = await api.patch(`/orders/${orderId}/status`, { status: 'billed' });
          set(s => ({
            currentOrder: null,
            orderLoading: false,
            tables: s.tables.map(t => t.id === data.table_id
              ? { ...t, status: 'free', last_interaction_at: undefined }
              : t
            ),
          }));
        } catch (err: any) {
          set({ error: err.message, orderLoading: false });
        }
      },

      markDelivered: async orderId => {
        set({ orderLoading: true });
        try {
          const { data } = await api.patch(`/orders/${orderId}/deliver`);
          set(s => ({
            currentOrder: data,
            orderLoading: false,
            tables: s.tables.map(t => t.id === data.table_id
              ? { ...t, status: 'served', last_interaction_at: data.delivered_at }
              : t
            ),
          }));
        } catch (err: any) {
          set({ error: err.message, orderLoading: false });
        }
      },

      fetchKitchenOrders: async () => {
        try {
          const { data } = await api.get('/orders?status=kitchen');
          set({ kitchenOrders: data });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      updateItemStatus: async (itemId, status) => {
        try {
          await api.patch(`/orders/items/${itemId}/status`, { status });
          set(s => ({
            kitchenOrders: s.kitchenOrders.map(order => ({
              ...order,
              items: order.items?.map(item => item.id === itemId ? { ...item, status } : item),
            })),
          }));
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      completeOrder: async orderId => {
        try {
          await api.patch(`/orders/${orderId}/status`, { status: 'ready' });
          set(s => ({ kitchenOrders: s.kitchenOrders.filter(o => o.id !== orderId) }));
        } catch (err: any) {
          set({ error: err.message });
        }
      },
    }),
    {
      name: 'restaurante-auth',
      partialize: state => ({ user: state.user, token: state.token }),
    }
  )
);

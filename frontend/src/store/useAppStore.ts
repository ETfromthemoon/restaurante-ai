import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { User, Table, MenuItem, Order, OrderItemStatus, Promotion, CajaSession } from '../types';

interface AppState {
  user: User | null;
  token: string | null;
  tables: Table[];
  menuItems: MenuItem[];
  currentOrder: Order | null;
  kitchenOrders: Order[];
  promotions: Promotion[];
  activePromotions: Promotion[];
  readyTableIds: string[];
  tableOrderHistory: Order[];
  activeCajaSession: CajaSession | null;
  cajaHistory: CajaSession[];
  waiters: User[];

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

  fetchActivePromotions: () => Promise<void>;
  fetchAllPromotions: () => Promise<void>;
  createPromotion: (p: Omit<Promotion, 'id' | 'created_at'>) => Promise<void>;
  updatePromotion: (id: string, fields: Partial<Promotion>) => Promise<void>;

  fetchActiveCaja: () => Promise<void>;
  openCaja: () => Promise<void>;
  closeCaja: (sessionId: string) => Promise<void>;
  fetchCajaHistory: () => Promise<void>;
  fetchWaiters: () => Promise<void>;
  assignTableWaiter: (tableId: string, waiterId: string | null) => Promise<void>;

  // Socket handlers
  handleOrderUpdated: (order: Order) => void;
  handleTableUpdated: (table: Table) => void;
  handleOrderReady: (payload: { tableId: string }) => void;
  handleItemStatus: (payload: { orderId: string; itemId: string; status: OrderItemStatus }) => void;
  clearReadyTable: (tableId: string) => void;
  fetchTableOrderHistory: (tableId: string) => Promise<void>;

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
      promotions: [],
      activePromotions: [],
      readyTableIds: [],
      tableOrderHistory: [],
      activeCajaSession: null,
      cajaHistory: [],
      waiters: [],
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
        promotions: [], activePromotions: [],
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
            set(s => {
              if (!s.currentOrder) return { orderLoading: false };
              const items = s.currentOrder.items ?? [];
              // Si el backend hizo merge (el item devuelto ya existía), actualizar en lugar de duplicar
              const existingIdx = items.findIndex(i => i.id === data.id);
              const newItems = existingIdx >= 0
                ? items.map(i => i.id === data.id ? { ...data } : i)
                : [...items, data];
              return {
                currentOrder: { ...s.currentOrder, items: newItems },
                orderLoading: false,
              };
            });
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

      fetchActivePromotions: async () => {
        try {
          const { data } = await api.get('/promotions/active');
          set({ activePromotions: data });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      fetchAllPromotions: async () => {
        try {
          const { data } = await api.get('/promotions');
          set({ promotions: data });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      createPromotion: async p => {
        try {
          await api.post('/promotions', p);
          const { data } = await api.get('/promotions');
          set({ promotions: data });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      updatePromotion: async (id, fields) => {
        try {
          await api.patch(`/promotions/${id}`, fields);
          const { data } = await api.get('/promotions');
          set({ promotions: data });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      handleOrderUpdated: (order: Order) => {
        set(s => {
          let kitchenOrders = s.kitchenOrders;
          const inQueue = kitchenOrders.some(o => o.id === order.id);
          if (order.status === 'kitchen') {
            kitchenOrders = inQueue
              ? kitchenOrders.map(o => o.id === order.id ? order : o)
              : [...kitchenOrders, order];
          } else {
            kitchenOrders = kitchenOrders.filter(o => o.id !== order.id);
          }
          return {
            currentOrder: s.currentOrder?.id === order.id ? order : s.currentOrder,
            kitchenOrders,
            tables: order.table ? s.tables.map(t => t.id === order.table!.id ? order.table! : t) : s.tables,
          };
        });
      },

      handleTableUpdated: (table: Table) => {
        set(s => ({ tables: s.tables.map(t => t.id === table.id ? table : t) }));
      },

      handleOrderReady: (payload: { tableId: string }) => {
        set(s => ({
          readyTableIds: s.readyTableIds.includes(payload.tableId)
            ? s.readyTableIds
            : [...s.readyTableIds, payload.tableId],
        }));
      },

      handleItemStatus: (payload: { orderId: string; itemId: string; status: OrderItemStatus }) => {
        set(s => ({
          currentOrder: s.currentOrder?.id === payload.orderId
            ? { ...s.currentOrder, items: s.currentOrder.items?.map(i => i.id === payload.itemId ? { ...i, status: payload.status } : i) }
            : s.currentOrder,
        }));
      },

      clearReadyTable: (tableId: string) => {
        set(s => ({ readyTableIds: s.readyTableIds.filter(id => id !== tableId) }));
      },

      fetchTableOrderHistory: async (tableId: string) => {
        try {
          const { data } = await api.get(`/orders?table_id=${tableId}`);
          set({ tableOrderHistory: data });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      fetchActiveCaja: async () => {
        try {
          const { data } = await api.get('/caja/active');
          set({ activeCajaSession: data });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      openCaja: async () => {
        try {
          const { data } = await api.post('/caja/open');
          set({ activeCajaSession: data });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      closeCaja: async (sessionId: string) => {
        try {
          await api.patch(`/caja/${sessionId}/close`);
          set({ activeCajaSession: null });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      fetchCajaHistory: async () => {
        try {
          const { data } = await api.get('/caja');
          set({ cajaHistory: data });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      fetchWaiters: async () => {
        try {
          const { data } = await api.get('/tables/waiters');
          set({ waiters: data });
        } catch (err: any) {
          set({ error: err.message });
        }
      },

      assignTableWaiter: async (tableId: string, waiterId: string | null) => {
        try {
          const { data } = await api.patch(`/tables/${tableId}/assign`, { waiter_id: waiterId });
          set(s => ({ tables: s.tables.map(t => t.id === tableId ? data : t) }));
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

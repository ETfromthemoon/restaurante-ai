import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { User, Table, MenuItem, Order, OrderItemStatus, Promotion } from '../types';

interface AppState {
  user: User | null;
  token: string | null;
  tables: Table[];
  menuItems: MenuItem[];
  activePromotions: Promotion[];
  currentOrder: Order | null;
  kitchenOrders: Order[];
  tableOrderHistory: Order[];
  menuLoading: boolean;
  orderLoading: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  fetchTables: () => Promise<void>;
  fetchMenu: () => Promise<void>;
  fetchActivePromotions: () => Promise<void>;
  fetchOrCreateOrder: (tableId: string) => Promise<void>;
  addOrderItem: (orderId: string, menuItemId: string, quantity: number, notes?: string) => Promise<void>;
  removeOrderItem: (orderId: string, itemId: string) => Promise<void>;
  updateOrderItemQuantity: (orderId: string, itemId: string, quantity: number) => Promise<void>;
  sendOrderToKitchen: (orderId: string) => Promise<void>;
  markDelivered: (orderId: string) => Promise<void>;
  requestBilling: (orderId: string) => Promise<void>;
  closeTable: (orderId: string) => Promise<void>;
  fetchKitchenOrders: () => Promise<void>;
  updateItemStatus: (itemId: string, status: OrderItemStatus) => Promise<void>;
  completeOrder: (orderId: string) => Promise<void>;
  fetchTableOrderHistory: (tableId: string) => Promise<void>;
  handleOrderUpdated: (order: Order) => void;
  handleTableUpdated: (table: Table) => void;
  handleOrderReady: (data: { orderId: string; tableNumber: number }) => void;
  handleItemStatus: (data: { itemId: string; status: OrderItemStatus }) => void;
  clearError: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  token: null,
  tables: [],
  menuItems: [],
  activePromotions: [],
  currentOrder: null,
  kitchenOrders: [],
  tableOrderHistory: [],
  menuLoading: false,
  orderLoading: false,
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  restoreSession: async () => {
    try {
      const token   = await SecureStore.getItemAsync('auth_token');
      const userStr = await SecureStore.getItemAsync('user_data');
      if (token && userStr) set({ token, user: JSON.parse(userStr) });
    } catch {}
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      await SecureStore.setItemAsync('auth_token', data.token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false });
    } catch (err) {
      set({ error: (err as any).message, loading: false });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('user_data');
    set({ user: null, token: null, tables: [], currentOrder: null,
          kitchenOrders: [], tableOrderHistory: [], activePromotions: [] });
  },

  fetchTables: async () => {
    try {
      const { data } = await api.get('/tables');
      set({ tables: data });
    } catch (err) { set({ error: (err as any).message }); }
  },

  fetchMenu: async () => {
    set({ menuLoading: true });
    try {
      const { data } = await api.get('/menu');
      set({ menuItems: data, menuLoading: false });
    } catch (err) { set({ error: (err as any).message, menuLoading: false }); }
  },

  fetchActivePromotions: async () => {
    try {
      const { data } = await api.get('/promotions/active');
      set({ activePromotions: data });
    } catch { /* silencioso */ }
  },

  fetchOrCreateOrder: async tableId => {
    set({ orderLoading: true, error: null });
    try {
      const { data } = await api.get('/orders/table/' + tableId);
      set({ currentOrder: data, orderLoading: false });
    } catch {
      try {
        const { data } = await api.post('/orders', { table_id: tableId });
        set({ currentOrder: data, orderLoading: false });
        set(s => ({ tables: s.tables.map(t => t.id === tableId ? { ...t, status: 'occupied' as const } : t) }));
      } catch (err) { set({ error: (err as any).message, orderLoading: false }); }
    }
  },

  addOrderItem: async (orderId, menuItemId, quantity, notes) => {
    set({ orderLoading: true });
    try {
      const { data } = await api.post('/orders/' + orderId + '/items',
        { menu_item_id: menuItemId, quantity, notes });
      set(s => ({
        currentOrder: s.currentOrder
          ? { ...s.currentOrder, items: [...(s.currentOrder.items || []), data] }
          : null,
        orderLoading: false,
      }));
    } catch (err) { set({ error: (err as any).message, orderLoading: false }); }
  },

  removeOrderItem: async (orderId, itemId) => {
    try {
      await api.delete('/orders/' + orderId + '/items/' + itemId);
      set(s => ({
        currentOrder: s.currentOrder
          ? { ...s.currentOrder, items: s.currentOrder.items?.filter(i => i.id !== itemId) }
          : null,
      }));
    } catch (err) { set({ error: (err as any).message }); }
  },

  updateOrderItemQuantity: async (orderId, itemId, quantity) => {
    try {
      const { data } = await api.patch('/orders/' + orderId + '/items/' + itemId, { quantity });
      set(s => ({
        currentOrder: s.currentOrder
          ? { ...s.currentOrder, items: s.currentOrder.items?.map(i => i.id === itemId ? { ...i, ...data } : i) }
          : null,
      }));
    } catch (err) { set({ error: (err as any).message }); }
  },

  sendOrderToKitchen: async orderId => {
    set({ orderLoading: true });
    try {
      const { data } = await api.patch('/orders/' + orderId + '/status', { status: 'kitchen' });
      set({ currentOrder: data, orderLoading: false });
    } catch (err) { set({ error: (err as any).message, orderLoading: false }); }
  },

  markDelivered: async orderId => {
    set({ orderLoading: true });
    try {
      const { data } = await api.patch('/orders/' + orderId + '/deliver', {});
      set(s => ({
        currentOrder: data,
        orderLoading: false,
        tables: s.tables.map(t => t.id === data.table_id ? { ...t, status: 'served' as const } : t),
      }));
    } catch (err) { set({ error: (err as any).message, orderLoading: false }); }
  },

  requestBilling: async orderId => {
    set({ orderLoading: true });
    try {
      const { data } = await api.patch('/orders/' + orderId + '/status', { status: 'billing' });
      set(s => ({
        currentOrder: data,
        orderLoading: false,
        tables: s.tables.map(t => t.id === data.table_id ? { ...t, status: 'billing' as const } : t),
      }));
    } catch (err) { set({ error: (err as any).message, orderLoading: false }); }
  },

  closeTable: async orderId => {
    set({ orderLoading: true });
    try {
      await api.patch('/orders/' + orderId + '/status', { status: 'billed' });
      const tableId = get().currentOrder?.table_id;
      set(s => ({
        currentOrder: null,
        orderLoading: false,
        tables: s.tables.map(t => t.id === tableId ? { ...t, status: 'free' as const } : t),
      }));
    } catch (err) { set({ error: (err as any).message, orderLoading: false }); }
  },

  fetchKitchenOrders: async () => {
    try {
      const { data } = await api.get('/orders?status=kitchen');
      set({ kitchenOrders: data });
    } catch (err) { set({ error: (err as any).message }); }
  },

  updateItemStatus: async (itemId, status) => {
    try {
      await api.patch('/orders/items/' + itemId + '/status', { status });
      set(s => ({
        kitchenOrders: s.kitchenOrders.map(order => ({
          ...order,
          items: order.items?.map(item => item.id === itemId ? { ...item, status } : item),
        })),
      }));
    } catch (err) { set({ error: (err as any).message }); }
  },

  completeOrder: async orderId => {
    try {
      await api.patch('/orders/' + orderId + '/status', { status: 'ready' });
      set(s => ({ kitchenOrders: s.kitchenOrders.filter(o => o.id !== orderId) }));
    } catch (err) { set({ error: (err as any).message }); }
  },

  fetchTableOrderHistory: async (tableId) => {
    try {
      const { data } = await api.get('/orders/table/' + tableId + '/history');
      set({ tableOrderHistory: data });
    } catch (err) { set({ error: (err as any).message }); }
  },

  handleOrderUpdated: (order) => {
    set(s => ({
      currentOrder: s.currentOrder?.id === order.id ? order : s.currentOrder,
      kitchenOrders: s.kitchenOrders.map(o => o.id === order.id ? order : o),
    }));
  },

  handleTableUpdated: (table) => {
    set(s => ({ tables: s.tables.map(t => t.id === table.id ? table : t) }));
  },

  handleOrderReady: ({ orderId }) => {
    set(s => ({
      currentOrder: s.currentOrder?.id === orderId
        ? { ...s.currentOrder, status: 'ready' as const }
        : s.currentOrder,
    }));
  },

  handleItemStatus: ({ itemId, status }) => {
    const patch = (items: any) => items?.map((i: any) => i.id === itemId ? { ...i, status } : i);
    set(s => ({
      currentOrder: s.currentOrder ? { ...s.currentOrder, items: patch(s.currentOrder.items) } : null,
      kitchenOrders: s.kitchenOrders.map(o => ({ ...o, items: patch(o.items) })),
    }));
  },
}));

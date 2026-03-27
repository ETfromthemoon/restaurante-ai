export type UserRole    = 'waiter' | 'cook' | 'manager';
export type TableStatus = 'free' | 'occupied' | 'billing' | 'served';
export type OrderStatus = 'open' | 'kitchen' | 'ready' | 'billing' | 'billed';
export type OrderItemStatus = 'pending' | 'preparing' | 'done';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  assigned_waiter_id?: string | null;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  image_url?: string;
  stock?: number | null;
}

export interface Promotion {
  id: string;
  name: string;
  type: '2x1' | 'percentage' | 'fixed';
  value: number;
  applies_to: 'item' | 'category' | 'all';
  target_id?: string | null;
  active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  menu_item?: MenuItem;
  quantity: number;
  notes?: string;
  status: OrderItemStatus;
  effective_price?: number | null;
  promotion_name?: string | null;
  promotion_type?: string | null;
  round?: number;
}

export interface Order {
  id: string;
  table_id: string;
  table?: Table;
  waiter_id: string;
  status: OrderStatus;
  created_at: string;
  delivered_at?: string;
  items?: OrderItem[];
  caja_session_id?: string | null;
  cashier_id?: string | null;
}

// IA — Maridaje
export interface PairingSuggestion {
  id?: string;
  name: string;
  reason: string;
  price?: number;
}

export interface PairingResponse {
  item: string;
  suggestions: PairingSuggestion[];
}

export type UserRole = 'waiter' | 'cook' | 'manager';
export type PromotionType = '2x1' | 'percentage' | 'fixed';
export type PromotionAppliesTo = 'item' | 'category' | 'all';
export type TableStatus = 'free' | 'occupied' | 'ready' | 'served' | 'billing';
export type OrderStatus = 'open' | 'kitchen' | 'ready' | 'billing' | 'billed';
export type OrderItemStatus = 'pending' | 'preparing' | 'done';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  last_interaction_at?: string;
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
  round: number;
}

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  value: number;
  applies_to: PromotionAppliesTo;
  target_id: string | null;
  days_of_week: number[];
  time_start: string;
  time_end: string;
  active: boolean;
  created_at: string;
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

export interface CajaSession {
  id: string;
  cashier_id: string;
  cashier_name: string;
  opened_at: string;
  closed_at?: string;
}

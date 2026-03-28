import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// --- Menu ---
export const createMenuItemSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(200),
  description: z.string().max(500).default(''),
  price: z.coerce.number().positive('Precio debe ser positivo'),
  category: z.string().min(1, 'Categoría requerida'),
  available: z.boolean().default(true),
  stock: z.coerce.number().int().min(0).nullable().optional(),
});

export const updateMenuItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(500).optional(),
  price: z.coerce.number().positive().optional(),
  category: z.string().min(1).optional(),
  available: z.boolean().optional(),
  stock: z.coerce.number().int().min(0).nullable().optional(),
});

// --- Orders ---
export const createOrderSchema = z.object({
  table_id: z.string().min(1, 'table_id requerido'),
});

// Alinear con types/index.ts: OrderStatus = 'open' | 'kitchen' | 'ready' | 'billing' | 'billed'
export const updateOrderStatusSchema = z.object({
  status: z.enum(['open', 'kitchen', 'ready', 'billing', 'billed']),
});

export const addOrderItemSchema = z.object({
  menu_item_id: z.string().min(1, 'menu_item_id requerido'),
  quantity: z.coerce.number().int().min(1).default(1),
  notes: z.string().max(500).nullable().optional(),
});

export const updateOrderItemQtySchema = z.object({
  quantity: z.coerce.number().int().min(1, 'Cantidad mínima es 1'),
});

// Alinear con types/index.ts: OrderItemStatus = 'pending' | 'preparing' | 'done'
export const updateOrderItemStatusSchema = z.object({
  status: z.enum(['pending', 'preparing', 'done']),
});

// --- Tables ---
export const updateTableStatusSchema = z.object({
  status: z.enum(['free', 'occupied', 'ready', 'served', 'billing']),
});

export const assignWaiterSchema = z.object({
  waiter_id: z.string().nullable(),
});

// --- Promotions ---
export const createPromotionSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(200),
  type: z.enum(['2x1', 'percentage', 'fixed']),
  value: z.coerce.number().min(0).default(0),
  applies_to: z.enum(['item', 'category', 'all']),
  target_id: z.string().nullable().optional(),
  days_of_week: z.array(z.number().int().min(1).max(7)),
  time_start: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  time_end: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
});

export const updatePromotionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['2x1', 'percentage', 'fixed']).optional(),
  value: z.coerce.number().min(0).optional(),
  applies_to: z.enum(['item', 'category', 'all']).optional(),
  target_id: z.string().nullable().optional(),
  days_of_week: z.array(z.number().int().min(1).max(7)).optional(),
  time_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  time_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  active: z.boolean().optional(),
});

// --- Users ---
export const createUserSchema = z.object({
  name:     z.string().min(1, 'Nombre requerido').max(100),
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role:     z.enum(['waiter', 'cook', 'manager']),
});

export const updateUserSchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  email:    z.string().email().optional(),
  password: z.string().min(6).optional(),
  role:     z.enum(['waiter', 'cook', 'manager']).optional(),
});

// --- Param schemas ---
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID requerido'),
});

export const itemIdParamSchema = z.object({
  itemId: z.string().min(1, 'itemId requerido'),
});

export const tableIdParamSchema = z.object({
  tableId: z.string().min(1, 'tableId requerido'),
});

/** Middleware reutilizable para validar req.params con un schema Zod */
export function validateParams<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const issues = result.error.issues;
      const msg = issues.length > 0 ? issues[0].message : 'Parámetro de ruta inválido';
      res.status(400).json({ error: msg });
      return;
    }
    next();
  };
}

/** Helper para validar y responder con error 400 si falla */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    // Zod v4: issues array
    const issues = (result.error as any).issues ?? (result.error as any).errors ?? [];
    const msg = issues.length > 0 ? issues[0].message : 'Datos inválidos';
    return { success: false, error: msg };
  }
  return { success: true, data: result.data };
}

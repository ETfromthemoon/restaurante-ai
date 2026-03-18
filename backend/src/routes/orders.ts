import { Router, Response } from 'express';
import {
  getOrders, getOrderById, getActiveOrderByTable, insertOrder, updateOrder,
  getTableById, updateTable,
  getMenuItemById,
  getItemsByOrderId, getOrderItemById,
  insertOrderItem, deleteOrderItem, updateOrderItemStatus, updateOrderItemQuantity,
  nextOrderId, nextOrderItemId,
  getActivePromotions,
} from '../db/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Order, OrderItem, OrderStatus, OrderItemStatus, Promotion, MenuItem } from '../types';

function isPromotionActive(p: Promotion, now = new Date()): boolean {
  const day = now.getDay() || 7; // 1=lun..7=dom
  if (!p.days_of_week.includes(day)) return false;
  const hhmm = now.toTimeString().slice(0, 5);
  return hhmm >= p.time_start && hhmm < p.time_end;
}

function matchesPromotion(p: Promotion, item: MenuItem): boolean {
  if (p.applies_to === 'item')     return p.target_id === item.id;
  if (p.applies_to === 'category') return p.target_id === item.category;
  return true;
}

function calcEffectivePrice(price: number, quantity: number, p: Promotion): number {
  if (p.type === '2x1') {
    const freeUnits = Math.floor(quantity / 2);
    return ((quantity - freeUnits) * price) / quantity;
  }
  if (p.type === 'percentage') return price * (1 - p.value / 100);
  if (p.type === 'fixed')      return Math.max(0, price - p.value);
  return price;
}

const router = Router();
router.use(authMiddleware);

function enrichOrder(order: Order): Order {
  const table = getTableById(order.table_id);
  const now   = new Date();
  const activePromos = getActivePromotions().filter(p => isPromotionActive(p, now));
  const priorityOrder: Record<string, number> = { item: 0, category: 1, all: 2 };
  activePromos.sort((a, b) => priorityOrder[a.applies_to] - priorityOrder[b.applies_to]);

  const items = getItemsByOrderId(order.id).map(item => {
    const menuItem  = getMenuItemById(item.menu_item_id);
    const matched   = menuItem ? activePromos.find(p => matchesPromotion(p, menuItem)) : undefined;
    // Si el item no tiene effective_price pero ahora hay promo activa, recalcular
    const effectivePrice = item.effective_price != null
      ? item.effective_price
      : (matched && menuItem ? calcEffectivePrice(menuItem.price, item.quantity, matched) : null);
    return {
      ...item,
      effective_price:  effectivePrice,
      promotion_name:   matched?.name  ?? null,
      promotion_type:   matched?.type  ?? null,
      menu_item: menuItem,
    };
  });
  return { ...order, table, items };
}

// GET /api/orders?status=kitchen
router.get('/', (req: AuthRequest, res: Response): void => {
  const { status } = req.query;
  res.json(getOrders(status as string | undefined).map(enrichOrder));
});

// GET /api/orders/table/:tableId
router.get('/table/:tableId', (req: AuthRequest, res: Response): void => {
  const order = getActiveOrderByTable(req.params.tableId);
  if (!order) {
    res.status(404).json({ error: 'No hay pedido activo para esta mesa' });
    return;
  }
  res.json(enrichOrder(order));
});

// GET /api/orders/:id
router.get('/:id', (req: AuthRequest, res: Response): void => {
  const order = getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }
  res.json(enrichOrder(order));
});

// POST /api/orders — crear pedido (idempotente)
router.post('/', (req: AuthRequest, res: Response): void => {
  const { table_id } = req.body;
  const table = getTableById(table_id);
  if (!table) {
    res.status(404).json({ error: 'Mesa no encontrada' });
    return;
  }

  const existing = getActiveOrderByTable(table_id);
  if (existing) {
    res.status(200).json(enrichOrder(existing));
    return;
  }

  const newOrder: Order = {
    id: nextOrderId(),
    table_id,
    waiter_id: req.user!.id,
    status: 'open',
    created_at: new Date().toISOString(),
  };
  insertOrder(newOrder);
  updateTable(table_id, { status: 'occupied', last_interaction_at: new Date().toISOString() });
  res.status(201).json(enrichOrder(newOrder));
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', (req: AuthRequest, res: Response): void => {
  const order = getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }

  const { status } = req.body as { status: OrderStatus };
  updateOrder(order.id, { status });

  const now = new Date().toISOString();
  if (status === 'kitchen') updateTable(order.table_id, { status: 'occupied', last_interaction_at: now });
  if (status === 'ready')   updateTable(order.table_id, { status: 'ready' });
  if (status === 'billing') updateTable(order.table_id, { status: 'billing', last_interaction_at: now });
  if (status === 'billed')  updateTable(order.table_id, { status: 'free', last_interaction_at: undefined });

  res.json(enrichOrder(getOrderById(order.id)!));
});

// POST /api/orders/:id/items
router.post('/:id/items', (req: AuthRequest, res: Response): void => {
  const order = getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }

  const { menu_item_id, quantity, notes } = req.body;
  const menuItem = getMenuItemById(menu_item_id);
  if (!menuItem) {
    res.status(404).json({ error: 'Plato no encontrado' });
    return;
  }

  const qty = quantity || 1;

  // Aplicar promoción activa si corresponde
  const now = new Date();
  const activePromos = getActivePromotions().filter(p => isPromotionActive(p, now));
  const priorityOrder: Record<string, number> = { item: 0, category: 1, all: 2 };
  activePromos.sort((a, b) => priorityOrder[a.applies_to] - priorityOrder[b.applies_to]);
  const matchedPromo = activePromos.find(p => matchesPromotion(p, menuItem));

  // Merge: si ya existe una fila con el mismo plato (y sin notas especiales), sumar cantidad
  const existingItems = getItemsByOrderId(order.id);
  const existingItem = notes
    ? undefined
    : existingItems.find(i => i.menu_item_id === menu_item_id && !i.notes);

  if (existingItem) {
    const newQty = existingItem.quantity + qty;
    const effectivePrice = matchedPromo
      ? calcEffectivePrice(menuItem.price, newQty, matchedPromo)
      : null;
    updateOrderItemQuantity(existingItem.id, newQty, effectivePrice);
    const updated = getOrderItemById(existingItem.id)!;

    if (order.status === 'ready' && order.delivered_at) {
      updateOrder(order.id, { status: 'open' });
      updateTable(order.table_id, { status: 'occupied' });
    }

    res.status(200).json({
      ...updated, menu_item: menuItem,
      promotion_name: matchedPromo?.name ?? null,
      promotion_type: matchedPromo?.type ?? null,
    });
    return;
  }

  const effectivePrice = matchedPromo
    ? calcEffectivePrice(menuItem.price, qty, matchedPromo)
    : undefined;

  const newItem: OrderItem = {
    id: nextOrderItemId(),
    order_id: order.id,
    menu_item_id,
    quantity: qty,
    notes,
    status: 'pending',
    effective_price: effectivePrice,
  };
  insertOrderItem(newItem);

  // Segunda ronda: si el pedido ya fue entregado, volver a estado open
  if (order.status === 'ready' && order.delivered_at) {
    updateOrder(order.id, { status: 'open' });
    updateTable(order.table_id, { status: 'occupied' });
  }

  res.status(201).json({
    ...newItem, menu_item: menuItem,
    promotion_name: matchedPromo?.name ?? null,
    promotion_type: matchedPromo?.type ?? null,
  });
});

// PATCH /api/orders/:id/items/:itemId — actualizar cantidad
router.patch('/:id/items/:itemId', (req: AuthRequest, res: Response): void => {
  const order = getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }

  const item = getOrderItemById(req.params.itemId);
  if (!item) {
    res.status(404).json({ error: 'Item no encontrado' });
    return;
  }

  const { quantity } = req.body as { quantity: number };
  if (!quantity || quantity < 1) {
    res.status(400).json({ error: 'Cantidad inválida' });
    return;
  }

  // Recalcular effective_price con la nueva cantidad
  const menuItem = getMenuItemById(item.menu_item_id)!;
  const now = new Date();
  const activePromos = getActivePromotions().filter(p => isPromotionActive(p, now));
  const priorityOrder: Record<string, number> = { item: 0, category: 1, all: 2 };
  activePromos.sort((a, b) => priorityOrder[a.applies_to] - priorityOrder[b.applies_to]);
  const matchedPromo = activePromos.find(p => matchesPromotion(p, menuItem));
  const effectivePrice = matchedPromo
    ? calcEffectivePrice(menuItem.price, quantity, matchedPromo)
    : null;

  updateOrderItemQuantity(item.id, quantity, effectivePrice);
  const updated = getOrderItemById(item.id)!;
  res.json({
    ...updated, menu_item: menuItem,
    promotion_name: matchedPromo?.name ?? null,
    promotion_type: matchedPromo?.type ?? null,
  });
});

// DELETE /api/orders/:id/items/:itemId
router.delete('/:id/items/:itemId', (req: AuthRequest, res: Response): void => {
  deleteOrderItem(req.params.itemId);
  res.json({ success: true });
});

// PATCH /api/orders/:id/deliver
router.patch('/:id/deliver', (req: AuthRequest, res: Response): void => {
  const order = getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }
  const now = new Date().toISOString();
  updateOrder(order.id, { delivered_at: now });
  updateTable(order.table_id, { status: 'served', last_interaction_at: now });
  res.json(enrichOrder(getOrderById(order.id)!));
});

// PATCH /api/orders/items/:itemId/status
router.patch('/items/:itemId/status', (req: AuthRequest, res: Response): void => {
  const item = getOrderItemById(req.params.itemId);
  if (!item) {
    res.status(404).json({ error: 'Item no encontrado' });
    return;
  }
  const { status } = req.body as { status: OrderItemStatus };
  updateOrderItemStatus(item.id, status);
  res.json({ ...item, status, menu_item: getMenuItemById(item.menu_item_id) });
});

export default router;

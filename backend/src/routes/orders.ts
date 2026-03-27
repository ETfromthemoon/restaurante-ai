import { Router, Response } from 'express';
import {
  getOrders, getOrderById, getActiveOrderByTable, insertOrder, updateOrder,
  getTableById, updateTable,
  getMenuItemById,
  getItemsByOrderId, getOrderItemById,
  insertOrderItem, deleteOrderItem, updateOrderItemStatus, updateOrderItemQuantity,
  nextOrderId, nextOrderItemId,
  getActivePromotions,
  getCurrentRound, getOrdersByTable,
  adjustStock, getActiveCajaSession,
} from '../db/store';
import { authMiddleware, AuthRequest, requireRole, requirePermission } from '../middleware/auth';
import { Order, OrderItem, OrderStatus, OrderItemStatus, Promotion, MenuItem } from '../types';
import { getIO } from '../socket';
import { validate, validateParams, idParamSchema, itemIdParamSchema, tableIdParamSchema, createOrderSchema, updateOrderStatusSchema, addOrderItemSchema, updateOrderItemQtySchema, updateOrderItemStatusSchema } from '../schemas';

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

// GET /api/orders?status=kitchen  OR  /api/orders?table_id=t1
router.get('/', (req: AuthRequest, res: Response): void => {
  const { status, table_id } = req.query;
  if (table_id) {
    res.json(getOrdersByTable(table_id as string).map(enrichOrder));
    return;
  }
  res.json(getOrders(status as string | undefined).map(enrichOrder));
});

// GET /api/orders/table/:tableId
router.get('/table/:tableId', validateParams(tableIdParamSchema), (req: AuthRequest, res: Response): void => {
  const order = getActiveOrderByTable(req.params.tableId);
  if (!order) {
    res.status(404).json({ error: 'No hay pedido activo para esta mesa' });
    return;
  }
  res.json(enrichOrder(order));
});

// GET /api/orders/:id
router.get('/:id', validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
  const order = getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }
  res.json(enrichOrder(order));
});

// POST /api/orders — crear pedido (idempotente) - solo mesero/manager
router.post('/', requirePermission('orders', 'create'), (req: AuthRequest, res: Response): void => {
  const v = validate(createOrderSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  const { table_id } = v.data;
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
router.patch('/:id/status', requirePermission('orders', 'updateStatus'), validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
  const order = getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }

  const v = validate(updateOrderStatusSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  const { status } = v.data;
  updateOrder(order.id, { status });

  if (status === 'billed') {
    const session = getActiveCajaSession();
    if (session) updateOrder(order.id, { caja_session_id: session.id, cashier_id: session.cashier_id });
  }

  const now = new Date().toISOString();
  if (status === 'kitchen') updateTable(order.table_id, { status: 'occupied', last_interaction_at: now });
  if (status === 'ready')   updateTable(order.table_id, { status: 'ready' });
  if (status === 'billing') updateTable(order.table_id, { status: 'billing', last_interaction_at: now });
  if (status === 'billed')  updateTable(order.table_id, { status: 'free', last_interaction_at: undefined });

  const enriched = enrichOrder(getOrderById(order.id)!);
  const io = getIO();
  io.to('waiters').to('kitchen').emit('order:updated', { order: enriched });
  if (status === 'ready') {
    const table = getTableById(order.table_id);
    io.to('waiters').emit('order:ready', { orderId: order.id, tableId: order.table_id, tableNumber: table?.number });
  }
  if (enriched.table) {
    io.to('waiters').emit('table:updated', { table: enriched.table });
  }

  res.json(enriched);
});

// POST /api/orders/:id/items
router.post('/:id/items', requirePermission('orders', 'addItem'), validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
  const order = getOrderById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }

  const v = validate(addOrderItemSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  const { menu_item_id, quantity: qty_input, notes } = v.data;
  const menuItem = getMenuItemById(menu_item_id);
  if (!menuItem) {
    res.status(404).json({ error: 'Plato no encontrado' });
    return;
  }

  const qty = qty_input;

  // Validar stock
  if (menuItem.stock !== null && menuItem.stock !== undefined && menuItem.stock < qty) {
    res.status(400).json({ error: `Stock insuficiente (disponible: ${menuItem.stock})` });
    return;
  }

  // Aplicar promoción activa si corresponde
  const now = new Date();
  const activePromos = getActivePromotions().filter(p => isPromotionActive(p, now));
  const priorityOrder: Record<string, number> = { item: 0, category: 1, all: 2 };
  activePromos.sort((a, b) => priorityOrder[a.applies_to] - priorityOrder[b.applies_to]);
  const matchedPromo = activePromos.find(p => matchesPromotion(p, menuItem));

  // Determinar ronda del nuevo ítem
  const currentRound = getCurrentRound(order.id);
  const itemRound = (order.status === 'kitchen' || order.status === 'ready')
    ? currentRound + 1
    : currentRound;

  // Merge: si ya existe una fila con el mismo plato (y sin notas especiales, y misma ronda), sumar cantidad
  const existingItems = getItemsByOrderId(order.id);
  const existingItem = notes
    ? undefined
    : existingItems.find(i => i.menu_item_id === menu_item_id && !i.notes && i.round === itemRound);

  if (existingItem) {
    const newQty = existingItem.quantity + qty;
    const effectivePrice = matchedPromo
      ? calcEffectivePrice(menuItem.price, newQty, matchedPromo)
      : null;
    updateOrderItemQuantity(existingItem.id, newQty, effectivePrice);
    const updated = getOrderItemById(existingItem.id)!;

    if (menuItem.stock !== null && menuItem.stock !== undefined) adjustStock(menuItem.id, -qty);

    if (order.status === 'ready' && order.delivered_at) {
      updateOrder(order.id, { status: 'open' });
      updateTable(order.table_id, { status: 'occupied' });
    }

    const itemResult = { ...updated, menu_item: menuItem, promotion_name: matchedPromo?.name ?? null, promotion_type: matchedPromo?.type ?? null };
    const io = getIO();
    io.to('kitchen').to('waiters').emit('order:item_added', { orderId: order.id, item: itemResult });
    res.status(200).json(itemResult);
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
    notes: notes ?? undefined,
    status: 'pending',
    effective_price: effectivePrice,
    round: itemRound,
  };
  insertOrderItem(newItem);
  if (menuItem.stock !== null && menuItem.stock !== undefined) adjustStock(menuItem.id, -qty);

  // Segunda ronda: si el pedido ya fue entregado, volver a estado open
  if (order.status === 'ready' && order.delivered_at) {
    updateOrder(order.id, { status: 'open' });
    updateTable(order.table_id, { status: 'occupied' });
  }

  const itemResult = { ...newItem, menu_item: menuItem, promotion_name: matchedPromo?.name ?? null, promotion_type: matchedPromo?.type ?? null };
  const io = getIO();
  io.to('kitchen').to('waiters').emit('order:item_added', { orderId: order.id, item: itemResult });
  res.status(201).json(itemResult);
});

// PATCH /api/orders/:id/items/:itemId — actualizar cantidad
router.patch('/:id/items/:itemId', requirePermission('orders', 'updateItem'), validateParams(idParamSchema), validateParams(itemIdParamSchema), (req: AuthRequest, res: Response): void => {
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

  const vq = validate(updateOrderItemQtySchema, req.body);
  if (!vq.success) { res.status(400).json({ error: vq.error }); return; }
  const { quantity } = vq.data;

  // Validar y ajustar stock si aplica
  const menuItem = getMenuItemById(item.menu_item_id)!;
  if (menuItem.stock !== null && menuItem.stock !== undefined) {
    const delta = quantity - item.quantity;
    if (delta > 0 && menuItem.stock < delta) {
      res.status(400).json({ error: `Stock insuficiente (disponible: ${menuItem.stock})` });
      return;
    }
    if (delta !== 0) adjustStock(item.menu_item_id, -delta);
  }

  // Recalcular effective_price con la nueva cantidad
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
  const result = { ...updated, menu_item: menuItem, promotion_name: matchedPromo?.name ?? null, promotion_type: matchedPromo?.type ?? null };
  getIO().to('waiters').emit('order:item_updated', { orderId: order.id, item: result });
  res.json(result);
});

// DELETE /api/orders/:id/items/:itemId
router.delete('/:id/items/:itemId', requirePermission('orders', 'deleteItem'), validateParams(idParamSchema), validateParams(itemIdParamSchema), (req: AuthRequest, res: Response): void => {
  const item = getOrderItemById(req.params.itemId);
  if (item) {
    const mi = getMenuItemById(item.menu_item_id);
    if (mi && mi.stock !== null && mi.stock !== undefined) adjustStock(item.menu_item_id, item.quantity);
  }
  deleteOrderItem(req.params.itemId);
  res.json({ success: true });
});

// PATCH /api/orders/:id/deliver
router.patch('/:id/deliver', requirePermission('orders', 'deliver'), validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
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

// PATCH /api/orders/items/:itemId/status — solo cocina/manager
router.patch('/items/:itemId/status', requirePermission('orders', 'updateItemStatus'), (req: AuthRequest, res: Response): void => {
  const item = getOrderItemById(req.params.itemId);
  if (!item) {
    res.status(404).json({ error: 'Item no encontrado' });
    return;
  }
  const vs = validate(updateOrderItemStatusSchema, req.body);
  if (!vs.success) { res.status(400).json({ error: vs.error }); return; }
  const { status } = vs.data;
  updateOrderItemStatus(item.id, status);
  const menuItem = getMenuItemById(item.menu_item_id);
  getIO().to('waiters').emit('order:item_status', { orderId: item.order_id, itemId: item.id, status });
  res.json({ ...item, status, menu_item: menuItem });
});

export default router;

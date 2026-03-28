import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requirePermission } from '../middleware/auth';
import { Order, OrderItem, OrderStatus, OrderItemStatus, Promotion, MenuItem } from '../types';
import { getTenantIO } from '../socket';
import { Store } from '../db/store';
import {
  validate, validateParams,
  idParamSchema, itemIdParamSchema, tableIdParamSchema,
  createOrderSchema, updateOrderStatusSchema,
  addOrderItemSchema, updateOrderItemQtySchema, updateOrderItemStatusSchema,
} from '../schemas';

// ── Helpers de promociones (puros, sin dependencia de DB) ──
function isPromotionActive(p: Promotion, now = new Date()): boolean {
  const day = now.getDay() || 7;
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

function enrichOrder(order: Order, store: Store): Order {
  const table = store.getTableById(order.table_id);
  const now   = new Date();
  const activePromos = store.getActivePromotions().filter(p => isPromotionActive(p, now));
  const priorityOrder: Record<string, number> = { item: 0, category: 1, all: 2 };
  activePromos.sort((a, b) => priorityOrder[a.applies_to] - priorityOrder[b.applies_to]);

  const items = store.getItemsByOrderId(order.id).map(item => {
    const menuItem  = store.getMenuItemById(item.menu_item_id);
    const matched   = menuItem ? activePromos.find(p => matchesPromotion(p, menuItem)) : undefined;
    const effectivePrice = item.effective_price != null
      ? item.effective_price
      : (matched && menuItem ? calcEffectivePrice(menuItem.price, item.quantity, matched) : null);
    return {
      ...item,
      effective_price: effectivePrice,
      promotion_name:  matched?.name ?? null,
      promotion_type:  matched?.type ?? null,
      menu_item: menuItem,
    };
  });
  return { ...order, table, items };
}

const router = Router();
router.use(authMiddleware);

// GET /api/orders?status=kitchen  OR  /api/orders?table_id=t1
router.get('/', (req: AuthRequest, res: Response): void => {
  const { status, table_id } = req.query;
  if (table_id) {
    res.json(req.store.getOrdersByTable(table_id as string).map(o => enrichOrder(o, req.store)));
    return;
  }
  res.json(req.store.getOrders(status as string | undefined).map(o => enrichOrder(o, req.store)));
});

// GET /api/orders/table/:tableId
router.get('/table/:tableId', validateParams(tableIdParamSchema), (req: AuthRequest, res: Response): void => {
  const order = req.store.getActiveOrderByTable(req.params.tableId);
  if (!order) { res.status(404).json({ error: 'No hay pedido activo para esta mesa' }); return; }
  res.json(enrichOrder(order, req.store));
});

// GET /api/orders/:id
router.get('/:id', validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
  const order = req.store.getOrderById(req.params.id);
  if (!order) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }
  res.json(enrichOrder(order, req.store));
});

// POST /api/orders — crear pedido (idempotente)
router.post('/', requirePermission('orders', 'create'), (req: AuthRequest, res: Response): void => {
  const v = validate(createOrderSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  const { table_id } = v.data;
  const table = req.store.getTableById(table_id);
  if (!table) { res.status(404).json({ error: 'Mesa no encontrada' }); return; }

  const existing = req.store.getActiveOrderByTable(table_id);
  if (existing) { res.status(200).json(enrichOrder(existing, req.store)); return; }

  const newOrder: Order = {
    id: req.store.nextOrderId(),
    table_id,
    waiter_id: req.user!.id,
    status: 'open',
    created_at: new Date().toISOString(),
  };
  req.store.insertOrder(newOrder);
  req.store.updateTable(table_id, { status: 'occupied', last_interaction_at: new Date().toISOString() });
  res.status(201).json(enrichOrder(newOrder, req.store));
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', requirePermission('orders', 'updateStatus'), validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
  const order = req.store.getOrderById(req.params.id);
  if (!order) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }

  const v = validate(updateOrderStatusSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  const { status } = v.data;

  if (status === 'billed') {
    const session = req.store.getActiveCajaSession();
    if (!session) {
      res.status(409).json({ error: 'No hay una sesión de caja abierta. Abre la caja antes de cobrar.' });
      return;
    }
    req.store.updateOrder(order.id, { status, caja_session_id: session.id, cashier_id: session.cashier_id });
  } else {
    req.store.updateOrder(order.id, { status });
  }

  const now = new Date().toISOString();
  if (status === 'kitchen') req.store.updateTable(order.table_id, { status: 'occupied', last_interaction_at: now });
  if (status === 'ready')   req.store.updateTable(order.table_id, { status: 'ready' });
  if (status === 'billing') req.store.updateTable(order.table_id, { status: 'billing', last_interaction_at: now });
  if (status === 'billed')  req.store.updateTable(order.table_id, { status: 'free', last_interaction_at: undefined });

  const enriched = enrichOrder(req.store.getOrderById(order.id)!, req.store);
  const tio = getTenantIO(req.tenantSlug);
  tio.to('waiters').to('kitchen').emit('order:updated', { order: enriched });
  if (status === 'ready') {
    const table = req.store.getTableById(order.table_id);
    tio.to('waiters').emit('order:ready', { orderId: order.id, tableId: order.table_id, tableNumber: table?.number });
  }
  if (enriched.table) {
    tio.to('waiters').emit('table:updated', { table: enriched.table });
  }
  res.json(enriched);
});

// POST /api/orders/:id/items
router.post('/:id/items', requirePermission('orders', 'addItem'), validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
  const order = req.store.getOrderById(req.params.id);
  if (!order) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }

  if (req.user!.role === 'waiter') {
    const table = req.store.getTableById(order.table_id);
    if (table && table.assigned_waiter_id !== null && table.assigned_waiter_id !== req.user!.id) {
      res.status(403).json({ error: 'Esta mesa ya no está asignada a ti.' });
      return;
    }
  }

  const v = validate(addOrderItemSchema, req.body);
  if (!v.success) { res.status(400).json({ error: v.error }); return; }
  const { menu_item_id, quantity: qty, notes } = v.data;
  const menuItem = req.store.getMenuItemById(menu_item_id);
  if (!menuItem) { res.status(404).json({ error: 'Plato no encontrado' }); return; }

  if (menuItem.stock !== null && menuItem.stock !== undefined && menuItem.stock < qty) {
    res.status(400).json({ error: `Stock insuficiente (disponible: ${menuItem.stock})` });
    return;
  }

  const now = new Date();
  const activePromos = req.store.getActivePromotions().filter(p => isPromotionActive(p, now));
  const priorityOrder: Record<string, number> = { item: 0, category: 1, all: 2 };
  activePromos.sort((a, b) => priorityOrder[a.applies_to] - priorityOrder[b.applies_to]);
  const matchedPromo = activePromos.find(p => matchesPromotion(p, menuItem));

  const currentRound = req.store.getCurrentRound(order.id);
  const itemRound = (order.status === 'kitchen' || order.status === 'ready')
    ? currentRound + 1
    : currentRound;

  const existingItems = req.store.getItemsByOrderId(order.id);
  const existingItem = notes
    ? undefined
    : existingItems.find(i => i.menu_item_id === menu_item_id && !i.notes && i.round === itemRound);

  if (existingItem) {
    const newQty = existingItem.quantity + qty;
    const effectivePrice = matchedPromo ? calcEffectivePrice(menuItem.price, newQty, matchedPromo) : null;
    req.store.updateOrderItemQuantity(existingItem.id, newQty, effectivePrice);
    const updated = req.store.getOrderItemById(existingItem.id)!;
    if (menuItem.stock !== null && menuItem.stock !== undefined) req.store.adjustStock(menuItem.id, -qty);
    if (order.status === 'ready' && order.delivered_at) {
      req.store.updateOrder(order.id, { status: 'open' });
      req.store.updateTable(order.table_id, { status: 'occupied' });
    }
    const itemResult = { ...updated, menu_item: menuItem, promotion_name: matchedPromo?.name ?? null, promotion_type: matchedPromo?.type ?? null };
    getTenantIO(req.tenantSlug).to('kitchen').to('waiters').emit('order:item_added', { orderId: order.id, item: itemResult });
    res.status(200).json(itemResult);
    return;
  }

  const effectivePrice = matchedPromo ? calcEffectivePrice(menuItem.price, qty, matchedPromo) : undefined;
  const newItem: OrderItem = {
    id: req.store.nextOrderItemId(),
    order_id: order.id,
    menu_item_id,
    quantity: qty,
    notes: notes ?? undefined,
    status: 'pending',
    effective_price: effectivePrice,
    round: itemRound,
  };
  req.store.insertOrderItem(newItem);
  if (menuItem.stock !== null && menuItem.stock !== undefined) req.store.adjustStock(menuItem.id, -qty);
  if (order.status === 'ready' && order.delivered_at) {
    req.store.updateOrder(order.id, { status: 'open' });
    req.store.updateTable(order.table_id, { status: 'occupied' });
  }
  const itemResult = { ...newItem, menu_item: menuItem, promotion_name: matchedPromo?.name ?? null, promotion_type: matchedPromo?.type ?? null };
  getTenantIO(req.tenantSlug).to('kitchen').to('waiters').emit('order:item_added', { orderId: order.id, item: itemResult });
  res.status(201).json(itemResult);
});

// PATCH /api/orders/:id/items/:itemId
router.patch('/:id/items/:itemId', requirePermission('orders', 'updateItem'), validateParams(idParamSchema), validateParams(itemIdParamSchema), (req: AuthRequest, res: Response): void => {
  const order = req.store.getOrderById(req.params.id);
  if (!order) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }

  if (req.user!.role === 'waiter') {
    const table = req.store.getTableById(order.table_id);
    if (table && table.assigned_waiter_id !== null && table.assigned_waiter_id !== req.user!.id) {
      res.status(403).json({ error: 'Esta mesa ya no está asignada a ti.' });
      return;
    }
  }

  const item = req.store.getOrderItemById(req.params.itemId);
  if (!item) { res.status(404).json({ error: 'Item no encontrado' }); return; }

  const vq = validate(updateOrderItemQtySchema, req.body);
  if (!vq.success) { res.status(400).json({ error: vq.error }); return; }
  const { quantity } = vq.data;

  const menuItem = req.store.getMenuItemById(item.menu_item_id)!;
  if (menuItem.stock !== null && menuItem.stock !== undefined) {
    const delta = quantity - item.quantity;
    if (delta > 0 && menuItem.stock < delta) {
      res.status(400).json({ error: `Stock insuficiente (disponible: ${menuItem.stock})` });
      return;
    }
    if (delta !== 0) req.store.adjustStock(item.menu_item_id, -delta);
  }

  const now = new Date();
  const activePromos = req.store.getActivePromotions().filter(p => isPromotionActive(p, now));
  const priorityOrder: Record<string, number> = { item: 0, category: 1, all: 2 };
  activePromos.sort((a, b) => priorityOrder[a.applies_to] - priorityOrder[b.applies_to]);
  const matchedPromo = activePromos.find(p => matchesPromotion(p, menuItem));
  const effectivePrice = matchedPromo ? calcEffectivePrice(menuItem.price, quantity, matchedPromo) : null;

  req.store.updateOrderItemQuantity(item.id, quantity, effectivePrice);
  const updated = req.store.getOrderItemById(item.id)!;
  const result = { ...updated, menu_item: menuItem, promotion_name: matchedPromo?.name ?? null, promotion_type: matchedPromo?.type ?? null };
  getTenantIO(req.tenantSlug).to('waiters').emit('order:item_updated', { orderId: order.id, item: result });
  res.json(result);
});

// DELETE /api/orders/:id/items/:itemId
router.delete('/:id/items/:itemId', requirePermission('orders', 'deleteItem'), validateParams(idParamSchema), validateParams(itemIdParamSchema), (req: AuthRequest, res: Response): void => {
  const item = req.store.getOrderItemById(req.params.itemId);
  if (item) {
    const mi = req.store.getMenuItemById(item.menu_item_id);
    if (mi && mi.stock !== null && mi.stock !== undefined) req.store.adjustStock(item.menu_item_id, item.quantity);
  }
  req.store.deleteOrderItem(req.params.itemId);
  res.json({ success: true });
});

// PATCH /api/orders/:id/deliver
router.patch('/:id/deliver', requirePermission('orders', 'deliver'), validateParams(idParamSchema), (req: AuthRequest, res: Response): void => {
  const order = req.store.getOrderById(req.params.id);
  if (!order) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }

  const items = req.store.getItemsByOrderId(order.id);
  const pendingItems = items.filter(i => i.status !== 'done');
  if (pendingItems.length > 0) {
    res.status(409).json({
      error: `Hay ${pendingItems.length} ítem(s) que cocina aún no ha terminado.`,
      pending_items: pendingItems.map(i => ({ id: i.id, menu_item_id: i.menu_item_id, status: i.status })),
    });
    return;
  }

  const now = new Date().toISOString();
  req.store.updateOrder(order.id, { delivered_at: now });
  req.store.updateTable(order.table_id, { status: 'served', last_interaction_at: now });
  res.json(enrichOrder(req.store.getOrderById(order.id)!, req.store));
});

// PATCH /api/orders/items/:itemId/status — solo cocina/manager
router.patch('/items/:itemId/status', requirePermission('orders', 'updateItemStatus'), (req: AuthRequest, res: Response): void => {
  const item = req.store.getOrderItemById(req.params.itemId);
  if (!item) { res.status(404).json({ error: 'Item no encontrado' }); return; }
  const vs = validate(updateOrderItemStatusSchema, req.body);
  if (!vs.success) { res.status(400).json({ error: vs.error }); return; }
  const { status } = vs.data;
  req.store.updateOrderItemStatus(item.id, status);
  const menuItem = req.store.getMenuItemById(item.menu_item_id);
  getTenantIO(req.tenantSlug).to('waiters').emit('order:item_status', { orderId: item.order_id, itemId: item.id, status });
  res.json({ ...item, status, menu_item: menuItem });
});

export default router;

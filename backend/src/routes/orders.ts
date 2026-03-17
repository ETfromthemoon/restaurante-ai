import { Router, Response } from 'express';
import {
  getOrders, getOrderById, getActiveOrderByTable, insertOrder, updateOrder,
  getTableById, updateTable,
  getMenuItemById,
  getItemsByOrderId, getOrderItemById,
  insertOrderItem, deleteOrderItem, updateOrderItemStatus, updateOrderItemQuantity,
  nextOrderId, nextOrderItemId,
} from '../db/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Order, OrderItem, OrderStatus, OrderItemStatus } from '../types';

const router = Router();
router.use(authMiddleware);

function enrichOrder(order: Order): Order {
  const table = getTableById(order.table_id);
  const items = getItemsByOrderId(order.id).map(item => ({
    ...item,
    menu_item: getMenuItemById(item.menu_item_id),
  }));
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

  const newItem: OrderItem = {
    id: nextOrderItemId(),
    order_id: order.id,
    menu_item_id,
    quantity: quantity || 1,
    notes,
    status: 'pending',
  };
  insertOrderItem(newItem);

  // Segunda ronda: si el pedido ya fue entregado, volver a estado open
  if (order.status === 'ready' && order.delivered_at) {
    updateOrder(order.id, { status: 'open' });
    updateTable(order.table_id, { status: 'occupied' });
  }

  res.status(201).json({ ...newItem, menu_item: menuItem });
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

  updateOrderItemQuantity(item.id, quantity);
  const updated = getOrderItemById(item.id)!;
  res.json({ ...updated, menu_item: getMenuItemById(updated.menu_item_id) });
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

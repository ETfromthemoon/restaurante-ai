import { Router, Response } from 'express';
import { orders, tables, menuItems, nextOrderId, nextOrderItemId } from '../db/store';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Order, OrderItem, OrderStatus, OrderItemStatus } from '../types';

const router = Router();
router.use(authMiddleware);

function enrichOrder(order: Order): Order {
  const table = tables.find(t => t.id === order.table_id);
  return {
    ...order,
    table,
    items: order.items?.map(item => ({
      ...item,
      menu_item: menuItems.find(m => m.id === item.menu_item_id),
    })),
  };
}

// GET /api/orders?status=kitchen
router.get('/', (req: AuthRequest, res: Response): void => {
  const { status } = req.query;
  const result = status
    ? orders.filter(o => o.status === status)
    : orders;
  res.json(result.map(enrichOrder));
});

// GET /api/orders/table/:tableId — pedido activo de una mesa
router.get('/table/:tableId', (req: AuthRequest, res: Response): void => {
  const order = orders.find(
    o => o.table_id === req.params.tableId && ['open', 'kitchen', 'ready', 'billing'].includes(o.status)
  );
  if (!order) {
    res.status(404).json({ error: 'No hay pedido activo para esta mesa' });
    return;
  }
  res.json(enrichOrder(order));
});

// GET /api/orders/:id
router.get('/:id', (req: AuthRequest, res: Response): void => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }
  res.json(enrichOrder(order));
});

// POST /api/orders — crear pedido (idempotente: devuelve pedido activo si ya existe)
router.post('/', (req: AuthRequest, res: Response): void => {
  const { table_id } = req.body;
  const table = tables.find(t => t.id === table_id);
  if (!table) {
    res.status(404).json({ error: 'Mesa no encontrada' });
    return;
  }

  const existing = orders.find(
    o => o.table_id === table_id && ['open', 'kitchen', 'ready', 'billing'].includes(o.status)
  );
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
    items: [],
  };

  orders.push(newOrder);
  table.status = 'occupied';
  table.last_interaction_at = new Date().toISOString();
  res.status(201).json(enrichOrder(newOrder));
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', (req: AuthRequest, res: Response): void => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }

  const { status } = req.body as { status: OrderStatus };
  order.status = status;

  const table = tables.find(t => t.id === order.table_id);
  if (table) {
    if (status === 'kitchen') { table.status = 'occupied'; table.last_interaction_at = new Date().toISOString(); }
    if (status === 'ready')   { table.status = 'ready'; }
    if (status === 'billing') { table.status = 'billing'; table.last_interaction_at = new Date().toISOString(); }
    if (status === 'billed')  { table.status = 'free'; table.last_interaction_at = undefined; }
  }

  res.json(enrichOrder(order));
});

// POST /api/orders/:id/items — agregar item
router.post('/:id/items', (req: AuthRequest, res: Response): void => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }

  const { menu_item_id, quantity, notes } = req.body;
  const menuItem = menuItems.find(m => m.id === menu_item_id);
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

  if (!order.items) order.items = [];
  order.items.push(newItem);

  // Segunda ronda: si el pedido ya fue entregado, volver a estado open
  if (order.status === 'ready' && order.delivered_at) {
    order.status = 'open';
    const table = tables.find(t => t.id === order.table_id);
    if (table) table.status = 'occupied';
  }

  res.status(201).json({ ...newItem, menu_item: menuItem });
});

// DELETE /api/orders/:id/items/:itemId — quitar item
router.delete('/:id/items/:itemId', (req: AuthRequest, res: Response): void => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order || !order.items) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }
  order.items = order.items.filter(i => i.id !== req.params.itemId);
  res.json({ success: true });
});

// PATCH /api/orders/:id/deliver — mesero entrega platos a la mesa
router.patch('/:id/deliver', (req: AuthRequest, res: Response): void => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Pedido no encontrado' });
    return;
  }
  order.delivered_at = new Date().toISOString();

  const table = tables.find(t => t.id === order.table_id);
  if (table) {
    table.status = 'served';
    table.last_interaction_at = order.delivered_at;
  }

  res.json(enrichOrder(order));
});

// PATCH /api/orders/items/:itemId/status — actualizar estado item (cocina)
router.patch('/items/:itemId/status', (req: AuthRequest, res: Response): void => {
  for (const order of orders) {
    const item = order.items?.find(i => i.id === req.params.itemId);
    if (item) {
      const { status } = req.body as { status: OrderItemStatus };
      item.status = status;
      res.json({ ...item, menu_item: menuItems.find(m => m.id === item.menu_item_id) });
      return;
    }
  }
  res.status(404).json({ error: 'Item no encontrado' });
});

export default router;

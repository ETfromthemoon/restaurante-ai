import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authMiddleware, AuthRequest, requireRole, requirePermission } from '../middleware/auth';
import { getMenuItemById, getMenuItems } from '../db/store';
import { db } from '../db/database';

const router = Router();
router.use(authMiddleware);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// 4.1  POST /api/ai/pairing  — sugerencias de maridaje
// ---------------------------------------------------------------------------
router.post('/pairing', requirePermission('ai', 'pairing'), async (req: AuthRequest, res: Response): Promise<void> => {
  const { itemId } = req.body as { itemId?: string };
  if (!itemId) { res.status(400).json({ error: 'Falta itemId' }); return; }

  const item = getMenuItemById(itemId);
  if (!item) { res.status(404).json({ error: 'Plato no encontrado' }); return; }

  // Solo los platos disponibles que NO sean el plato solicitado
  const available = getMenuItems()
    .filter(m => m.available && m.id !== itemId)
    .map(m => `- ${m.name} (${m.category}) S/${m.price}`);

  const prompt = `Eres un sommelier y chef experto en cocina peruana.
El comensal acaba de pedir: "${item.name}" (${item.category}) — ${item.description || 'plato peruano'}.

Del menú disponible:
${available.join('\n')}

Sugiere 2 acompañamientos ideales (bebida o postre). Para cada uno, indica el nombre EXACTO del menú y una frase breve y apetitosa de por qué combina (máx. 15 palabras). Responde SOLO con JSON:
[
  { "name": "<nombre exacto>", "reason": "<frase breve>" },
  { "name": "<nombre exacto>", "reason": "<frase breve>" }
]`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as any).text.trim();
    // Extraer el JSON del texto de respuesta
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) { res.json({ suggestions: [] }); return; }
    const suggestions = JSON.parse(jsonMatch[0]) as { name: string; reason: string }[];

    // Enriquecer con datos del menú para incluir id y precio
    const enriched = suggestions.map(s => {
      const found = getMenuItems().find(m =>
        m.name.toLowerCase().trim() === s.name.toLowerCase().trim()
      );
      return found
        ? { id: found.id, name: found.name, price: found.price, category: found.category, reason: s.reason }
        : { id: null, name: s.name, price: null, category: null, reason: s.reason };
    });

    res.json({ item: { id: item.id, name: item.name }, suggestions: enriched });
  } catch (err: any) {
    console.error('[AI pairing]', err?.message);
    res.status(500).json({ error: 'Error al obtener sugerencias de maridaje' });
  }
});

// ---------------------------------------------------------------------------
// 4.2  GET /api/ai/shift-summary  — resumen narrativo del turno (gerente)
// ---------------------------------------------------------------------------
router.get('/shift-summary', requireRole('manager'), async (_req: AuthRequest, res: Response): Promise<void> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  // Datos del día
  const salesRow = db.prepare(`
    SELECT COALESCE(SUM(oi.quantity * COALESCE(oi.effective_price, m.price)), 0) AS total,
           COUNT(DISTINCT o.id) AS order_count
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN menu_items  m  ON m.id = oi.menu_item_id
    WHERE o.status = 'billed' AND o.created_at >= ?
  `).get(todayISO) as { total: number; order_count: number };

  const topItems = db.prepare(`
    SELECT m.name, SUM(oi.quantity) AS total_qty
    FROM order_items oi
    JOIN menu_items m ON m.id = oi.menu_item_id
    JOIN orders     o ON o.id = oi.order_id
    WHERE o.created_at >= ?
    GROUP BY m.id, m.name
    ORDER BY total_qty DESC
    LIMIT 5
  `).all(todayISO) as { name: string; total_qty: number }[];

  const avgRow = db.prepare(`
    SELECT AVG((JULIANDAY(delivered_at) - JULIANDAY(created_at)) * 1440) AS avg_minutes
    FROM orders
    WHERE status = 'billed' AND delivered_at IS NOT NULL AND created_at >= ?
  `).get(todayISO) as { avg_minutes: number | null };

  const tablesRow = db.prepare(
    `SELECT COUNT(*) AS count FROM tables WHERE status != 'free'`
  ).get() as { count: number };

  const hourlyRows = db.prepare(`
    SELECT strftime('%H', o.created_at) AS hour,
           COALESCE(SUM(oi.quantity * COALESCE(oi.effective_price, m.price)), 0) AS revenue
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN menu_items  m  ON m.id = oi.menu_item_id
    WHERE o.created_at >= ?
    GROUP BY hour ORDER BY hour
  `).all(todayISO) as { hour: string; revenue: number }[];

  const stats = {
    ventas_totales: `S/${salesRow.total.toFixed(2)}`,
    pedidos_cerrados: salesRow.order_count,
    mesas_activas_ahora: tablesRow.count,
    tiempo_promedio_atencion: avgRow.avg_minutes != null ? `${Math.round(avgRow.avg_minutes)} min` : 'sin datos',
    top_platos: topItems.map(i => `${i.name} (${i.total_qty})`).join(', ') || 'ninguno',
    ventas_por_hora: hourlyRows.map(r => `${r.hour}h: S/${r.revenue.toFixed(0)}`).join(', ') || 'sin datos',
  };

  const prompt = `Eres el asistente de gestión de un restaurante peruano. El gerente quiere saber cómo fue el turno de hoy.
Datos del día:
- Ventas totales: ${stats.ventas_totales}
- Pedidos cerrados: ${stats.pedidos_cerrados}
- Mesas activas ahora: ${stats.mesas_activas_ahora}
- Tiempo promedio de atención: ${stats.tiempo_promedio_atencion}
- Top platos: ${stats.top_platos}
- Ventas por hora: ${stats.ventas_por_hora}

Escribe un resumen ejecutivo breve (3-5 oraciones) y amigable en español. Menciona puntos positivos y, si aplica, una sugerencia de mejora concreta. Tono profesional pero cercano.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = (message.content[0] as any).text.trim();
    res.json({ summary, stats });
  } catch (err: any) {
    console.error('[AI shift-summary]', err?.message);
    res.status(500).json({ error: 'Error al generar resumen del turno' });
  }
});

// ---------------------------------------------------------------------------
// 4.3  GET /api/ai/delay-check  — detección de pedidos demorados
// ---------------------------------------------------------------------------
router.get('/delay-check', requirePermission('ai', 'delayCheck'), async (_req: AuthRequest, res: Response): Promise<void> => {
  // Promedio histórico (últimos 30 días, pedidos completados)
  const histRow = db.prepare(`
    SELECT AVG((JULIANDAY(delivered_at) - JULIANDAY(created_at)) * 1440) AS avg_minutes
    FROM orders
    WHERE status = 'billed' AND delivered_at IS NOT NULL
  `).get() as { avg_minutes: number | null };

  const avgMinutes = histRow.avg_minutes ?? 30; // fallback 30 min
  const thresholdMinutes = avgMinutes * 1.5;     // alerta si >150% del promedio

  // Pedidos activos en cocina
  const activeOrders = db.prepare(`
    SELECT id, table_id, created_at,
           (JULIANDAY('now') - JULIANDAY(created_at)) * 1440 AS elapsed_minutes
    FROM orders
    WHERE status IN ('open','kitchen')
  `).all() as { id: string; table_id: string; created_at: string; elapsed_minutes: number }[];

  const delayed = activeOrders.filter(o => o.elapsed_minutes > thresholdMinutes);

  if (delayed.length === 0) {
    res.json({ alerts: [], message: 'Sin demoras detectadas.' });
    return;
  }

  const prompt = `Eres el asistente de un restaurante. Los siguientes pedidos llevan más tiempo del promedio histórico (${Math.round(avgMinutes)} min promedio, umbral ${Math.round(thresholdMinutes)} min):
${delayed.map(o => `- Mesa ${o.table_id}: pedido ${o.id} lleva ${Math.round(o.elapsed_minutes)} min`).join('\n')}

Redacta un alerta corta y accionable (1-2 oraciones) para el gerente, en español.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const alertText = (message.content[0] as any).text.trim();
    res.json({
      alerts: delayed.map(o => ({
        orderId: o.id,
        tableId: o.table_id,
        elapsedMinutes: Math.round(o.elapsed_minutes),
        threshold: Math.round(thresholdMinutes),
      })),
      message: alertText,
      avgHistoricalMinutes: Math.round(avgMinutes),
    });
  } catch (err: any) {
    console.error('[AI delay-check]', err?.message);
    res.status(500).json({ error: 'Error al verificar demoras' });
  }
});

// ---------------------------------------------------------------------------
// 4.4  GET /api/ai/menu-recommendations  — recomendaciones por hora
// ---------------------------------------------------------------------------
router.get('/menu-recommendations', requirePermission('ai', 'menuRecommendations'), async (_req: AuthRequest, res: Response): Promise<void> => {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'mañana' : hour < 16 ? 'almuerzo' : hour < 20 ? 'tarde' : 'noche';

  // Top platos en la misma franja horaria en los últimos 14 días
  const topByHour = db.prepare(`
    SELECT m.id, m.name, m.category, m.price, SUM(oi.quantity) AS total_qty
    FROM order_items oi
    JOIN menu_items m ON m.id = oi.menu_item_id
    JOIN orders     o ON o.id = oi.order_id
    WHERE m.available = 1
      AND CAST(strftime('%H', o.created_at) AS INTEGER) BETWEEN ? AND ?
      AND o.created_at >= datetime('now','-14 days')
    GROUP BY m.id
    ORDER BY total_qty DESC
    LIMIT 8
  `).all(Math.max(0, hour - 2), Math.min(23, hour + 2)) as { id: string; name: string; category: string; price: number; total_qty: number }[];

  const menuList = getMenuItems().filter(m => m.available).map(m => `${m.name} (${m.category}) S/${m.price}`);

  const prompt = `Eres un experto en restaurantes peruanos. Son las ${hour}:00 (${period}).
Platos más pedidos en esta franja (últimos 14 días): ${topByHour.map(i => i.name).join(', ') || 'sin datos aún'}.
Menú disponible: ${menuList.slice(0, 20).join(', ')}.

Recomienda 3 platos para destacar ahora. Devuelve SOLO JSON:
[
  { "name": "<nombre exacto del menú>", "reason": "<por qué ahora, máx 12 palabras>" },
  { "name": "<nombre exacto del menú>", "reason": "<por qué ahora, máx 12 palabras>" },
  { "name": "<nombre exacto del menú>", "reason": "<por qué ahora, máx 12 palabras>" }
]`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 350,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as any).text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) { res.json({ recommendations: [], period }); return; }

    const recs = JSON.parse(jsonMatch[0]) as { name: string; reason: string }[];
    const enriched = recs.map(r => {
      const found = getMenuItems().find(m =>
        m.name.toLowerCase().trim() === r.name.toLowerCase().trim()
      );
      return found
        ? { id: found.id, name: found.name, price: found.price, category: found.category, reason: r.reason }
        : { id: null, name: r.name, price: null, category: null, reason: r.reason };
    });

    res.json({ recommendations: enriched, period, hour });
  } catch (err: any) {
    console.error('[AI menu-recommendations]', err?.message);
    res.status(500).json({ error: 'Error al obtener recomendaciones' });
  }
});

export default router;

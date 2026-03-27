# Matriz de Permisos — Sistema de Restaurante
> Actualizada: 2026-03-27

## Roles del Sistema

| Rol | Descripción | Área principal |
|-----|-------------|----------------|
| `waiter` | Mesero — atiende mesas | `/mesas` |
| `cook` | Cocinero — prepara pedidos | `/cocina` |
| `manager` | Gerente — administra todo | `/gerente` |

---

## Matriz Completa de Permisos (Backend)

### Órdenes (`/api/orders`)

| Endpoint | Waiter | Cook | Manager | Notas |
|----------|--------|------|---------|-------|
| `GET /` | ✅ | ✅ | ✅ | Ver listado de órdenes |
| `GET /table/:tableId` | ✅ | ✅ | ✅ | Ver orden activa de mesa |
| `GET /:id` | ✅ | ✅ | ✅ | Ver detalles de orden |
| `POST /` | ✅ | ❌ | ✅ | Crear nueva orden |
| `PATCH /:id/status` | ✅ | ❌ | ✅ | Cambiar estado (kitchen, billing, billed) |
| `POST /:id/items` | ✅ | ❌ | ✅ | Agregar ítem al pedido |
| `PATCH /:id/items/:itemId` | ✅ | ❌ | ✅ | Modificar cantidad de ítem |
| `DELETE /:id/items/:itemId` | ✅ | ❌ | ✅ | Eliminar ítem del pedido |
| `PATCH /:id/deliver` | ✅ | ❌ | ✅ | Marcar pedido como entregado |
| `PATCH /items/:itemId/status` | ❌ | ✅ | ✅ | Actualizar estado de ítem en cocina |

### Menú (`/api/menu`)

| Endpoint | Waiter | Cook | Manager | Notas |
|----------|--------|------|---------|-------|
| `GET /` | ✅ | ✅ | ✅ | Ver carta del menú |
| `POST /` | ❌ | ❌ | ✅ | Crear plato |
| `PATCH /:id` | ❌ | ❌ | ✅ | Editar plato |

### Mesas (`/api/tables`)

| Endpoint | Waiter | Cook | Manager | Notas |
|----------|--------|------|---------|-------|
| `GET /` | ✅ | ✅ | ✅ | Ver mapa de mesas |
| `GET /waiters` | ❌ | ❌ | ✅ | Listar meseros (para asignación) |
| `PATCH /:id/assign` | ❌ | ❌ | ✅ | Asignar mesero a mesa |
| `PATCH /:id` | ✅ | ❌ | ✅ | Actualizar estado de mesa |

### Promociones (`/api/promotions`)

| Endpoint | Waiter | Cook | Manager | Notas |
|----------|--------|------|---------|-------|
| `GET /` | ❌ | ❌ | ✅ | Ver todas las promociones |
| `GET /active` | ✅ | ✅ | ✅ | Ver promociones activas ahora |
| `POST /` | ❌ | ❌ | ✅ | Crear promoción |
| `PATCH /:id` | ❌ | ❌ | ✅ | Editar / activar promoción |

### Caja (`/api/caja`)

| Endpoint | Waiter | Cook | Manager | Notas |
|----------|--------|------|---------|-------|
| `GET /active` | ✅ | ❌ | ✅ | Ver si hay caja activa |
| `GET /` | ❌ | ❌ | ✅ | Ver historial de sesiones |
| `POST /open` | ❌ | ❌ | ✅ | Abrir turno de caja |
| `PATCH /:id/close` | ❌ | ❌ | ✅ | Cerrar turno de caja |
| `GET /:id/summary` | ❌ | ❌ | ✅ | Resumen financiero de sesión |

### Cocina (`/api/kitchen`)

| Endpoint | Waiter | Cook | Manager | Notas |
|----------|--------|------|---------|-------|
| `GET /stats` | ❌ | ✅ | ✅ | Estadísticas de cocina |

### Dashboard (`/api/dashboard`)

| Endpoint | Waiter | Cook | Manager | Notas |
|----------|--------|------|---------|-------|
| `GET /` | ❌ | ❌ | ✅ | Panel de control general |

### IA (`/api/ai`)

| Endpoint | Waiter | Cook | Manager | Notas |
|----------|--------|------|---------|-------|
| `POST /pairing` | ✅ | ❌ | ✅ | Sugerencias de maridaje |
| `GET /shift-summary` | ❌ | ❌ | ✅ | Resumen narrativo del turno |
| `GET /delay-check` | ✅ | ❌ | ✅ | Alerta de pedidos demorados |
| `GET /menu-recommendations` | ✅ | ❌ | ✅ | Recomendaciones por hora |

---

## Matriz de Permisos (Frontend — Rutas)

| Ruta | Waiter | Cook | Manager |
|------|--------|------|---------|
| `/login` | ✅ | ✅ | ✅ |
| `/mesas` | ✅ | ❌ | ✅ |
| `/mesas/:id/pedido` | ✅ | ❌ | ✅ |
| `/mesas/:id/pedido/menu` | ✅ | ❌ | ✅ |
| `/mesas/:id/historial` | ✅ | ❌ | ✅ |
| `/cocina` | ❌ | ✅ | ✅ |
| `/cocina/:orderId` | ❌ | ✅ | ✅ |
| `/gerente` | ❌ | ❌ | ✅ |
| `/gerente/menu` | ❌ | ❌ | ✅ |
| `/gerente/promociones` | ❌ | ❌ | ✅ |
| `/gerente/caja` | ❌ | ❌ | ✅ |
| `/gerente/caja/historial` | ❌ | ❌ | ✅ |
| `/gerente/mesas/asignar` | ❌ | ❌ | ✅ |

---

## Flujos de Trabajo por Rol

### 🧑‍💼 Waiter (Mesero)
```
Login → Ver mapa de mesas → Seleccionar mesa →
Crear pedido → Agregar ítems del menú →
Ver promociones activas (automáticas) →
Enviar a cocina (status: kitchen) →
Esperar notificación de listo →
Entregar (PATCH /deliver) →
Solicitar cuenta (status: billing) →
Cobrar y cerrar (status: billed)
```

### 👨‍🍳 Cook (Cocinero)
```
Login → Ver cola de pedidos (/cocina) →
Abrir pedido para ver detalles →
Actualizar estado de ítems (pending → preparing → done) →
Sistema notifica al mesero automáticamente (WebSocket)
```

### 👔 Manager (Gerente)
```
Login → Dashboard con KPIs →
[Gestionar menú: crear/editar platos] →
[Gestionar promociones: crear/activar/desactivar] →
[Caja: abrir/cerrar turno, ver resumen financiero] →
[Asignar meseros a mesas] →
[Ver estadísticas de cocina] →
[Resumen del turno con IA]
```

---

## Notas de Implementación

1. **Autenticación**: JWT firmado, expira en 8 horas
2. **Middleware**: `authMiddleware` valida token, `requireRole()` valida rol
3. **Frontend**: `ProtectedRoute` component protege rutas enteras
4. **Configuración**: Ver `backend/src/config/permissions.config.ts`

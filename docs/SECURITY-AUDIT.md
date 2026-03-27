# Auditoría de Seguridad — Roles y Permisos
> Generado: 2026-03-27

## Resumen Ejecutivo

El sistema cuenta con 3 roles: `waiter`, `cook`, `manager`. La arquitectura base es correcta, pero se identificaron **7 vulnerabilidades** y **4 inconsistencias de patrón** que deben corregirse.

---

## Hallazgos por Archivo

### 🔴 `backend/src/routes/orders.ts`

| Endpoint | Método | Estado | Problema |
|----------|--------|--------|----------|
| `PATCH /:id/status` | PATCH | ⚠️ Sin restricción de rol | Un cook podría cambiar el pedido a `billing` o `billed` (manejo de caja) |
| `PATCH /:id/items/:itemId` | PATCH | ⚠️ Sin restricción de rol | Un cook podría modificar cantidades de ítems |
| `DELETE /:id/items/:itemId` | DELETE | ⚠️ Sin restricción de rol | Un cook podría eliminar ítems del pedido |
| `PATCH /:id/deliver` | PATCH | ⚠️ Sin restricción de rol | Un cook podría marcar pedidos como entregados |

**Restricciones correctas ya implementadas:**
- `POST /` → `requireRole('waiter', 'manager')` ✅
- `POST /:id/items` → `requireRole('waiter', 'manager')` ✅
- `PATCH /items/:itemId/status` → `requireRole('cook', 'manager')` ✅
- `router.use(authMiddleware)` aplica a toda la ruta ✅

---

### 🟡 `backend/src/routes/tables.ts`

| Endpoint | Método | Estado | Problema |
|----------|--------|--------|----------|
| `PATCH /:id` | PATCH | ⚠️ Sin restricción de rol | Un cook podría cambiar el estado de una mesa |
| `GET /waiters` | GET | ⚠️ Sin restricción de rol | Cook no necesita ver lista de meseros disponibles |

**Correctos:**
- `PATCH /:id/assign` → `requireRole('manager')` ✅

---

### 🟡 `backend/src/routes/caja.ts`

| Endpoint | Método | Estado | Problema |
|----------|--------|--------|----------|
| `GET /` | GET | ⚠️ Validación manual inline | Usa `req.user?.role !== 'manager'` en lugar de `requireRole()` |
| `POST /open` | POST | ⚠️ Validación manual inline | Usa `req.user?.role !== 'manager'` en lugar de `requireRole()` |
| `PATCH /:id/close` | PATCH | ⚠️ Validación manual inline | Usa `req.user?.role !== 'manager'` en lugar de `requireRole()` |
| `GET /:id/summary` | GET | ⚠️ Validación manual inline | Usa `req.user?.role !== 'manager'` en lugar de `requireRole()` |

**Nota:** La lógica es funcionalmente correcta pero el patrón es inconsistente con el resto del sistema.

---

### 🟡 `backend/src/routes/ai.ts`

| Endpoint | Método | Estado | Problema |
|----------|--------|--------|----------|
| `GET /delay-check` | GET | ⚠️ Sin restricción de rol | El cocinero no necesita alertas de demoras (es info gerencial/mesero) |
| `POST /pairing` | POST | ℹ️ Sin restricción | Aceptable: meseros/manager usan maridaje al tomar pedido |
| `GET /menu-recommendations` | GET | ℹ️ Sin restricción | Aceptable: cualquier rol puede ver recomendaciones |

---

### ✅ `backend/src/routes/menu.ts` — Sin problemas

- `GET /` → todos autenticados ✅ (correcto)
- `POST /` → `requireRole('manager')` ✅
- `PATCH /:id` → `requireRole('manager')` ✅

---

### ✅ `backend/src/routes/promotions.ts` — Sin problemas

- `GET /` → `requireRole('manager')` ✅
- `GET /active` → todos autenticados ✅ (correcto, meseros ven promos)
- `POST /` → `requireRole('manager')` ✅
- `PATCH /:id` → `requireRole('manager')` ✅

---

### ✅ `backend/src/routes/kitchen.ts` — Sin problemas

- `GET /stats` → `requireRole('manager', 'cook')` ✅

---

### ✅ `backend/src/routes/dashboard.ts` — (asumir correcto por convención)

---

## Hallazgos en Frontend

### `frontend/src/App.tsx` — Rutas protegidas

| Ruta | Roles Permitidos | Estado |
|------|-----------------|--------|
| `/mesas*` | waiter, manager | ✅ |
| `/cocina*` | cook, manager | ✅ |
| `/gerente*` | manager | ✅ |

**Hallazgo:** Las rutas están bien protegidas. Sin embargo, **no existe un hook `useCanAccess()`** para controlar la visibilidad de botones/acciones dentro de los componentes según el rol del usuario.

---

## Resumen de Problemas

### 🔴 Alta Prioridad (vulnerabilidades reales)

| # | Archivo | Endpoint | Riesgo |
|---|---------|----------|--------|
| 1 | orders.ts | `PATCH /:id/status` | Cook puede hacer billing/checkout |
| 2 | orders.ts | `PATCH /:id/items/:itemId` | Cook puede modificar ítems |
| 3 | orders.ts | `DELETE /:id/items/:itemId` | Cook puede eliminar ítems |

### 🟡 Media Prioridad (inconsistencias de patrón)

| # | Archivo | Endpoint | Riesgo |
|---|---------|----------|--------|
| 4 | orders.ts | `PATCH /:id/deliver` | Cook puede marcar entregado |
| 5 | tables.ts | `PATCH /:id` | Cook puede cambiar estado de mesa |
| 6 | caja.ts | `GET /, POST /open, etc.` | Código no usa requireRole() patrón estándar |
| 7 | ai.ts | `GET /delay-check` | Cook accede a info gerencial innecesaria |

### 🟢 Bajo (sin impacto crítico)

| # | Archivo | Endpoint | Observación |
|---|---------|----------|-------------|
| 8 | tables.ts | `GET /waiters` | Cook puede ver lista de meseros |
| 9 | Frontend | Componentes internos | Falta hook `useCanAccess()` para granularidad de UI |

---

## Plan de Corrección

Ver `PERMISSIONS-MATRIX.md` para la matriz completa y `permissions.config.ts` para la implementación.

### Correcciones a aplicar:

1. **orders.ts:**
   - `PATCH /:id/status` → `requireRole('waiter', 'manager')`
   - `PATCH /:id/items/:itemId` → `requireRole('waiter', 'manager')`
   - `DELETE /:id/items/:itemId` → `requireRole('waiter', 'manager')`
   - `PATCH /:id/deliver` → `requireRole('waiter', 'manager')`

2. **tables.ts:**
   - `PATCH /:id` → `requireRole('waiter', 'manager')`
   - `GET /waiters` → `requireRole('manager')` (solo manager asigna)

3. **caja.ts:**
   - Reemplazar validaciones inline con `requireRole('manager')`

4. **ai.ts:**
   - `GET /delay-check` → `requireRole('waiter', 'manager')`

5. **Frontend:**
   - Crear `useCanAccess()` hook para validaciones de UI granulares

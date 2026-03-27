# Guía de Roles y Permisos
> Sistema de Restaurante AI

---

## Roles Disponibles

| Rol | Código | Descripción | Ruta de inicio |
|-----|--------|-------------|----------------|
| Mesero | `waiter` | Atiende mesas, toma pedidos | `/mesas` |
| Cocinero | `cook` | Prepara pedidos en cocina | `/cocina` |
| Gerente | `manager` | Administra el restaurante | `/gerente` |

---

## Flujos de Trabajo

### Mesero (`waiter`)
```
Login → Mapa de mesas → Mesa ocupada →
  Crear pedido → Agregar ítems →
  Enviar a cocina → [Esperar notificación] →
  Entregar → Solicitar cuenta → Cobrar y cerrar
```

### Cocinero (`cook`)
```
Login → Cola de pedidos en cocina →
  Ver detalles de pedido →
  Actualizar estado de cada ítem: pending → preparing → done →
  Sistema notifica al mesero por WebSocket
```

### Gerente (`manager`)
```
Login → Dashboard con KPIs →
  [Menú: crear/editar platos] →
  [Promociones: crear/activar/desactivar] →
  [Caja: abrir turno / ver resumen / cerrar turno] →
  [Mesas: asignar meseros] →
  [IA: resumen narrativo del turno]
```

---

## Matriz de Permisos por Recurso

### Órdenes
| Acción | Waiter | Cook | Manager |
|--------|--------|------|---------|
| Ver lista | ✅ | ✅ | ✅ |
| Ver detalle | ✅ | ✅ | ✅ |
| Crear orden | ✅ | ❌ | ✅ |
| Cambiar estado | ✅ | ❌ | ✅ |
| Agregar ítem | ✅ | ❌ | ✅ |
| Modificar ítem | ✅ | ❌ | ✅ |
| Eliminar ítem | ✅ | ❌ | ✅ |
| Marcar entregado | ✅ | ❌ | ✅ |
| Actualizar estado ítem (cocina) | ❌ | ✅ | ✅ |

### Menú, Mesas, Caja, IA
Ver `docs/PERMISSIONS-MATRIX.md` para la tabla completa.

---

## Implementación Técnica

### Backend — Middleware de Autorización

**Archivo:** `backend/src/middleware/auth.ts`

```typescript
// Autenticar (validar token JWT)
router.use(authMiddleware);

// Autorizar por roles específicos
router.post('/orders', requireRole('waiter', 'manager'), handler);

// Autorizar usando la matriz centralizada
router.patch('/orders/:id/status', requirePermission('orders', 'updateStatus'), handler);
```

### Backend — Configuración Centralizada

**Archivo:** `backend/src/config/permissions.config.ts`

```typescript
export const PERMISSIONS = {
  orders: {
    create: ['waiter', 'manager'],
    updateStatus: ['waiter', 'manager'],
    // ...
  },
  // ...
};

// Para validar en código
canAccess(userRole, 'orders', 'create'); // → boolean
```

### Frontend — Protección de Rutas

**Archivo:** `frontend/src/App.tsx`

```tsx
// Proteger una sección completa por rol
<Route element={<ProtectedRoute roles={['waiter', 'manager']} />}>
  <Route path="/mesas" element={<TableMapPage />} />
</Route>
```

### Frontend — Visibilidad de UI por Permisos

**Archivo:** `frontend/src/hooks/useCanAccess.ts`

```tsx
import { useCanAccess } from '../hooks/useCanAccess';

function OrderActions() {
  const canDelete = useCanAccess('orders', 'deleteItem');
  const canUpdateStatus = useCanAccess('orders', 'updateStatus');

  return (
    <>
      {canUpdateStatus && <button>Enviar a cocina</button>}
      {canDelete && <button>Eliminar ítem</button>}
    </>
  );
}
```

---

## Cómo Agregar una Nueva Ruta con Permisos

### Paso 1: Definir el permiso en la config

```typescript
// backend/src/config/permissions.config.ts
export const PERMISSIONS = {
  // Agregar a un recurso existente o crear uno nuevo
  miRecurso: {
    miAccion: ['waiter', 'manager'], // roles permitidos
  },
};
```

### Paso 2: Aplicar el middleware en la ruta

```typescript
// backend/src/routes/miRuta.ts
router.get('/endpoint', requirePermission('miRecurso', 'miAccion'), handler);
```

### Paso 3: Sincronizar el frontend

```typescript
// frontend/src/hooks/useCanAccess.ts
const PERMISSIONS = {
  // Agregar la misma definición aquí
  miRecurso: {
    miAccion: ['waiter', 'manager'],
  },
};
```

### Paso 4: Usar en componentes

```tsx
const canAccess = useCanAccess('miRecurso', 'miAccion');
return canAccess ? <ComponenteRestringido /> : null;
```

### Paso 5: Agregar tests

```typescript
// backend/tests/permissions.test.ts
test('waiter puede hacer miAccion', () => {
  expect(canAccess('waiter', 'miRecurso', 'miAccion')).toBe(true);
});
```

---

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `backend/src/config/permissions.config.ts` | Fuente única de verdad de permisos (backend) |
| `backend/src/middleware/auth.ts` | Middlewares `authMiddleware`, `requireRole`, `requirePermission` |
| `backend/src/routes/*.ts` | Aplicación de middlewares en endpoints |
| `frontend/src/hooks/useCanAccess.ts` | Hook para validar permisos en UI |
| `frontend/src/components/ProtectedRoute.tsx` | Protección de rutas completas |
| `docs/PERMISSIONS-MATRIX.md` | Tabla visual de todos los permisos |
| `docs/SECURITY-AUDIT.md` | Reporte de hallazgos de seguridad |

# Sistema de Autenticación y Permisos - Matriz Centralizada

## Resumen

El sistema usa una **matriz centralizada de permisos** definida en `backend/src/config/permissions.config.ts` que controla el acceso a recursos y acciones basado en roles.

**3 Roles definidos:**
- `waiter` - Mesero
- `cook` - Cocinero
- `manager` - Gerente

---

## Arquitectura de Control de Acceso

### Backend

**Middleware en `backend/src/middleware/auth.ts`:**

```typescript
// Valida JWT y carga req.user
export function authMiddleware(req, res, next)

// Valida que el usuario tenga el rol especificado
export function requireRole(...roles: string[])

// Valida contra la matriz centralizada de permisos
export function requirePermission(resource: string, action: string)
```

**Matriz en `backend/src/config/permissions.config.ts`:**

```typescript
export const PERMISSIONS: PermissionsMap = {
  orders: { create, read, list, updateStatus, addItem, updateItem, deleteItem, deliver, updateItemStatus },
  menu: { read, create, update },
  tables: { list, update, assign, listWaiters },
  promotions: { list, listActive, create, update },
  caja: { readActive, readHistory, open, close, summary },
  kitchen: { stats },
  dashboard: { read },
  ai: { pairing, shiftSummary, delayCheck, menuRecommendations },
};

export function canAccess(role: string, resource: string, action: string): boolean
```

### Frontend

**Hook en `frontend/src/hooks/useCanAccess.ts`:**

```typescript
export function useCanAccess(resource: string, action: string): boolean
```

**Matriz duplicada en `useCanAccess.ts`** (debe mantenerse sincronizada con backend)

---

## Matriz Completa de Permisos

### ORDERS (Órdenes)
| Acción | Waiter | Cook | Manager |
|--------|--------|------|---------|
| `list` | ✅ | ✅ | ✅ |
| `read` | ✅ | ✅ | ✅ |
| `create` | ✅ | ❌ | ✅ |
| `updateStatus` | ✅ | ❌ | ✅ |
| `addItem` | ✅ | ❌ | ✅ |
| `updateItem` | ✅ | ❌ | ✅ |
| `deleteItem` | ✅ | ❌ | ✅ |
| `deliver` | ✅ | ❌ | ✅ |
| `updateItemStatus` | ❌ | ✅ | ✅ |

### MENU (Menú)
| Acción | Waiter | Cook | Manager |
|--------|--------|------|---------|
| `read` | ✅ | ✅ | ✅ |
| `create` | ❌ | ❌ | ✅ |
| `update` | ❌ | ❌ | ✅ |

### TABLES (Mesas)
| Acción | Waiter | Cook | Manager |
|--------|--------|------|---------|
| `list` | ✅ | ✅ | ✅ |
| `update` | ✅ | ❌ | ✅ |
| `assign` | ❌ | ❌ | ✅ |
| `listWaiters` | ❌ | ❌ | ✅ |

### PROMOTIONS (Promociones)
| Acción | Waiter | Cook | Manager |
|--------|--------|------|---------|
| `list` | ❌ | ❌ | ✅ |
| `listActive` | ✅ | ✅ | ✅ |
| `create` | ❌ | ❌ | ✅ |
| `update` | ❌ | ❌ | ✅ |

### CAJA (Caja)
| Acción | Waiter | Cook | Manager |
|--------|--------|------|---------|
| `readActive` | ✅ | ❌ | ✅ |
| `readHistory` | ❌ | ❌ | ✅ |
| `open` | ❌ | ❌ | ✅ |
| `close` | ❌ | ❌ | ✅ |
| `summary` | ❌ | ❌ | ✅ |

### KITCHEN (Cocina)
| Acción | Waiter | Cook | Manager |
|--------|--------|------|---------|
| `stats` | ❌ | ✅ | ✅ |

### DASHBOARD (Panel)
| Acción | Waiter | Cook | Manager |
|--------|--------|------|---------|
| `read` | ❌ | ❌ | ✅ |

### AI (IA - Claude)
| Acción | Waiter | Cook | Manager |
|--------|--------|------|---------|
| `pairing` | ✅ | ❌ | ✅ |
| `shiftSummary` | ❌ | ❌ | ✅ |
| `delayCheck` | ✅ | ❌ | ✅ |
| `menuRecommendations` | ✅ | ❌ | ✅ |

---

## Uso en Rutas

### Patrón Estándar

```typescript
import { requirePermission } from '../middleware/auth';

router.post(
  '/api/orders',
  requirePermission('orders', 'create'),
  (req: AuthRequest, res: Response) => {
    // Solo waiter + manager pueden ejecutar
  }
);
```

### Con Validación Zod

```typescript
import { validateParams, idParamSchema } from '../schemas';

router.patch(
  '/:id',
  requirePermission('orders', 'updateStatus'),
  validateParams(idParamSchema),
  (req: AuthRequest, res: Response) => {
    // Valida parámetros + permisos
  }
);
```

---

## Uso en Frontend

### En Componentes

```typescript
import { useCanAccess } from '../hooks/useCanAccess';

export function DeleteButton() {
  const canDelete = useCanAccess('orders', 'deleteItem');

  if (!canDelete) return null;

  return <button onClick={handleDelete}>Eliminar</button>;
}
```

### En Rutas Protegidas

```typescript
import { useAppStore } from '../store/useAppStore';

function ProtectedRoute() {
  const user = useAppStore(s => s.user);

  if (!user || user.role !== 'manager') {
    return <Redirect to="/unauthorized" />;
  }

  return <Dashboard />;
}
```

---

## Flujo de Autenticación

1. **Login** → `POST /api/auth/login`
   - No requiere autenticación
   - Devuelve `token` JWT

2. **Token Storage** → Frontend
   - Almacenado en localStorage
   - Enviado en header: `Authorization: Bearer {token}`

3. **Validación en Backend**
   - `authMiddleware` valida JWT
   - Carga `req.user` = `{ id, role, name }`
   - `requirePermission()` valida contra matriz

4. **Sincronización Frontend**
   - `useAppStore` mantiene `user` sincronizado
   - `useCanAccess()` consulta matriz antes de renderizar

---

## Agregar Nuevas Rutas con Permisos

### Paso 1: Definir Permiso en Matriz

```typescript
// backend/src/config/permissions.config.ts
export const PERMISSIONS: PermissionsMap = {
  // ... recursos existentes ...
  reports: {  // nuevo recurso
    generate: ['manager'],
    export: ['manager'],
  }
};
```

### Paso 2: Crear Ruta con Protección

```typescript
// backend/src/routes/reports.ts
router.post(
  '/',
  requirePermission('reports', 'generate'),
  (req: AuthRequest, res: Response) => {
    // Solo manager puede generar reportes
  }
);
```

### Paso 3: Sincronizar en Frontend

```typescript
// frontend/src/hooks/useCanAccess.ts
const PERMISSIONS: PermissionsMap = {
  // ... recursos existentes ...
  reports: {  // MISMO nombre y acciones
    generate: ['manager'],
    export: ['manager'],
  }
};
```

### Paso 4: Usar en Componentes

```typescript
const canGenerate = useCanAccess('reports', 'generate');
```

---

## Testing

### Tests Unitarios

```typescript
describe('Matriz de Permisos', () => {
  test('Manager puede generar reportes', () => {
    expect(canAccess('manager', 'reports', 'generate')).toBe(true);
  });

  test('Waiter NO puede generar reportes', () => {
    expect(canAccess('waiter', 'reports', 'generate')).toBe(false);
  });
});
```

### Tests de Integración HTTP

```typescript
test('POST /api/reports — manager solo', async () => {
  // Waiter intenta → 403
  const res1 = await request(app)
    .post('/api/reports')
    .set('Authorization', `Bearer ${waiterToken}`);
  expect(res1.status).toBe(403);

  // Manager intenta → 201
  const res2 = await request(app)
    .post('/api/reports')
    .set('Authorization', `Bearer ${managerToken}`);
  expect(res2.status).toBe(201);
});
```

---

## Seguridad

### ✅ Validaciones Implementadas

- JWT obligatorio en producción (validación en auth middleware)
- Matriz centralizada evita inconsistencias
- Frontend + Backend sincronizados
- Validación Zod en todas las rutas
- Tests de integración para cada permiso

### ⚠️ Consideraciones

- **No confiar en frontend:** Los permisos en frontend son solo para UX
  - Backend siempre valida independientemente
  - El atacante no puede bypasear `requirePermission()`

- **Mantener sincronización:** Cuando agregues permisos
  - Actualiza `permissions.config.ts` (backend)
  - Actualiza `useCanAccess.ts` (frontend)
  - Agrega tests para la nueva acción

---

## Changelog

### Sprint 5.1 - Unificación de Autenticación (Actual)

- ✅ Matriz centralizada en `permissions.config.ts`
- ✅ Hook `useCanAccess()` en frontend
- ✅ Middleware `requirePermission()` en backend
- ✅ Refactor: Todas las rutas usan patrón consistente
- ✅ Tests: 73+ tests de permisos + HTTP
- ✅ Documentación: Esta guía

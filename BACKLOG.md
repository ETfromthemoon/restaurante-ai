# Backlog — Restaurante AI

## Estado actual del sistema
- **Frontend web** (Vite + React + Tailwind): login, mapa de mesas, pedido, menú, cocina, dashboard gerente
- **Backend** (Express + TypeScript): auth JWT, orders, tables, menu, dashboard — almacenamiento **SQLite (better-sqlite3)**
- **Mobile** (Expo/React Native): pantallas equivalentes al frontend web (pendiente sincronizar)
- **IA**: SDK de Anthropic instalado, sin integrar aún

---

## ✅ Sprint 1 — Flujo core (completado)
- Creación lazy de pedido (mesa libre no cambia estado al entrar)
- Segunda ronda de platos tras entrega
- Fix botón "Enviar a Cocina" oculto hasta tener ítems

## ✅ Sprint 2 — Persistencia y gestión base (completado)
| # | Historia | Detalle |
|---|----------|---------|
| ✅ 2.1 | Persistencia con SQLite | `restaurante.db` persiste entre reinicios; seed automático |
| ✅ 2.2 | Dashboard gerente | `/gerente`: ventas del día, mesas activas, top platos, tiempo promedio |
| ✅ 2.3 | Gestión de menú | `/gerente/menu`: crear, editar, activar/desactivar platos |
| ✅ 2.4 | Editar cantidad de ítems | Controles −/n/+ en `OrderPage`; bajar a 0 confirma eliminación |
| ✅ 2.5 | Notas por ítem | Modal con nota opcional al agregar cada plato en `MenuSelectPage` |

---

## Sprint 3 — Tiempo real y experiencia de usuario
> Objetivo: eliminar el polling manual, mejorar UX operativa

| # | Historia | Detalle | Prioridad |
|---|----------|---------|-----------|
| 3.1 | WebSockets (Socket.io) | Reemplazar `setInterval` de 30s por push del servidor. Eventos: `order:updated`, `table:updated`, `kitchen:ready` | 🔴 Alta |
| 3.2 | Notificación cuando cocina termina | Badge/sonido en mapa de mesas cuando un pedido pasa a `ready` | 🔴 Alta |
| 3.3 | Múltiples rondas visualmente claras | Separar ítems por ronda en `OrderPage` (Ronda 1, Ronda 2…) | 🟡 Media |
| 3.4 | Búsqueda y filtro en menú | Buscador por nombre y filtro por categoría en `MenuSelectPage` | 🟡 Media |
| 3.5 | Historial de pedidos por mesa | Ver pedidos anteriores de la mesa en el mismo turno | 🟢 Baja |

---

## Sprint 4 — Inteligencia artificial
> Objetivo: aprovechar el SDK de Anthropic ya instalado

| # | Historia | Detalle | Prioridad |
|---|----------|---------|-----------|
| 4.1 | Sugerencias de maridaje | Al agregar un plato, Claude sugiere bebida o postre complementario | 🔴 Alta |
| 4.2 | Resumen de turno con IA | El gerente puede pedir un resumen narrativo del día ("¿cómo fue el turno?") | 🔴 Alta |
| 4.3 | Detección de demoras | Claude alerta si un pedido lleva más tiempo del promedio histórico en cocina | 🟡 Media |
| 4.4 | Recomendaciones de menú por hora | Sugerir platos según hora del día y patrones de venta | 🟡 Media |
| 4.5 | Notas de voz para pedidos | El mesero dicta el pedido por voz; Whisper + Claude lo transcriben a ítems | 🟢 Baja |

---

## Sprint 5 — Mobile y distribución
> Objetivo: la app mobile lista para usar en tablet/smartphone de sala

| # | Historia | Detalle | Prioridad |
|---|----------|---------|-----------|
| 5.1 | Paridad mobile con web | Sincronizar cambios de sprints 2-4 en la app Expo | 🔴 Alta |
| 5.2 | Modo offline básico | Guardar pedido localmente si no hay red; sincronizar al reconectar | 🟡 Media |
| 5.3 | PWA instalable | Configurar manifest e íconos reales para instalar en home screen | 🟡 Media |
| 5.4 | Impresión de comanda | Enviar ticket a impresora térmica (ESC/POS) al enviar a cocina | 🟢 Baja |

---

## Deuda técnica
| Item | Detalle |
|------|---------|
| Passwords en texto plano | Hashear con bcrypt |
| Sin validación de entrada | Agregar Zod en rutas del backend |
| Errores genéricos en frontend | Mejorar mensajes de error por tipo de fallo |
| Sin tests | Al menos tests de integración para rutas críticas de orders |
